import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import { parseUploadedInvoiceFile } from "@/lib/parsers/invoice-parser";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const referenceMonth =
      (formData.get("referenceMonth") as string) || "2026-11";

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado para análise." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await saveUploadedFile(
      buffer,
      file.name,
      "invoices",
      file.type || "application/octet-stream"
    );

    const store = readStore();
    const parsedPayload = await parseUploadedInvoiceFile(
      buffer,
      file.name,
      saved.fileUrl,
      referenceMonth,
      store.categories
    );

    return NextResponse.json({
      parsed: parsedPayload,
      storageProvider: saved.provider,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao processar arquivo de fatura", details: String(err) },
      { status: 500 }
    );
  }
}
