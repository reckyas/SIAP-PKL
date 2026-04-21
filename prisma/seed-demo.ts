/**
 * Seed data demo — HANYA untuk development/staging.
 *
 * ⚠️ JANGAN dijalankan di produksi: berisi akun dummy dengan password
 * yang sama untuk semua user (`Password1234`).
 *
 * Prasyarat: `seed-master.ts` harus sudah dijalankan dulu (butuh jurusan,
 * kelas, keahlian, dokumen, bidang).
 *
 * Isi:
 *  - 3 Guru pembimbing
 *  - 5 DUDI (sudah verified) + lowongan aktif
 *  - 15 Siswa (tersebar di semua jurusan non-TBD)
 *  - Beberapa pendaftaran di berbagai status untuk keperluan demo
 */
import {
  PrismaClient,
  AccountStatus,
  Gender,
  StatusLowongan,
  StatusPendaftaran,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password1234";

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

async function main() {
  console.log("=== Seed demo data ===");

  // Safety net: tolak kalau DATABASE_URL terlihat produksi.
  const url = process.env.DATABASE_URL ?? "";
  if (/prod|production/i.test(url)) {
    throw new Error("DATABASE_URL terdeteksi mengarah ke produksi — demo seed dibatalkan.");
  }

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Ambil master data yang dibutuhkan.
  const [jurusans, kelasAll, keahlians, dokumens, bidangs] = await Promise.all([
    prisma.jurusan.findMany({ where: { kode: { not: "TBD" } } }),
    prisma.kelas.findMany(),
    prisma.keahlian.findMany(),
    prisma.dokumen.findMany(),
    prisma.bidang.findMany(),
  ]);

  if (jurusans.length === 0) {
    throw new Error("Belum ada jurusan. Jalankan `npm run db:seed` (master) dulu.");
  }
  if (kelasAll.length === 0) {
    throw new Error("Belum ada kelas. Jalankan `npm run db:seed` (master) dulu.");
  }

  // ----- Guru -----
  const guruData = [
    { email: "guru1@demo.local", nama: "Siti Aminah, S.Kom", nip: "198503152010012001", noHp: "081234560001", mataPelajaran: "RPL" },
    { email: "guru2@demo.local", nama: "Budi Hartono, S.T.", nip: "198712102011011002", noHp: "081234560002", mataPelajaran: "TKJ" },
    { email: "guru3@demo.local", nama: "Rina Susanti, S.E.", nip: "198904052012012003", noHp: "081234560003", mataPelajaran: "AKL" },
  ];
  const guruRecords: { id: string; nama: string }[] = [];
  for (const g of guruData) {
    const user = await prisma.user.upsert({
      where: { email: g.email },
      update: {},
      create: {
        email: g.email,
        password: hashed,
        role: "GURU_PEMBIMBING",
        status: AccountStatus.VERIFIED,
        emailVerified: new Date(),
        guru: {
          create: {
            nama: g.nama,
            nip: g.nip,
            noHp: g.noHp,
            mataPelajaran: g.mataPelajaran,
          },
        },
      },
      include: { guru: true },
    });
    if (user.guru) guruRecords.push({ id: user.guru.id, nama: user.guru.nama });
  }
  console.log(`✓ ${guruRecords.length} guru`);

  // ----- DUDI -----
  const dudiData = [
    {
      email: "dudi1@demo.local",
      namaPerusahaan: "CV Digital Kreatif Nusantara",
      deskripsi: "Software house fokus ke web & mobile app untuk UMKM.",
      alamat: "Jl. Merdeka No. 10, Ponorogo",
      latitude: -7.8683,
      longitude: 111.4625,
      namaPIC: "Agus Wijaya",
      jabatanPIC: "Manager SDM",
      noHpPIC: "081234561001",
      emailPIC: "hr@digikrea.id",
      bidangUsaha: ["Web Development", "Mobile Development"],
    },
    {
      email: "dudi2@demo.local",
      namaPerusahaan: "PT Jaringan Nusantara",
      deskripsi: "ISP & integrator jaringan untuk perkantoran.",
      alamat: "Jl. Soekarno-Hatta No. 45, Madiun",
      latitude: -7.6298,
      longitude: 111.5239,
      namaPIC: "Dewi Lestari",
      jabatanPIC: "HRD",
      noHpPIC: "081234561002",
      emailPIC: "hr@jaringannusa.co.id",
      bidangUsaha: ["Jaringan & Server"],
    },
    {
      email: "dudi3@demo.local",
      namaPerusahaan: "Studio Pixel Muda",
      deskripsi: "Studio desain grafis, video, dan konten medsos.",
      alamat: "Jl. Diponegoro No. 8, Ponorogo",
      latitude: -7.8719,
      longitude: 111.4691,
      namaPIC: "Fajar Ramadhan",
      jabatanPIC: "Creative Director",
      noHpPIC: "081234561003",
      emailPIC: "halo@pixelmuda.id",
      bidangUsaha: ["Desain Grafis", "Videografi"],
    },
    {
      email: "dudi4@demo.local",
      namaPerusahaan: "KAP Santoso & Rekan",
      deskripsi: "Kantor Akuntan Publik, melayani UMKM & koperasi.",
      alamat: "Jl. Gatot Subroto No. 22, Madiun",
      latitude: -7.6312,
      longitude: 111.5301,
      namaPIC: "Laras Setyawati",
      jabatanPIC: "Partner",
      noHpPIC: "081234561004",
      emailPIC: "kap.santoso@gmail.com",
      bidangUsaha: ["Akuntansi", "Perpajakan"],
    },
    {
      email: "dudi5@demo.local",
      namaPerusahaan: "Toko Retail Makmur",
      deskripsi: "Retail fashion & perlengkapan rumah tangga.",
      alamat: "Jl. Trunojoyo No. 77, Ponorogo",
      latitude: -7.8745,
      longitude: 111.4600,
      namaPIC: "Hendra Pratama",
      jabatanPIC: "Store Manager",
      noHpPIC: "081234561005",
      emailPIC: "retailmakmur@gmail.com",
      bidangUsaha: ["Retail", "Administrasi Perkantoran"],
    },
  ];
  const dudiRecords: { id: string; nama: string; bidangUsaha: string[] }[] = [];
  for (const d of dudiData) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        password: hashed,
        role: "DUDI",
        status: AccountStatus.VERIFIED,
        emailVerified: new Date(),
        dudi: {
          create: {
            namaPerusahaan: d.namaPerusahaan,
            deskripsi: d.deskripsi,
            alamat: d.alamat,
            latitude: d.latitude,
            longitude: d.longitude,
            namaPIC: d.namaPIC,
            jabatanPIC: d.jabatanPIC,
            noHpPIC: d.noHpPIC,
            emailPIC: d.emailPIC,
            bidangUsaha: d.bidangUsaha,
          },
        },
      },
      include: { dudi: true },
    });
    if (user.dudi) {
      dudiRecords.push({
        id: user.dudi.id,
        nama: user.dudi.namaPerusahaan,
        bidangUsaha: user.dudi.bidangUsaha,
      });
    }
  }
  console.log(`✓ ${dudiRecords.length} DUDI`);

  // ----- Lowongan -----
  // Helper lookup jurusan & keahlian & dokumen & bidang by name/kode
  const jurusanByKode = new Map(jurusans.map((j) => [j.kode, j]));
  const keahlianByNama = new Map(keahlians.map((k) => [k.nama, k]));
  const dokumenByNama = new Map(dokumens.map((d) => [d.nama, d]));
  const bidangByNama = new Map(bidangs.map((b) => [b.nama.toLowerCase(), b]));

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 30);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 3);

  const lowonganSpecs: {
    dudiIndex: number;
    judul: string;
    deskripsi: string;
    kuotaLaki: number;
    kuotaPerempuan: number;
    jurusanKode: string[];
    bidangNama: string[];
    keahlianWajib: { nama: string; levelMinimum: number }[];
    dokumenWajib: string[];
    uangSaku: number;
    makanSiang: boolean;
    transport: boolean;
    jamKerja: string;
    hariKerja: string;
  }[] = [
    {
      dudiIndex: 0,
      judul: "Magang Frontend Developer (React)",
      deskripsi: "Bantu tim engineering bikin UI untuk app client. Mentor senior engineer.",
      kuotaLaki: 2, kuotaPerempuan: 2,
      jurusanKode: ["RPL", "TKJ"],
      bidangNama: ["Web Development"],
      keahlianWajib: [
        { nama: "HTML & CSS", levelMinimum: 3 },
        { nama: "JavaScript", levelMinimum: 3 },
        { nama: "React", levelMinimum: 2 },
      ],
      dokumenWajib: ["CV", "Surat Izin Orang Tua"],
      uangSaku: 500000, makanSiang: true, transport: true,
      jamKerja: "08.00 - 17.00", hariKerja: "Senin - Jumat",
    },
    {
      dudiIndex: 0,
      judul: "Magang Mobile Developer (Flutter)",
      deskripsi: "Kembangkan fitur app mobile untuk klien retail.",
      kuotaLaki: 2, kuotaPerempuan: 1,
      jurusanKode: ["RPL"],
      bidangNama: ["Mobile Development"],
      keahlianWajib: [{ nama: "Flutter", levelMinimum: 2 }],
      dokumenWajib: ["CV"],
      uangSaku: 500000, makanSiang: true, transport: false,
      jamKerja: "08.00 - 17.00", hariKerja: "Senin - Jumat",
    },
    {
      dudiIndex: 1,
      judul: "Magang Teknisi Jaringan",
      deskripsi: "Bantu setup & maintenance jaringan kantor client.",
      kuotaLaki: 3, kuotaPerempuan: 1,
      jurusanKode: ["TKJ"],
      bidangNama: ["Jaringan & Server"],
      keahlianWajib: [
        { nama: "Mikrotik", levelMinimum: 3 },
        { nama: "Linux Server", levelMinimum: 2 },
      ],
      dokumenWajib: ["CV", "Surat Keterangan Sehat"],
      uangSaku: 400000, makanSiang: false, transport: true,
      jamKerja: "07.30 - 16.30", hariKerja: "Senin - Sabtu",
    },
    {
      dudiIndex: 2,
      judul: "Magang Desain Grafis",
      deskripsi: "Bantu bikin konten visual untuk social media & klien UMKM.",
      kuotaLaki: 1, kuotaPerempuan: 2,
      jurusanKode: ["MM"],
      bidangNama: ["Desain Grafis"],
      keahlianWajib: [
        { nama: "Adobe Photoshop", levelMinimum: 3 },
        { nama: "Adobe Illustrator", levelMinimum: 2 },
      ],
      dokumenWajib: ["CV", "Sertifikat Keahlian"],
      uangSaku: 350000, makanSiang: true, transport: false,
      jamKerja: "09.00 - 17.00", hariKerja: "Senin - Jumat",
    },
    {
      dudiIndex: 2,
      judul: "Magang Videografer",
      deskripsi: "Produksi konten video pendek untuk campaign client.",
      kuotaLaki: 1, kuotaPerempuan: 1,
      jurusanKode: ["MM"],
      bidangNama: ["Videografi"],
      keahlianWajib: [
        { nama: "Video Editing", levelMinimum: 3 },
        { nama: "Fotografi", levelMinimum: 2 },
      ],
      dokumenWajib: ["CV"],
      uangSaku: 400000, makanSiang: true, transport: false,
      jamKerja: "09.00 - 17.00", hariKerja: "Senin - Jumat",
    },
    {
      dudiIndex: 3,
      judul: "Magang Staff Akuntansi",
      deskripsi: "Input transaksi, bantu penyusunan laporan keuangan klien.",
      kuotaLaki: 1, kuotaPerempuan: 3,
      jurusanKode: ["AKL"],
      bidangNama: ["Akuntansi"],
      keahlianWajib: [
        { nama: "Akuntansi Dasar", levelMinimum: 3 },
        { nama: "Microsoft Excel", levelMinimum: 3 },
      ],
      dokumenWajib: ["CV", "Transkrip Nilai"],
      uangSaku: 450000, makanSiang: false, transport: true,
      jamKerja: "08.00 - 16.00", hariKerja: "Senin - Jumat",
    },
    {
      dudiIndex: 3,
      judul: "Magang Staff Perpajakan",
      deskripsi: "Input SPT & input faktur pajak klien.",
      kuotaLaki: 1, kuotaPerempuan: 2,
      jurusanKode: ["AKL"],
      bidangNama: ["Perpajakan"],
      keahlianWajib: [
        { nama: "Perpajakan", levelMinimum: 2 },
        { nama: "Microsoft Excel", levelMinimum: 3 },
      ],
      dokumenWajib: ["CV", "Transkrip Nilai"],
      uangSaku: 450000, makanSiang: false, transport: true,
      jamKerja: "08.00 - 16.00", hariKerja: "Senin - Jumat",
    },
    {
      dudiIndex: 4,
      judul: "Magang Kasir & Admin Toko",
      deskripsi: "Rotasi kasir, admin stok, & input penjualan harian.",
      kuotaLaki: 2, kuotaPerempuan: 3,
      jurusanKode: ["OTKP", "AKL"],
      bidangNama: ["Retail", "Administrasi Perkantoran"],
      keahlianWajib: [
        { nama: "Microsoft Excel", levelMinimum: 2 },
        { nama: "Komunikasi", levelMinimum: 3 },
      ],
      dokumenWajib: ["CV", "Pas Foto"],
      uangSaku: 400000, makanSiang: true, transport: false,
      jamKerja: "09.00 - 18.00", hariKerja: "Senin - Sabtu",
    },
  ];

  const lowonganIds: string[] = [];
  for (const spec of lowonganSpecs) {
    const dudi = dudiRecords[spec.dudiIndex];
    if (!dudi) continue;

    // Cek apakah lowongan dengan judul sama + dudi sama sudah ada.
    const existing = await prisma.lowongan.findFirst({
      where: { dudiId: dudi.id, judul: spec.judul },
      select: { id: true },
    });
    if (existing) {
      lowonganIds.push(existing.id);
      continue;
    }

    const lowongan = await prisma.lowongan.create({
      data: {
        dudiId: dudi.id,
        judul: spec.judul,
        deskripsi: spec.deskripsi,
        kuotaLaki: spec.kuotaLaki,
        kuotaPerempuan: spec.kuotaPerempuan,
        kuotaTotal: spec.kuotaLaki + spec.kuotaPerempuan,
        tanggalMulai: startDate,
        tanggalSelesai: endDate,
        uangSaku: spec.uangSaku,
        makanSiang: spec.makanSiang,
        transport: spec.transport,
        jamKerja: spec.jamKerja,
        hariKerja: spec.hariKerja,
        status: StatusLowongan.OPEN,
        jurusanTarget: {
          create: spec.jurusanKode
            .map((k) => jurusanByKode.get(k))
            .filter((j): j is NonNullable<typeof j> => !!j)
            .map((j) => ({ jurusanId: j.id })),
        },
        bidang: {
          create: spec.bidangNama
            .map((n) => bidangByNama.get(n.toLowerCase()))
            .filter((b): b is NonNullable<typeof b> => !!b)
            .map((b) => ({ bidangId: b.id })),
        },
        keahlianDibutuhkan: {
          create: spec.keahlianWajib
            .map((k) => {
              const hit = keahlianByNama.get(k.nama);
              return hit ? { keahlianId: hit.id, levelMinimum: k.levelMinimum } : null;
            })
            .filter((x): x is NonNullable<typeof x> => !!x),
        },
        dokumenDibutuhkan: {
          create: spec.dokumenWajib
            .map((n) => {
              const hit = dokumenByNama.get(n);
              return hit ? { dokumenId: hit.id, wajib: true } : null;
            })
            .filter((x): x is NonNullable<typeof x> => !!x),
        },
      },
    });
    lowonganIds.push(lowongan.id);
  }
  console.log(`✓ ${lowonganIds.length} lowongan`);

  // ----- Siswa -----
  // Tersebar merata antar jurusan non-TBD.
  const siswaNames = [
    { nama: "Ahmad Yusuf", jk: Gender.LAKI_LAKI },
    { nama: "Bayu Saputra", jk: Gender.LAKI_LAKI },
    { nama: "Citra Dewi", jk: Gender.PEREMPUAN },
    { nama: "Dimas Pratama", jk: Gender.LAKI_LAKI },
    { nama: "Elsa Putri", jk: Gender.PEREMPUAN },
    { nama: "Farhan Alam", jk: Gender.LAKI_LAKI },
    { nama: "Gita Maharani", jk: Gender.PEREMPUAN },
    { nama: "Hadi Kurniawan", jk: Gender.LAKI_LAKI },
    { nama: "Indah Sari", jk: Gender.PEREMPUAN },
    { nama: "Joko Wiyono", jk: Gender.LAKI_LAKI },
    { nama: "Kirana Laras", jk: Gender.PEREMPUAN },
    { nama: "Lutfi Ardiansyah", jk: Gender.LAKI_LAKI },
    { nama: "Mira Handayani", jk: Gender.PEREMPUAN },
    { nama: "Nanda Putra", jk: Gender.LAKI_LAKI },
    { nama: "Oktaviani Rizki", jk: Gender.PEREMPUAN },
  ];

  // Kelas XI per jurusan untuk semua siswa demo.
  const kelasXIByJurusan = new Map<string, (typeof kelasAll)[number]>();
  for (const k of kelasAll) {
    if (k.tingkat === "XI" && !kelasXIByJurusan.has(k.jurusanId)) {
      kelasXIByJurusan.set(k.jurusanId, k);
    }
  }

  const siswaRecords: { id: string; nama: string; jurusanId: string; jk: Gender }[] = [];
  for (let i = 0; i < siswaNames.length; i++) {
    const person = siswaNames[i]!;
    const jurusan = pick(jurusans, i);
    const kelas = kelasXIByJurusan.get(jurusan.id) ?? null;
    const guru = pick(guruRecords, i);
    const email = `siswa${i + 1}@demo.local`;
    const nis = `2024${String(i + 1).padStart(4, "0")}`;

    const existing = await prisma.user.findUnique({
      where: { email },
      include: { siswa: true },
    });
    if (existing?.siswa) {
      siswaRecords.push({
        id: existing.siswa.id,
        nama: existing.siswa.nama,
        jurusanId: existing.siswa.jurusanId,
        jk: existing.siswa.jenisKelamin,
      });
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: "SISWA",
        status: AccountStatus.VERIFIED,
        emailVerified: new Date(),
        siswa: {
          create: {
            nis,
            nama: person.nama,
            jenisKelamin: person.jk,
            tanggalLahir: new Date(2008, i % 12, ((i * 3) % 27) + 1),
            alamat: `Desa Contoh ${i + 1}, Badegan, Ponorogo`,
            latitude: -7.9124 + (i % 5) * 0.01,
            longitude: 111.3956 + (i % 5) * 0.01,
            noHp: `08123450${String(i + 1).padStart(4, "0")}`,
            kelasId: kelas?.id ?? null,
            jurusanId: jurusan.id,
            guruId: guru?.id ?? null,
            jarakMaksimal: 50,
          },
        },
      },
      include: { siswa: true },
    });
    if (user.siswa) {
      siswaRecords.push({
        id: user.siswa.id,
        nama: user.siswa.nama,
        jurusanId: user.siswa.jurusanId,
        jk: user.siswa.jenisKelamin,
      });
    }
  }
  console.log(`✓ ${siswaRecords.length} siswa`);

  // ----- Pendaftaran demo -----
  // Skip bila sudah ada pendaftaran → idempoten.
  const existingPendaftaran = await prisma.pendaftaran.count();
  if (existingPendaftaran > 0) {
    console.log(`• Sudah ada ${existingPendaftaran} pendaftaran, skip seeding pendaftaran`);
  } else if (lowonganIds.length > 0 && siswaRecords.length > 0) {
    const statusCycle: StatusPendaftaran[] = [
      StatusPendaftaran.PENDING,
      StatusPendaftaran.DISETUJUI_GURU,
      StatusPendaftaran.DILIHAT_DUDI,
      StatusPendaftaran.DITERIMA,
      StatusPendaftaran.DITOLAK_GURU,
      StatusPendaftaran.DITOLAK_DUDI,
    ];
    let created = 0;
    for (let i = 0; i < Math.min(siswaRecords.length, 10); i++) {
      const siswa = siswaRecords[i]!;
      const lowonganId = pick(lowonganIds, i);
      const status = pick(statusCycle, i);
      await prisma.pendaftaran.create({
        data: {
          siswaId: siswa.id,
          lowonganId,
          status,
          motivasi: "Saya tertarik karena sesuai dengan minat dan keahlian saya.",
          timeline: {
            create: [
              {
                status: StatusPendaftaran.PENDING,
                aktorRole: Role.SISWA,
                aktorId: siswa.id,
                catatan: "Pendaftaran awal siswa.",
              },
            ],
          },
        },
      });
      created++;
    }
    console.log(`✓ ${created} pendaftaran demo`);
  }

  console.log("=== Selesai ===");
  console.log(`\nSemua user demo login dengan password: ${DEMO_PASSWORD}`);
  console.log("Contoh akun:");
  console.log("  guru1@demo.local, siswa1@demo.local, dudi1@demo.local");
}

main()
  .catch((e) => {
    console.error("Seed demo gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
