import "server-only";

import type { Prisma, Role, StatusPendaftaran } from "@prisma/client";

/**
 * State machine untuk transisi status Pendaftaran.
 *
 * Fungsi ini bukan lagi server action — ia murni helper yg dipanggil di
 * dalam $transaction di file actions per-role. Rationale: side-effect
 * (kuota Lowongan, statusPKL Siswa, auto-reject pendaftaran lain) wajib
 * atomic dengan perubahan status utama.
 */

const ALLOWED: Record<StatusPendaftaran, StatusPendaftaran[]> = {
  PENDING: ["DISETUJUI_GURU", "DITOLAK_GURU", "DIBATALKAN_SISWA"],
  DISETUJUI_GURU: ["DILIHAT_DUDI", "DITERIMA", "DITOLAK_DUDI", "DIBATALKAN_SISWA"],
  DITOLAK_GURU: [],
  DILIHAT_DUDI: ["DITERIMA", "DITOLAK_DUDI", "DIBATALKAN_SISWA"],
  DITERIMA: [],
  DITOLAK_DUDI: [],
  DIBATALKAN_SISWA: [],
};

export function canTransition(
  from: StatusPendaftaran,
  to: StatusPendaftaran,
): boolean {
  return ALLOWED[from].includes(to);
}

export interface TransitionInput {
  pendaftaranId: string;
  to: StatusPendaftaran;
  aktorRole: Role;
  aktorId: string | null;
  catatan?: string | null;
}

/**
 * Lakukan transisi status + efek samping dalam satu transaksi.
 * Melempar Error kalau transisi tidak diizinkan atau record tidak ada.
 *
 * Side effects saat DITERIMA:
 *   - Lowongan.terisiLaki/Perempuan +1 (berdasarkan Gender siswa)
 *   - Lowongan.status → FULL kalau total terisi >= kuotaTotal
 *   - Siswa.statusPKL → DITERIMA
 *   - Auto-tolak pendaftaran siswa yg sama di lowongan lain (status aktif)
 *     jadi DIBATALKAN_SISWA (atau bisa tambah enum OVERRIDDEN, tapi kita
 *     pakai DIBATALKAN_SISWA supaya enum tidak bengkak)
 */
export async function transitionPendaftaran(
  tx: Prisma.TransactionClient,
  input: TransitionInput,
) {
  const current = await tx.pendaftaran.findUnique({
    where: { id: input.pendaftaranId },
    select: {
      id: true,
      status: true,
      siswaId: true,
      lowonganId: true,
      guruApprovalId: true,
      siswa: {
        select: { id: true, userId: true, jenisKelamin: true, nama: true },
      },
      lowongan: {
        select: {
          id: true,
          dudiId: true,
          judul: true,
          kuotaTotal: true,
          terisiLaki: true,
          terisiPerempuan: true,
          status: true,
          dudi: { select: { userId: true, namaPerusahaan: true } },
        },
      },
    },
  });
  if (!current) throw new Error("Pendaftaran tidak ditemukan.");
  if (!canTransition(current.status, input.to)) {
    throw new Error(
      `Transisi ${current.status} → ${input.to} tidak diizinkan.`,
    );
  }

  const now = new Date();
  const updateData: Prisma.PendaftaranUpdateInput = { status: input.to };

  if (input.to === "DISETUJUI_GURU" || input.to === "DITOLAK_GURU") {
    if (input.aktorRole !== "GURU_PEMBIMBING") {
      throw new Error("Hanya guru yang bisa approve/reject di tahap ini.");
    }
    updateData.guruApproval = input.aktorId
      ? { connect: { id: input.aktorId } }
      : undefined;
    updateData.guruApprovedAt = now;
    if (input.catatan) updateData.catatanGuru = input.catatan;
  }

  if (
    input.to === "DILIHAT_DUDI" ||
    input.to === "DITERIMA" ||
    input.to === "DITOLAK_DUDI"
  ) {
    if (input.aktorRole !== "DUDI") {
      throw new Error("Hanya DUDI yang bisa menentukan penerimaan.");
    }
    updateData.dudiReviewedAt = now;
    if (input.catatan) updateData.catatanDUDI = input.catatan;
  }

  if (input.to === "DIBATALKAN_SISWA") {
    if (input.aktorRole !== "SISWA") {
      throw new Error("Hanya siswa yang bisa membatalkan pendaftaran.");
    }
  }

  await tx.pendaftaran.update({
    where: { id: input.pendaftaranId },
    data: updateData,
  });

  await tx.pendaftaranTimeline.create({
    data: {
      pendaftaranId: input.pendaftaranId,
      status: input.to,
      catatan: input.catatan ?? null,
      aktorRole: input.aktorRole,
      aktorId: input.aktorId,
    },
  });

  // Side effects khusus DITERIMA.
  if (input.to === "DITERIMA") {
    const isLaki = current.siswa.jenisKelamin === "LAKI_LAKI";
    const newTerisiLaki =
      current.lowongan.terisiLaki + (isLaki ? 1 : 0);
    const newTerisiPerempuan =
      current.lowongan.terisiPerempuan + (isLaki ? 0 : 1);
    const totalTerisi = newTerisiLaki + newTerisiPerempuan;
    const shouldBeFull = totalTerisi >= current.lowongan.kuotaTotal;

    await tx.lowongan.update({
      where: { id: current.lowonganId },
      data: {
        terisiLaki: newTerisiLaki,
        terisiPerempuan: newTerisiPerempuan,
        ...(shouldBeFull ? { status: "FULL" as const } : {}),
      },
    });

    await tx.siswa.update({
      where: { id: current.siswaId },
      data: { statusPKL: "DITERIMA" },
    });

    // Auto-batalkan pendaftaran aktif lain dari siswa yg sama.
    // Kita tidak bikin timeline entry per-pendaftaran (akan jadi banyak
    // baris log dari satu tindakan yg sama) — cukup update status saja.
    await tx.pendaftaran.updateMany({
      where: {
        siswaId: current.siswaId,
        id: { not: current.id },
        status: { in: ["PENDING", "DISETUJUI_GURU", "DILIHAT_DUDI"] },
      },
      data: { status: "DIBATALKAN_SISWA" },
    });
  }

  return {
    current,
    recipientUserIds: {
      siswa: current.siswa.userId,
      dudi: current.lowongan.dudi.userId,
      guruId: current.guruApprovalId,
    },
    context: {
      lowonganJudul: current.lowongan.judul,
      perusahaan: current.lowongan.dudi.namaPerusahaan,
      siswaNama: current.siswa.nama,
    },
  };
}
