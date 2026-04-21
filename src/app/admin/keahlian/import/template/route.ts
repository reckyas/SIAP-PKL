import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { IMPORT_COLUMNS } from "@/lib/validations/keahlian-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }

  const kategoriList = await prisma.keahlian.findMany({
    where: { kategori: { not: null } },
    distinct: ["kategori"],
    select: { kategori: true },
    orderBy: { kategori: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "SIAP PKL";
  wb.created = new Date();

  // Sheet Keahlian: header + contoh rows
  const sheet = wb.addWorksheet("Keahlian");
  sheet.columns = IMPORT_COLUMNS.map((h) => ({
    header: h,
    key: h,
    width: Math.max(20, h.length + 4),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };

  sheet.addRow({ Nama: "HTML & CSS", Kategori: "Pemrograman" });
  sheet.addRow({ Nama: "Jaringan Komputer", Kategori: "Jaringan" });
  sheet.addRow({ Nama: "Adobe Photoshop", Kategori: "Desain Grafis" });

  // Sheet Ref Kategori — kategori yang sudah pernah dipakai
  const sKat = wb.addWorksheet("Ref Kategori");
  sKat.columns = [{ header: "Kategori", key: "kategori", width: 40 }];
  sKat.getRow(1).font = { bold: true };
  for (const k of kategoriList) {
    if (k.kategori) sKat.addRow({ kategori: k.kategori });
  }

  // Sheet Petunjuk
  const sInfo = wb.addWorksheet("Petunjuk");
  sInfo.getColumn(1).width = 100;
  sInfo.addRows([
    ["Petunjuk Import Keahlian"],
    [""],
    ["1. Isi sheet \"Keahlian\" mulai baris ke-2 (baris 1 header, jangan diubah)."],
    ["2. Nama wajib diisi (2–120 karakter) dan harus unik."],
    ["3. Kategori opsional (boleh kosong, maksimal 60 karakter)."],
    ["4. Lihat sheet \"Ref Kategori\" untuk kategori yang sudah ada — gunakan ejaan yang konsisten."],
    ["5. Import gagalkan SEMUA kalau ada 1 baris error — perbaiki semua error dulu."],
    ["6. Maksimal 1000 baris per file, ukuran ≤ 5 MB."],
  ]);
  sInfo.getRow(1).font = { bold: true, size: 14 };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-import-keahlian.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
