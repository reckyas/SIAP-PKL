"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { transitionPendaftaran } from "@/lib/pendaftaran";
import {
  computeSAW,
  pickWeight,
  type SAWLowonganInput,
  type SAWSiswaInput,
  type SAWWeightRecord,
} from "@/lib/saw";
import {
  daftarLowonganSchema,
  type DaftarLowonganInput,
} from "@/lib/validations/pendaftaran";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: { id: string };
}

function zodFieldErrors(err: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

async function requireSiswa() {
  const s = await auth();
  if (!s?.user || s.user.role !== "SISWA") return null;
  const siswa = await prisma.siswa.findUnique({
    where: { userId: s.user.id },
    select: {
      id: true,
      jurusanId: true,
      statusPKL: true,
      jenisKelamin: true,
      nama: true,
      guruId: true,
      guru: { select: { userId: true } },
      latitude: true,
      longitude: true,
      jarakMaksimal: true,
      bidangMinat: { select: { bidangId: true } },
      keahlian: { select: { keahlianId: true, level: true } },
      dokumen: { select: { dokumenId: true, fileUrl: true } },
    },
  });
  if (!siswa) return null;
  return { session: s, siswa };
}

export async function daftarLowonganAction(
  input: DaftarLowonganInput,
): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  const parsed = daftarLowonganSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  if (ctx.siswa.statusPKL === "DITERIMA" || ctx.siswa.statusPKL === "SEDANG_PKL") {
    return {
      ok: false,
      error: "Anda sudah diterima di lowongan lain. Tidak bisa daftar lagi.",
    };
  }

  const lowongan = await prisma.lowongan.findUnique({
    where: { id: d.lowonganId },
    select: {
      id: true,
      status: true,
      bidang: { select: { bidangId: true } },
      kuotaTotal: true,
      terisiLaki: true,
      terisiPerempuan: true,
      uangSaku: true,
      makanSiang: true,
      transport: true,
      dudi: {
        select: {
          userId: true,
          namaPerusahaan: true,
          latitude: true,
          longitude: true,
          ratingRataRata: true,
        },
      },
      keahlianDibutuhkan: {
        select: { keahlianId: true, levelMinimum: true },
      },
      dokumenDibutuhkan: { select: { dokumenId: true, wajib: true } },
      jurusanTarget: { select: { jurusanId: true } },
    },
  });
  if (!lowongan) return { ok: false, error: "Lowongan tidak ditemukan." };
  if (lowongan.status !== "OPEN") {
    return { ok: false, error: "Lowongan tidak sedang membuka pendaftaran." };
  }
  const jurusanIds = lowongan.jurusanTarget.map((j) => j.jurusanId);
  if (!jurusanIds.includes(ctx.siswa.jurusanId)) {
    return {
      ok: false,
      error: "Lowongan ini tidak menerima jurusan Anda.",
    };
  }

  const existing = await prisma.pendaftaran.findUnique({
    where: {
      siswaId_lowonganId: {
        siswaId: ctx.siswa.id,
        lowonganId: lowongan.id,
      },
    },
    select: { id: true, status: true },
  });
  if (existing) {
    const aktif =
      existing.status === "PENDING" ||
      existing.status === "DISETUJUI_GURU" ||
      existing.status === "DILIHAT_DUDI";
    if (aktif) {
      return {
        ok: false,
        error: "Anda sudah terdaftar di lowongan ini.",
      };
    }
    return {
      ok: false,
      error:
        "Anda pernah mendaftar di lowongan ini. Hubungi admin jika ingin daftar ulang.",
    };
  }

  // Hitung snapshot skor SAW untuk lowongan ini.
  const weights = await prisma.sAWWeight.findMany({
    select: {
      id: true,
      jurusanId: true,
      isActive: true,
      bobotBidang: true,
      bobotJarak: true,
      bobotKuota: true,
      bobotKeahlian: true,
      bobotDokumen: true,
      bobotFasilitas: true,
      bobotRating: true,
    },
  });
  const weight = pickWeight(
    weights as SAWWeightRecord[],
    ctx.siswa.jurusanId,
  );

  const siswaInput: SAWSiswaInput = {
    jurusanId: ctx.siswa.jurusanId,
    latitude: ctx.siswa.latitude,
    longitude: ctx.siswa.longitude,
    jarakMaksimal: ctx.siswa.jarakMaksimal,
    bidangMinat: ctx.siswa.bidangMinat.map((b) => b.bidangId),
    keahlian: ctx.siswa.keahlian,
    dokumen: ctx.siswa.dokumen,
  };
  const lowonganInput: SAWLowonganInput[] = [
    {
      id: lowongan.id,
      bidang: lowongan.bidang.map((b) => b.bidangId),
      jurusanIds,
      latitude: lowongan.dudi.latitude,
      longitude: lowongan.dudi.longitude,
      kuotaTotal: lowongan.kuotaTotal,
      terisiLaki: lowongan.terisiLaki,
      terisiPerempuan: lowongan.terisiPerempuan,
      keahlianDibutuhkan: lowongan.keahlianDibutuhkan,
      dokumenDibutuhkan: lowongan.dokumenDibutuhkan,
      uangSaku: lowongan.uangSaku,
      makanSiang: lowongan.makanSiang,
      transport: lowongan.transport,
      dudiRating: lowongan.dudi.ratingRataRata,
    },
  ];
  const [scored] = computeSAW(siswaInput, lowonganInput, weight);
  const skor = scored ? scored.score : null;

  const motivasi = d.motivasi?.trim() || null;

  const created = await prisma.$transaction(async (tx) => {
    const p = await tx.pendaftaran.create({
      data: {
        siswaId: ctx.siswa.id,
        lowonganId: lowongan.id,
        status: "PENDING",
        skorSAW: skor,
        motivasi,
        ...(ctx.siswa.guruId ? { guruApprovalId: ctx.siswa.guruId } : {}),
      },
      select: { id: true },
    });
    await tx.pendaftaranTimeline.create({
      data: {
        pendaftaranId: p.id,
        status: "PENDING",
        catatan: motivasi,
        aktorRole: "SISWA",
        aktorId: ctx.siswa.id,
      },
    });
    return p;
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "DAFTAR_LOWONGAN",
    entityType: "Pendaftaran",
    entityId: created.id,
    metadata: { lowonganId: lowongan.id, skor },
  });

  // Notifikasi ke guru pembimbing (kalau ada) untuk approval.
  if (ctx.siswa.guru?.userId) {
    await notify({
      userId: ctx.siswa.guru.userId,
      type: "APPROVAL_DIBUTUHKAN",
      judul: "Permintaan persetujuan PKL",
      pesan: `${ctx.siswa.nama} mendaftar ke ${lowongan.dudi.namaPerusahaan}.`,
      linkUrl: `/guru/pendaftaran`,
      metadata: { pendaftaranId: created.id },
    });
  }

  revalidatePath("/siswa/pendaftaran");
  revalidatePath(`/siswa/lowongan/${lowongan.id}`);
  return { ok: true, data: { id: created.id } };
}

