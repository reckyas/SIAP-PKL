"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  IMPORT_COLUMNS,
  keahlianImportRowSchema,
  normalizeOptionalString,
  type ImportColumn,
} from "@/lib/validations/keahlian-import";

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

export async function importKeahlianAction(
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

  const sheet = wb.getWorksheet("Keahlian") ?? wb.worksheets[0];
  if (!sheet) {
    return { ok: false, error: "Sheet \"Keahlian\" tidak ditemukan." };
  }

  const headerRow = sheet.getRow(1);
  const colIndex = new Map<ImportColumn, number>();
  for (let i = 1; i <= sheet.columnCount; i++) {
    const v = headerRow.getCell(i).value;
    const s = v == null ? "" : String(v).trim();
    const match = IMPORT_COLUMNS.find((c) => c === s);
    if (match) colIndex.set(match, i);
  }
  // Nama wajib ada; Kategori opsional (boleh tidak ada kolomnya).
  if (!colIndex.has("Nama")) {
    return {
      ok: false,
      error: 'Header tidak lengkap — kolom "Nama" wajib ada.',
    };
  }

  type RawRow = Partial<Record<ImportColumn, unknown>>;
  const raw: { row: number; data: RawRow }[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const data: RawRow = {};
    let hasAny = false;
    for (const col of IMPORT_COLUMNS) {
      const idx = colIndex.get(col);
      if (!idx) continue;
      const cell = row.getCell(idx);
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
  if (raw.length > 1000) {
    return {
      ok: false,
      error: "Maksimal 1000 baris per import. Pecah file jadi beberapa batch.",
    };
  }

  const errors: ImportRowError[] = [];
  const prepared: {
    row: number;
    nama: string;
    kategori: string | null;
  }[] = [];

  // Dedup case-insensitive — Keahlian.nama unique, case matters di DB tapi
  // user biasa lupa case; kita standarisasi key bandingnya.
  const seenNama = new Map<string, number>();

  for (const { row, data } of raw) {
    const candidate = {
      nama: normalizeOptionalString(data.Nama) ?? "",
      kategori: normalizeOptionalString(data.Kategori),
    };

    const parsed = keahlianImportRowSchema.safeParse(candidate);
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

    const key = v.nama.toLowerCase();
    const prev = seenNama.get(key);
    if (prev) {
      errors.push({
        row,
        field: "nama",
        message: `Nama duplikat di baris ${prev}`,
      });
    } else {
      seenNama.set(key, row);
    }

    prepared.push({ row, nama: v.nama, kategori: v.kategori });
  }

  // Cek konflik DB — nama yang sudah ada (case-insensitive).
  const namaList = prepared.map((p) => p.nama);
  const existing =
    namaList.length > 0
      ? await prisma.keahlian.findMany({
          where: {
            OR: namaList.map((n) => ({
              nama: { equals: n, mode: "insensitive" as const },
            })),
          },
          select: { nama: true },
        })
      : [];
  const existingSet = new Set(existing.map((e) => e.nama.toLowerCase()));
  for (const p of prepared) {
    if (existingSet.has(p.nama.toLowerCase())) {
      errors.push({
        row: p.row,
        field: "nama",
        message: `Keahlian "${p.nama}" sudah ada di DB`,
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

  await prisma.keahlian.createMany({
    data: prepared.map((p) => ({ nama: p.nama, kategori: p.kategori })),
  });

  await logAudit({
    userId: session.user.id,
    action: "IMPORT_KEAHLIAN",
    entityType: "Keahlian",
    entityId: null,
    metadata: { jumlah: prepared.length },
  });

  revalidatePath("/admin/keahlian");
  return { ok: true, imported: prepared.length };
}
