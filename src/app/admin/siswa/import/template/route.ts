import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { IMPORT_COLUMNS } from "@/lib/validations/siswa-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }

  const [jurusan, kelas, guru] = await Promise.all([
    prisma.jurusan.findMany({
      select: { kode: true, nama: true },
      orderBy: { kode: "asc" },
    }),
    prisma.kelas.findMany({
      select: {
        nama: true,
        tingkat: true,
        jurusan: { select: { kode: true } },
      },
      orderBy: [{ jurusan: { kode: "asc" } }, { tingkat: "asc" }, { nama: "asc" }],
    }),
    prisma.guru.findMany({
      where: { user: { deletedAt: null } },
      select: { nama: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "SIAP PKL";
  wb.created = new Date();

  // Sheet Siswa: header + 1 contoh row
  const sheet = wb.addWorksheet("Siswa");
  sheet.columns = IMPORT_COLUMNS.map((h) => ({
    header: h,
    key: h,
    width: Math.max(14, h.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };

  const contohJurusan = jurusan[0]?.kode ?? "RPL";
  const contohKelas = kelas.find((k) => k.jurusan.kode === contohJurusan);
  sheet.addRow({
    Email: "siswa1@example.com",
    NIS: "2024001",
    Nama: "Budi Santoso",
    "Jenis Kelamin": "L",
    "Tanggal Lahir": "2008-05-12",
    Alamat: "Jl. Contoh No. 1, Badegan",
    "No HP": "081234567890",
    "Kode Jurusan": contohJurusan,
    Tingkat: contohKelas?.tingkat ?? "XI",
    "Nama Kelas": contohKelas?.nama ?? "RPL 1",
    "Nama Guru": guru[0]?.nama ?? "",
    Latitude: "",
    Longitude: "",
  });

  // Kolom tanggal lahir pakai format tanggal
  sheet.getColumn("Tanggal Lahir").numFmt = "yyyy-mm-dd";

  // Sheet referensi jurusan
  const sJur = wb.addWorksheet("Ref Jurusan");
  sJur.columns = [
    { header: "Kode", key: "kode", width: 12 },
    { header: "Nama", key: "nama", width: 40 },
  ];
  sJur.getRow(1).font = { bold: true };
  for (const j of jurusan) sJur.addRow(j);

  // Sheet referensi kelas
  const sKls = wb.addWorksheet("Ref Kelas");
  sKls.columns = [
    { header: "Kode Jurusan", key: "kodeJurusan", width: 14 },
    { header: "Tingkat", key: "tingkat", width: 10 },
    { header: "Nama Kelas", key: "nama", width: 18 },
  ];
  sKls.getRow(1).font = { bold: true };
  for (const k of kelas) {
    sKls.addRow({
      kodeJurusan: k.jurusan.kode,
      tingkat: k.tingkat,
      nama: k.nama,
    });
  }

  // Sheet referensi guru
  const sGuru = wb.addWorksheet("Ref Guru");
  sGuru.columns = [{ header: "Nama", key: "nama", width: 40 }];
  sGuru.getRow(1).font = { bold: true };
  for (const g of guru) sGuru.addRow(g);

  // Sheet petunjuk
  const sInfo = wb.addWorksheet("Petunjuk");
  sInfo.getColumn(1).width = 100;
  sInfo.addRows([
    ["Petunjuk Import Siswa"],
    [""],
    ["1. Isi sheet \"Siswa\" mulai baris ke-2 (baris 1 header, jangan diubah)."],
    ["2. Jenis Kelamin: L = Laki-laki, P = Perempuan."],
    ["3. Tanggal Lahir format YYYY-MM-DD atau DD/MM/YYYY."],
    ["4. Kode Jurusan, Tingkat, Nama Kelas — lihat sheet Ref Jurusan & Ref Kelas."],
    ["5. Nama Guru opsional — harus persis sesuai sheet Ref Guru bila diisi."],
    ["6. Latitude/Longitude opsional (boleh kosong)."],
    ["7. Password awal semua siswa = \"Password1234\" (wajib ganti saat login pertama)."],
    ["8. Import gagalkan SEMUA kalau ada 1 baris error — perbaiki semua error dulu."],
  ]);
  sInfo.getRow(1).font = { bold: true, size: 14 };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="template-import-siswa.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
