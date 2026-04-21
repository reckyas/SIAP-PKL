/**
 * Seed master data — aman dijalankan di produksi.
 *
 * Berisi data statik yang dibutuhkan aplikasi untuk berjalan:
 *  - Akun Admin awal (dari env SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *  - Jurusan (TBD placeholder + jurusan SMK umum)
 *  - Kelas master (X/XI/XII tiap jurusan)
 *  - Keahlian master
 *  - Dokumen wajib PKL
 *  - Bidang minat
 *  - Bobot SAW default (global, aktif)
 *  - SystemConfig
 *
 * Semua pakai `upsert` → idempoten, aman dijalankan berkali-kali tanpa
 * menimpa data runtime (siswa, lowongan, pendaftaran, dll).
 *
 * Data dummy (siswa/DUDI/lowongan) ada di `seed-demo.ts`.
 */
import { PrismaClient, AccountStatus, Tingkat } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugifyBidang(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@siap-pkl.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Admin sudah ada: ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: "ADMIN",
      status: AccountStatus.VERIFIED,
      emailVerified: new Date(),
      admin: {
        create: { nama: "Administrator", jabatan: "Admin Sistem" },
      },
    },
  });
  console.log(`✓ Admin dibuat: ${email} / ${password}`);
}

async function seedJurusan() {
  const jurusans = [
    { kode: "TBD", nama: "Belum Ditentukan", deskripsi: "Placeholder untuk siswa yang belum melengkapi profil." },
    { kode: "TKJ", nama: "Teknik Komputer dan Jaringan" },
    { kode: "RPL", nama: "Rekayasa Perangkat Lunak" },
    { kode: "MM", nama: "Multimedia" },
    { kode: "AKL", nama: "Akuntansi dan Keuangan Lembaga" },
    { kode: "OTKP", nama: "Otomatisasi dan Tata Kelola Perkantoran" },
  ];
  for (const j of jurusans) {
    await prisma.jurusan.upsert({
      where: { kode: j.kode },
      update: { nama: j.nama, deskripsi: j.deskripsi ?? null },
      create: j,
    });
  }
  console.log(`✓ ${jurusans.length} jurusan di-seed`);
}

async function seedKelas() {
  // Kelas default: tiap jurusan (kecuali TBD) dapat X/XI/XII nomor 1.
  // Admin bisa tambah lebih lewat /admin/kelas.
  const jurusans = await prisma.jurusan.findMany({
    where: { kode: { not: "TBD" } },
    select: { id: true, kode: true },
  });
  const tingkats: Tingkat[] = ["X", "XI", "XII"];
  let count = 0;
  for (const j of jurusans) {
    for (const t of tingkats) {
      const nama = `${j.kode} 1`;
      await prisma.kelas.upsert({
        where: { jurusanId_tingkat_nama: { jurusanId: j.id, tingkat: t, nama } },
        update: {},
        create: { jurusanId: j.id, tingkat: t, nama },
      });
      count++;
    }
  }
  console.log(`✓ ${count} kelas di-seed`);
}

async function seedKeahlian() {
  const keahlians = [
    // Programming
    { nama: "HTML & CSS", kategori: "Web" },
    { nama: "JavaScript", kategori: "Web" },
    { nama: "React", kategori: "Web" },
    { nama: "Node.js", kategori: "Web" },
    { nama: "PHP", kategori: "Web" },
    { nama: "Laravel", kategori: "Web" },
    { nama: "Python", kategori: "Programming" },
    { nama: "Java", kategori: "Programming" },
    { nama: "Kotlin", kategori: "Mobile" },
    { nama: "Flutter", kategori: "Mobile" },
    // Jaringan
    { nama: "Mikrotik", kategori: "Jaringan" },
    { nama: "Cisco Networking", kategori: "Jaringan" },
    { nama: "Linux Server", kategori: "Jaringan" },
    { nama: "Troubleshooting Hardware", kategori: "Jaringan" },
    // Desain & Multimedia
    { nama: "Adobe Photoshop", kategori: "Desain" },
    { nama: "Adobe Illustrator", kategori: "Desain" },
    { nama: "CorelDRAW", kategori: "Desain" },
    { nama: "Figma", kategori: "Desain" },
    { nama: "Video Editing", kategori: "Multimedia" },
    { nama: "Fotografi", kategori: "Multimedia" },
    { nama: "Animasi 2D", kategori: "Multimedia" },
    // Perkantoran & Akuntansi
    { nama: "Microsoft Word", kategori: "Perkantoran" },
    { nama: "Microsoft Excel", kategori: "Perkantoran" },
    { nama: "Microsoft PowerPoint", kategori: "Perkantoran" },
    { nama: "Kearsipan", kategori: "Perkantoran" },
    { nama: "Akuntansi Dasar", kategori: "Akuntansi" },
    { nama: "MYOB", kategori: "Akuntansi" },
    { nama: "Accurate", kategori: "Akuntansi" },
    { nama: "Perpajakan", kategori: "Akuntansi" },
    // Soft skill
    { nama: "Bahasa Inggris", kategori: "Bahasa" },
    { nama: "Komunikasi", kategori: "Soft Skill" },
    { nama: "Public Speaking", kategori: "Soft Skill" },
  ];
  for (const k of keahlians) {
    await prisma.keahlian.upsert({
      where: { nama: k.nama },
      update: { kategori: k.kategori },
      create: k,
    });
  }
  console.log(`✓ ${keahlians.length} keahlian di-seed`);
}

