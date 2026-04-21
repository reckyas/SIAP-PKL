/**
 * Seed minimal untuk milestone 1.
 *
 * Tujuan:
 *  1. Bikin akun Admin pertama (pakai env SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
 *  2. Bikin jurusan placeholder "TBD" supaya endpoint /api/register siswa
 *     punya FK valid sebelum user lengkapi profil.
 *  3. Bikin beberapa jurusan umum SMK (TKJ, RPL, MM) sebagai starter.
 *
 * Seed lengkap (keahlian, dokumen, dummy siswa/DUDI/lowongan) dibuat
 * di milestone 7.
 */
import { PrismaClient, AccountStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ----- 1. Admin default -----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@siap-pkl.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        role: "ADMIN",
        status: AccountStatus.VERIFIED,
        emailVerified: new Date(),
        admin: {
          create: {
            nama: "Administrator",
            jabatan: "Admin Sistem",
          },
        },
      },
    });
    console.log(`✓ Admin dibuat: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`• Admin sudah ada: ${adminEmail}`);
  }

  // ----- 2. Jurusan -----
  const jurusans = [
    { kode: "TBD", nama: "Belum Ditentukan", deskripsi: "Placeholder sementara bagi siswa baru yang belum melengkapi profil." },
    { kode: "TKJ", nama: "Teknik Komputer dan Jaringan" },
    { kode: "RPL", nama: "Rekayasa Perangkat Lunak" },
    { kode: "MM", nama: "Multimedia" },
    { kode: "AKL", nama: "Akuntansi dan Keuangan Lembaga" },
    { kode: "OTKP", nama: "Otomatisasi dan Tata Kelola Perkantoran" },
  ];
  for (const j of jurusans) {
    await prisma.jurusan.upsert({
      where: { kode: j.kode },
      update: {},
      create: j,
    });
  }
  console.log(`✓ ${jurusans.length} jurusan di-seed`);

  // ----- 3. SystemConfig default -----
  const configs = [
    {
      key: "SEKOLAH_LATITUDE",
      value: process.env.NEXT_PUBLIC_SEKOLAH_LATITUDE ?? "-7.9124",
      deskripsi: "Latitude SMKN 1 Badegan (untuk kalkulasi jarak SAW).",
    },
    {
      key: "SEKOLAH_LONGITUDE",
      value: process.env.NEXT_PUBLIC_SEKOLAH_LONGITUDE ?? "111.3956",
      deskripsi: "Longitude SMKN 1 Badegan.",
    },
    {
      key: "MAX_PENDAFTARAN_PER_SISWA",
      value: "3",
      deskripsi: "Maksimal jumlah lowongan yang boleh didaftar siswa dalam waktu bersamaan.",
    },
    {
      key: "TOP_N_REKOMENDASI",
      value: "10",
      deskripsi: "Jumlah rekomendasi teratas yang ditampilkan ke siswa.",
    },
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({
      where: { key: c.key },
      update: {},
      create: c,
    });
  }
  console.log(`✓ ${configs.length} SystemConfig di-seed`);
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