export async function batalkanPendaftaranAction(
  pendaftaranId: string,
): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.pendaftaran.findUnique({
    where: { id: pendaftaranId },
    select: {
      siswaId: true,
      status: true,
      lowonganId: true,
      lowongan: {
        select: {
          judul: true,
          dudi: { select: { userId: true, namaPerusahaan: true } },
        },
      },
    },
  });
  if (!current || current.siswaId !== ctx.siswa.id) {
    return { ok: false, error: "Pendaftaran tidak ditemukan." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return transitionPendaftaran(tx, {
        pendaftaranId,
        to: "DIBATALKAN_SISWA",
        aktorRole: "SISWA",
        aktorId: ctx.siswa.id,
        catatan: null,
      });
    });

    await logAudit({
      userId: ctx.session.user.id,
      action: "BATALKAN_PENDAFTARAN",
      entityType: "Pendaftaran",
      entityId: pendaftaranId,
      metadata: { lowonganId: current.lowonganId },
    });

    await notify({
      userId: result.recipientUserIds.dudi,
      type: "STATUS_PENDAFTARAN",
      judul: "Siswa membatalkan pendaftaran",
      pesan: `${result.context.siswaNama} membatalkan pendaftaran ke ${result.context.lowonganJudul}.`,
      linkUrl: `/dudi/lowongan`,
      metadata: { pendaftaranId },
    });

    revalidatePath("/siswa/pendaftaran");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membatalkan.";
    return { ok: false, error: msg };
  }
}
