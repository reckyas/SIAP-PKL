import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { UPLOAD_FOLDERS, type UploadFolder } from "@/lib/constants";
import { storage, validateUpload } from "@/lib/storage";

/**
 * Endpoint upload file generic.
 *
 * Auth: wajib login (semua role boleh upload — izin per-folder masih
 * longgar di milestone 2; pengetatan per-role dilakukan saat feature
 * menggunakan upload ini — mis. hanya DUDI yang boleh upload gallery).
 *
 * Body: multipart/form-data dengan field `file` dan `folder`.
 * Response: { url, filename, size } atau { error }.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Request harus multipart/form-data" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const folderRaw = form.get("folder");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field `file` wajib." }, { status: 400 });
  }
  if (typeof folderRaw !== "string" || !(folderRaw in UPLOAD_FOLDERS)) {
    return NextResponse.json(
      { error: "Folder tidak valid." },
      { status: 400 },
    );
  }
  const folder = folderRaw as UploadFolder;

  const err = validateUpload(file);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const saved = await storage.save(buffer, file.name, folder);

  return NextResponse.json(saved, { status: 201 });
}
