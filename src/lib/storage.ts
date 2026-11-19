import fs from "fs";
import path from "path";

export interface SavedFileResult {
  fileUrl: string;
  fileName: string;
  provider: "LOCAL_DISK" | "SUPABASE_STORAGE";
}

/**
 * Salva arquivos físicos (faturas PDF/OFX/CSV ou comprovantes de pagamento).
 * Se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estiverem configurados, envia para o Supabase Storage.
 * Caso contrário, salva localmente em public/uploads/<folder>/ para visualização imediata no navegador.
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string,
  folder: "invoices" | "receipts",
  mimeType: string
): Promise<SavedFileResult> {
  const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${sanitized}`;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const bucket =
        folder === "invoices"
          ? process.env.STORAGE_BUCKET_INVOICES || "invoices"
          : process.env.STORAGE_BUCKET_RECEIPTS || "receipts";

      const uploadEndpoint = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${uniqueName}`;
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": mimeType || "application/octet-stream",
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer),
      });

      if (res.ok) {
        const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${uniqueName}`;
        return {
          fileUrl: publicUrl,
          fileName: originalName,
          provider: "SUPABASE_STORAGE",
        };
      }
    } catch {
      // Fallback para armazenamento local se o bucket remoto falhar
    }
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const targetPath = path.join(uploadDir, uniqueName);
  fs.writeFileSync(targetPath, buffer);

  return {
    fileUrl: `/uploads/${folder}/${uniqueName}`,
    fileName: originalName,
    provider: "LOCAL_DISK",
  };
}
