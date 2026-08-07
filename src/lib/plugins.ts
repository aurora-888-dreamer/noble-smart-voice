// Central plugin registry. Add a new entry here whenever a new plugin is
// built — it automatically shows up in the hidden admin toggle page, and
// is the same id future plugin voucher codes will unlock.
export type PluginId = "translator" | "calculator" | "camera" | "school" | "pmd";

export interface PluginMeta {
  id: PluginId;
  name: string;
  nameId: string;
  description: string;
  descriptionId: string;
}

export const PLUGIN_REGISTRY: PluginMeta[] = [
  {
    id: "translator",
    name: "Multi-Language Translator",
    nameId: "Penerjemah Multi Bahasa",
    description: "Translate notes, diary entries, and other captures into other languages using AI.",
    descriptionId: "Terjemahkan catatan, diary, dan hasil rekaman lainnya ke bahasa lain pakai AI.",
  },
  {
    id: "calculator",
    name: "Calculator",
    nameId: "Kalkulator",
    description: "A quick built-in calculator, reachable from the sidebar and Home.",
    descriptionId: "Kalkulator bawaan yang cepat diakses dari sidebar dan Home.",
  },
  {
    id: "camera",
    name: "Camera Capture",
    nameId: "Kamera & Foto",
    description: "Take photos with the camera and browse a gallery, saved right into Noble.",
    descriptionId: "Ambil foto pakai kamera dan lihat galerinya, tersimpan langsung di Noble.",
  },
  {
    id: "school",
    name: "School Dashboard",
    nameId: "Dashboard Sekolah",
    description: "Kindergarten management: teacher/parent/principal dashboards, attendance, lesson plans, timetable, projects, assessments and announcements. Sample: Stella Maris International School.",
    descriptionId: "Manajemen kindergarten: dashboard guru/orang tua/principal, absensi, RPP, jadwal, proyek, asesmen, dan pengumuman. Contoh: Stella Maris International School.",
  },
  {
    id: "pmd",
    name: "Project Management Dashboard",
    nameId: "Dashboard Manajemen Proyek",
    description: "Run projects end to end: contacts, vendors, documents, properties, budget and an approval timeline.",
    descriptionId: "Kelola proyek dari awal sampai selesai: kontak, vendor, dokumen, properti, anggaran, dan lini masa persetujuan.",
  },
  // Next plugin ideas go here, e.g.:
  // { id: "ocr", name: "Photo to Text (OCR)", ... }
];
