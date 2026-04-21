"use server";

import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  IMPORT_COLUMNS,
  normalizeJenisKelamin,
  normalizeNumber,
  normalizeOptionalString,
  normalizeTanggal,
  siswaImportRowSchema,
  type ImportColumn,
} from "@/lib/validations/siswa-import";

// Password seragam untuk semua siswa hasil import.
const DEFAULT_PASSWORD = "Password1234";

export interface ImportRowError {
  row: number; // nomor baris Excel (header = 1, data mulai 2)
  field?: string;
  message: string;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  rowErrors?: ImportRowError[];
  imported?: number;
}

async function requireAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s;
}

export async function importSiswaAction(
  formData: FormData,
): Promise<ImportResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "File tidak ditemukan." };
  }
  if (file.size === 0) return { ok: false, error: "File kosong." };
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Ukuran file maksimal 5 MB." };
  }

  let wb: ExcelJS.Workbook;
  try {
    const buf = await file.arrayBuffer();
    wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as ArrayBuffer);
  } catch {
    return { ok: false, error: "File tidak bisa dibaca (XLSX rusak)." };
  }

  const sheet = wb.getWorksheet("Siswa") ?? wb.worksheets[0];
  if (!sheet) return { ok: false, error: "Sheet \"Siswa\" tidak ditemukan." };

  // Map header → index kolom (1-based) biar tahan urutan kolom diacak admin.
  const headerRow = sheet.getRow(1);
  const colIndex = new Map<ImportColumn, number>();
  for (let i = 1; i <= sheet.columnCount; i++) {
    const v = headerRow.getCell(i).value;
    const s = v == null ? "" : String(v).trim();
    const match = IMPORT_COLUMNS.find((c) => c === s);
    if (match) colIndex.set(match, i);
  }
  const missing = IMPORT_COLUMNS.filter((c) => !colIndex.has(c));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Header tidak lengkap — kolom hilang: ${missing.join(", ")}`,
    };
  }

  // Ambil seluruh baris data (skip header).
  type RawRow = Partial<Record<ImportColumn, unknown>>;
  const raw: { row: number; data: RawRow }[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const data: RawRow = {};
    let hasAny = false;
    for (const col of IMPORT_COLUMNS) {
      const cell = row.getCell(colIndex.get(col)!);
      let value: unknown = cell.value;
      // Handle rich-text / hyperlink objects
      if (value && typeof value === "object" && !(value instanceof Date)) {
        const obj = value as { text?: string; result?: unknown };
        if (typeof obj.text === "string") value = obj.text;
        else if (obj.result !== undefined) value = obj.result;
      }
      if (value != null && String(value).trim() !== "") hasAny = true;
      data[col] = value;
    }
    if (hasAny) raw.push({ row: r, data });
  }

  if (raw.length === 0) {
    return { ok: false, error: "Tidak ada baris data yang terisi." };
  }
  if (raw.length > 500) {
    return {
      ok: false,
      error: "Maksimal 500 baris per import. Pecah file jadi beberapa batch.",
    };
  }

  // Pre-fetch master data untuk lookup.
  const [jurusanList, kelasList, guruList] = await Promise.all([
    prisma.jurusan.findMany({ select: { id: true, kode: true } }),
    prisma.kelas.findMany({
      select: { id: true, nama: true, tingkat: true, jurusanId: true },
    }),
    prisma.guru.findMany({
      where: { user: { deletedAt: null } },
      select: { id: true, nama: true },
    }),
  ]);
  const jurusanByKode = new Map(
    jurusanList.map((j) => [j.kode.toLowerCase(), j]),
  );
  const kelasKey = (jurusanId: string, tingkat: string, nama: string) =>
    `${jurusanId}|${tingkat}|${nama.toLowerCase()}`;
  const kelasByKey = new Map(
    kelasList.map((k) => [kelasKey(k.jurusanId, k.tingkat, k.nama), k]),
  );
  const guruByNama = new Map<string, { id: string; count: number }>();
  for (const g of guruList) {
    const key = g.nama.toLowerCase();
    const existing = guruByNama.get(key);
    guruByNama.set(
      key,
      existing
        ? { id: existing.id, count: existing.count + 1 }
        : { id: g.id, count: 1 },
    );
  }

  // Validasi per-baris. Kumpulkan semua error, baru return.
  const errors: ImportRowError[] = [];
  const prepared: {
    row: number;
    email: string;
    nis: string;
    nama: string;
    jenisKelamin: "LAKI_LAKI" | "PEREMPUAN";
    tanggalLahir: Date;
    alamat: string;
    noHp: string;
    jurusanId: string;
    kelasId: string;
    guruId: string | null;
    latitude: number | null;
    longitude: number | null;
  }[] = [];

  const seenEmail = new Map<string, number>(); // email → row number
  const seenNis = new Map<string, number>();

  for (const { row, data } of raw) {
    const candidate = {
      email: normalizeOptionalString(data.Email) ?? "",
      nis: normalizeOptionalString(data.NIS) ?? "",
      nama: normalizeOptionalString(data.Nama) ?? "",
      jenisKelamin: normalizeJenisKelamin(data["Jenis Kelamin"]),
      tanggalLahir: normalizeTanggal(data["Tanggal Lahir"]),
      alamat: normalizeOptionalString(data.Alamat) ?? "",
      noHp: normalizeOptionalString(data["No HP"]) ?? "",
      kodeJurusan: normalizeOptionalString(data["Kode Jurusan"]) ?? "",
      tingkat: normalizeOptionalString(data.Tingkat)?.toUpperCase(),
      namaKelas: normalizeOptionalString(data["Nama Kelas"]) ?? "",
      namaGuru: normalizeOptionalString(data["Nama Guru"]),
      latitude: normalizeNumber(data.Latitude),
      longitude: normalizeNumber(data.Longitude),
    };

    const parsed = siswaImportRowSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row,
          field: String(issue.path[0] ?? ""),
          message: issue.message,
        });
      }
      continue;
    }
    const v = parsed.data;

    // Duplikat dalam file itu sendiri
    const prevEmail = seenEmail.get(v.email);
    if (prevEmail) {
      errors.push({
        row,
        field: "email",
        message: `Email duplikat di baris ${prevEmail}`,
      });
    } else {
      seenEmail.set(v.email, row);
    }
    const prevNis = seenNis.get(v.nis);
    if (prevNis) {
      errors.push({
        row,
        field: "nis",
        message: `NIS duplikat di baris ${prevNis}`,
      });
    } else {
      seenNis.set(v.nis, row);
    }

    // Lookup jurusan
    const jurusan = jurusanByKode.get(v.kodeJurusan.toLowerCase());
    if (!jurusan) {
      errors.push({
        row,
        field: "kodeJurusan",
        message: `Kode jurusan "${v.kodeJurusan}" tidak ditemukan`,
      });
      continue;
    }

    // Lookup kelas berdasarkan jurusan + tingkat + nama
    const kelas = kelasByKey.get(
      kelasKey(jurusan.id, v.tingkat, v.namaKelas),
    );
    if (!kelas) {
      errors.push({
        row,
        field: "namaKelas",
        message: `Kelas "${v.tingkat} ${v.namaKelas}" pada jurusan ${jurusan.kode} tidak ditemukan`,
      });
      continue;
    }

    // Lookup guru (opsional)
    let guruId: string | null = null;
    if (v.namaGuru) {
      const hit = guruByNama.get(v.namaGuru.toLowerCase());
      if (!hit) {
        errors.push({
          row,
          field: "namaGuru",
          message: `Guru "${v.namaGuru}" tidak ditemukan`,
        });
        continue;
      }
      if (hit.count > 1) {
        errors.push({
          row,
          field: "namaGuru",
          message: `Nama guru "${v.namaGuru}" ambigu (>1 match) — import manual`,
        });
        continue;
      }
      guruId = hit.id;
    }

    prepared.push({
      row,
      email: v.email,
      nis: v.nis,
      nama: v.nama,
      jenisKelamin: v.jenisKelamin,
      tanggalLahir: v.tanggalLahir,
      alamat: v.alamat,
      noHp: v.noHp,
      jurusanId: jurusan.id,
      kelasId: kelas.id,
      guruId,
      latitude: v.latitude,
      longitude: v.longitude,
    });
  }

  // Cek konflik dengan DB (email + NIS yang sudah ada)
  const emails = prepared.map((p) => p.email);
  const nises = prepared.map((p) => p.nis);
  const [usedEmails, usedNis] = await Promise.all([
    emails.length > 0
      ? prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        })
      : Promise.resolve([]),
    nises.length > 0
      ? prisma.siswa.findMany({
          where: { nis: { in: nises } },
          select: { nis: true },
        })
      : Promise.resolve([]),
  ]);
  const usedEmailSet = new Set(usedEmails.map((u) => u.email));
  const usedNisSet = new Set(usedNis.map((s) => s.nis));
  for (const p of prepared) {
    if (usedEmailSet.has(p.email)) {
      errors.push({
        row: p.row,
        field: "email",
        message: `Email "${p.email}" sudah terpakai di DB`,
      });
    }
    if (usedNisSet.has(p.nis)) {
      errors.push({
        row: p.row,
        field: "nis",
        message: `NIS "${p.nis}" sudah terpakai di DB`,
      });
    }
  }

  if (errors.length > 0) {
    errors.sort((a, b) => a.row - b.row);
    return {
      ok: false,
      error: `Ada ${errors.length} error — import dibatalkan.`,
      rowErrors: errors,
    };
  }

  // Semua valid → eksekusi dalam transaksi.
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await prisma.$transaction(
    async (tx) => {
      for (const p of prepared) {
        await tx.user.create({
          data: {
            email: p.email,
            password: hashed,
            role: "SISWA",
            status: "VERIFIED",
            mustChangePassword: true,
            siswa: {
              create: {
                nis: p.nis,
                nama: p.nama,
                jenisKelamin: p.jenisKelamin,
                tanggalLahir: p.tanggalLahir,
                alamat: p.alamat,
                latitude: p.latitude,
                longitude: p.longitude,
                noHp: p.noHp,
                kelasId: p.kelasId,
                jurusanId: p.jurusanId,
                guruId: p.guruId,
              },
            },
          },
        });
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  await logAudit({
    userId: session.user.id,
    action: "IMPORT_SISWA",
    entityType: "Siswa",
    entityId: null,
    metadata: { jumlah: prepared.length },
  });

  revalidatePath("/admin/siswa");
  return { ok: true, imported: prepared.length };
}
