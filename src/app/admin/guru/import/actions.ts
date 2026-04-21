"use server";

import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  IMPORT_COLUMNS,
  guruImportRowSchema,
  normalizeOptionalString,
  type ImportColumn,
} from "@/lib/validations/guru-import";

const DEFAULT_PASSWORD = "Password1234";

export interface ImportRowError {
  row: number;
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

export async function importGuruAction(
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

  const sheet = wb.getWorksheet("Guru") ?? wb.worksheets[0];
  if (!sheet) return { ok: false, error: "Sheet \"Guru\" tidak ditemukan." };

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

  type RawRow = Partial<Record<ImportColumn, unknown>>;
  const raw: { row: number; data: RawRow }[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const data: RawRow = {};
    let hasAny = false;
    for (const col of IMPORT_COLUMNS) {
      const cell = row.getCell(colIndex.get(col)!);
      let value: unknown = cell.value;
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

  const errors: ImportRowError[] = [];
  const prepared: {
    row: number;
    email: string;
    nama: string;
    nip: string | null;
    noHp: string;
    mataPelajaran: string | null;
  }[] = [];

  const seenEmail = new Map<string, number>();
  const seenNip = new Map<string, number>();

  for (const { row, data } of raw) {
    const candidate = {
      email: normalizeOptionalString(data.Email) ?? "",
      nama: normalizeOptionalString(data.Nama) ?? "",
      nip: normalizeOptionalString(data.NIP),
      noHp: normalizeOptionalString(data["No HP"]) ?? "",
      mataPelajaran: normalizeOptionalString(data["Mata Pelajaran"]),
    };

    const parsed = guruImportRowSchema.safeParse(candidate);
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
    if (v.nip) {
      const prevNip = seenNip.get(v.nip);
      if (prevNip) {
        errors.push({
          row,
          field: "nip",
          message: `NIP duplikat di baris ${prevNip}`,
        });
      } else {
        seenNip.set(v.nip, row);
      }
    }

    prepared.push({
      row,
      email: v.email,
      nama: v.nama,
      nip: v.nip,
      noHp: v.noHp,
      mataPelajaran: v.mataPelajaran,
    });
  }

  // Cek konflik DB (email + NIP yang sudah ada).
  const emails = prepared.map((p) => p.email);
  const nips = prepared.map((p) => p.nip).filter((n): n is string => !!n);
  const [usedEmails, usedNipGuru, usedNipAdmin] = await Promise.all([
    emails.length > 0
      ? prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        })
      : Promise.resolve([]),
    nips.length > 0
      ? prisma.guru.findMany({
          where: { nip: { in: nips } },
          select: { nip: true },
        })
      : Promise.resolve([]),
    nips.length > 0
      ? prisma.admin.findMany({
          where: { nip: { in: nips } },
          select: { nip: true },
        })
      : Promise.resolve([]),
  ]);
  const usedEmailSet = new Set(usedEmails.map((u) => u.email));
  const usedNipSet = new Set<string>([
    ...usedNipGuru.map((g) => g.nip).filter((n): n is string => !!n),
    ...usedNipAdmin.map((a) => a.nip).filter((n): n is string => !!n),
  ]);
  for (const p of prepared) {
    if (usedEmailSet.has(p.email)) {
      errors.push({
        row: p.row,
        field: "email",
        message: `Email "${p.email}" sudah terpakai di DB`,
      });
    }
    if (p.nip && usedNipSet.has(p.nip)) {
      errors.push({
        row: p.row,
        field: "nip",
        message: `NIP "${p.nip}" sudah terpakai di DB`,
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

  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await prisma.$transaction(
    async (tx) => {
      for (const p of prepared) {
        await tx.user.create({
          data: {
            email: p.email,
            password: hashed,
            role: "GURU_PEMBIMBING",
            status: "VERIFIED",
            mustChangePassword: true,
            guru: {
              create: {
                nama: p.nama,
                nip: p.nip,
                noHp: p.noHp,
                mataPelajaran: p.mataPelajaran,
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
    action: "IMPORT_GURU",
    entityType: "Guru",
    entityId: null,
    metadata: { jumlah: prepared.length },
  });

  revalidatePath("/admin/guru");
  return { ok: true, imported: prepared.length };
}
