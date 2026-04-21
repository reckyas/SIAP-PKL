import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { auth } from "@/auth";
import { IMPORT_COLUMNS } from "@/lib/validations/guru-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "SIAP PKL";
  wb.created = new Date();

  // Sheet Guru: header + 1 contoh row
  const sheet = wb.addWorksheet("Guru");
  sheet.columns = IMPORT_COLUMNS.map((h) => ({
    header: h,
    key: h,
    width: Math.max(16, h.length + 4),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };

  sheet.addRow({
    Email: "guru1@example.com",
    Nama: "Siti Aminah",
    NIP: "198505122010012001",
    "No HP": "081234567890",
    "Mata Pelajaran": "Pemrograman Dasar",
  });

  // Sheet petunjuk
  const sInfo = wb.addWorksheet("Petunjuk");
  sInfo.getColumn(1).width = 100;
  sInfo.addRows([
    ["Petunjuk Import Guru Pembimbing"],
    [""],
    ["1. Isi sheet \"Guru\" mulai baris ke-2 (baris 1 header, jangan diubah)."],
    ["2. Email wajib unik (belum dipakai user lain)."],
    ["3. NIP opsional — boleh kosong, tapi kalau diisi harus unik (tidak boleh bentrok dengan NIP admin/guru lain)."],
    ["4. No HP wajib diisi (min 8 karakter)."],
    ["5. Mata Pelajaran opsional (boleh kosong)."],
    ["6. Password awal semua guru = \"Password1234\" (wajib ganti saat login pertama)."],
    ["7. Import gagalkan SEMUA kalau ada 1 baris error — perbaiki semua error dulu."],
    ["8. Maksimal 500 baris per file, ukuran ≤ 5 MB."],
  ]);
  sInfo.getRow(1).font = { bold: true, size: 14 };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-import-guru.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