async function seedDokumen() {
  const dokumens = [
    { nama: "KTP / Kartu Pelajar", deskripsi: "Identitas siswa — KTP bila sudah punya, atau Kartu Pelajar." },
    { nama: "Kartu Keluarga", deskripsi: "Kartu Keluarga untuk verifikasi data orang tua." },
    { nama: "CV", deskripsi: "Curriculum Vitae / daftar riwayat hidup siswa." },
    { nama: "Surat Izin Orang Tua", deskripsi: "Surat persetujuan orang tua/wali untuk mengikuti PKL." },
    { nama: "Transkrip Nilai", deskripsi: "Transkrip nilai semester terakhir." },
    { nama: "Sertifikat Keahlian", deskripsi: "Sertifikat pelatihan atau keahlian yang relevan (opsional)." },
    { nama: "Pas Foto", deskripsi: "Pas foto formal latar merah/biru." },
    { nama: "Surat Keterangan Sehat", deskripsi: "Surat keterangan sehat dari dokter/puskesmas." },
  ];
  for (const d of dokumens) {
    await prisma.dokumen.upsert({
      where: { nama: d.nama },
      update: { deskripsi: d.deskripsi },
      create: d,
    });
  }
  console.log(`✓ ${dokumens.length} dokumen di-seed`);
}

async function seedBidang() {
  const bidangs = [
    "Web Development",
    "Mobile Development",
    "Jaringan & Server",
    "Desain Grafis",
    "Videografi",
    "Fotografi",
    "Administrasi Perkantoran",
    "Akuntansi",
    "Perpajakan",
    "Marketing Digital",
    "Customer Service",
    "Retail",
  ];
  for (const nama of bidangs) {
    const slug = slugifyBidang(nama);
    await prisma.bidang.upsert({
      where: { slug },
      update: { nama },
      create: { nama, slug },
    });
  }
  console.log(`✓ ${bidangs.length} bidang di-seed`);
}

async function seedSAWWeight() {
  // Bobot default global (jurusanId = null, isActive = true).
  // Sesuai DEFAULT_WEIGHT di src/lib/saw.ts — keahlian primer.
  const existing = await prisma.sAWWeight.findFirst({
    where: { jurusanId: null, isActive: true },
  });
  if (existing) {
    console.log("• SAWWeight default sudah ada");
    return;
  }
  await prisma.sAWWeight.create({
    data: {
      nama: "Default Global",
      jurusanId: null,
      isActive: true,
      bobotKeahlian: 0.35,
      bobotJarak: 0.2,
      bobotBidang: 0.15,
      bobotDokumen: 0.1,
      bobotRating: 0.1,
      bobotKuota: 0.05,
      bobotFasilitas: 0.05,
    },
  });
  console.log("✓ SAWWeight default dibuat");
}

async function seedSystemConfig() {
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

async function main() {
  console.log("=== Seed master data ===");
  await seedAdmin();
  await seedJurusan();
  await seedKelas();
  await seedKeahlian();
  await seedDokumen();
  await seedBidang();
  await seedSAWWeight();
  await seedSystemConfig();
  console.log("=== Selesai ===");
}

main()
  .catch((e) => {
    console.error("Seed master gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
