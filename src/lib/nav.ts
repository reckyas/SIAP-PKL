import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
  Award,
  School,
  FileText,
  UserCircle2,
  Building2,
  Briefcase,
  Search,
  Sparkles,
  Scale,
  ClipboardList,
  Inbox,
  BookOpenCheck,
  Notebook,
  ClipboardCheck,
  Star,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/**
 * Konfigurasi navigasi sidebar per-role.
 *
 * Catatan: hanya link yang sudah ada halamannya yang dicantumkan di milestone 2.
 * Menu lanjutan (rekomendasi SAW, pengajuan, jurnal, dsb.) ditambahkan di
 * milestone berikutnya — jangan mencantumkan link yang 404.
 */
export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  ADMIN: [
    {
      items: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        {
          label: "Verifikasi DU/DI",
          href: "/admin/dudi-pending",
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: "Manajemen",
      items: [
        { label: "Siswa", href: "/admin/siswa", icon: GraduationCap },
        { label: "Guru", href: "/admin/guru", icon: Users },
        { label: "DU/DI", href: "/admin/dudi", icon: Building2 },
      ],
    },
    {
      title: "Master Data",
      items: [
        { label: "Jurusan", href: "/admin/jurusan", icon: BookOpen },
        { label: "Kelas", href: "/admin/kelas", icon: School },
        { label: "Keahlian", href: "/admin/keahlian", icon: Award },
        { label: "Dokumen", href: "/admin/dokumen", icon: FileText },
      ],
    },
    {
      title: "PKL",
      items: [
        {
          label: "Pendaftaran",
          href: "/admin/pendaftaran",
          icon: ClipboardList,
        },
        {
          label: "Logbook",
          href: "/admin/logbook",
          icon: Notebook,
        },
        {
          label: "Penilaian",
          href: "/admin/penilaian",
          icon: ClipboardCheck,
        },
      ],
    },
    {
      title: "Rekomendasi",
      items: [
        { label: "Bobot SAW", href: "/admin/saw-weight", icon: Scale },
      ],
    },
    {
      title: "Akun",
      items: [
        { label: "Profil", href: "/admin/profil", icon: UserCircle2 },
      ],
    },
  ],
  GURU_PEMBIMBING: [
    {
      items: [
        { label: "Dashboard", href: "/guru", icon: LayoutDashboard },
        {
          label: "Pendaftaran",
          href: "/guru/pendaftaran",
          icon: Inbox,
        },
        {
          label: "Logbook",
          href: "/guru/logbook",
          icon: BookOpenCheck,
        },
        {
          label: "Penilaian",
          href: "/guru/penilaian",
          icon: ClipboardCheck,
        },
        { label: "Profil", href: "/guru/profil", icon: UserCircle2 },
      ],
    },
  ],
  SISWA: [
    {
      items: [
        { label: "Dashboard", href: "/siswa", icon: LayoutDashboard },
      ],
    },
    {
      title: "Lowongan",
      items: [
        { label: "Cari Lowongan", href: "/siswa/lowongan", icon: Search },
        {
          label: "Rekomendasi",
          href: "/siswa/lowongan/rekomendasi",
          icon: Sparkles,
        },
      ],
    },
    {
      title: "PKL",
      items: [
        {
          label: "Pendaftaran Saya",
          href: "/siswa/pendaftaran",
          icon: ClipboardList,
        },
        {
          label: "Logbook",
          href: "/siswa/logbook",
          icon: Notebook,
        },
        {
          label: "Nilai PKL",
          href: "/siswa/penilaian",
          icon: ClipboardCheck,
        },
        {
          label: "Review DU/DI",
          href: "/siswa/review",
          icon: Star,
        },
      ],
    },
    {
      title: "Akun",
      items: [
        { label: "Profil", href: "/siswa/profil", icon: UserCircle2 },
      ],
    },
  ],
  DUDI: [
    {
      items: [
        { label: "Dashboard", href: "/dudi", icon: LayoutDashboard },
        { label: "Lowongan", href: "/dudi/lowongan", icon: Briefcase },
        { label: "Logbook Siswa", href: "/dudi/logbook", icon: Notebook },
        {
          label: "Penilaian",
          href: "/dudi/penilaian",
          icon: ClipboardCheck,
        },
        { label: "Review", href: "/dudi/review", icon: Star },
      ],
    },
    {
      title: "Akun",
      items: [
        { label: "Profil", href: "/dudi/profil", icon: UserCircle2 },
      ],
    },
  ],
};
