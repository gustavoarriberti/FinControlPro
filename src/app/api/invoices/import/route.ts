import { NextRequest, NextResponse } from "next/server";
import {
  addPurchaseWithInstallments,
  getOrCreateInvoice,
  readStore,
  writeStore,
} from "@/lib/db";
import { ExtractedTransactionDraft, TransactionSource } from "@/lib/types";
import { formatCurrency, formatReferenceMonth } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creditCardId,
      referenceMonth,
      fileName,
      fileUrl,
      fileFormat,
      userId,
      items,
    }: {
      creditCardId: string;
      referenceMonth: string;
      fileName: string;
      fileUrl: string;
      fileFormat: "PDF" | "OFX" | "CSV";
      userId?: string;
      items: ExtractedTransactionDraft[];
    } = body;

    const store = readStore();
    const invoice = getOrCreateInvoice(store, creditCardId, referenceMonth);

    if (fileUrl) invoice.fileUrl = fileUrl;
    if (fileName) invoice.fileName = fileName;

    const source: TransactionSource =
      fileFormat === "PDF" ? "PDF_AI" : fileFormat === "OFX" ? "OFX" : "CSV";

    const selectedItems = (items || []).filter((i) => i.selected);
    let importedCount = 0;
    let projectedCount = 0;

    for (const item of selectedItems) {
      const created = addPurchaseWithInstallments(store, {
        creditCardId,
        categoryId: item.categoryId || store.categories[0].id,
        subcategory: item.subcategory,
        userId: userId || store.activeUserId,
        description: item.description,
        merchant: item.merchant || item.description,
        totalAmount: Number(item.amount),
        isInstallmentValue: true,
        date: item.date,
        startReferenceMonth: referenceMonth,
        startInstallmentNumber: Number(item.currentInstallment) || 1,
        totalInstallments: Number(item.totalInstallments) || 1,
        tags: item.tags || [],
        visibility: item.visibility || "SHARED",
        source,
        projectRemaining: Boolean(item.projectRemainingInstallments),
      });

      importedCount++;
      if (created.length > 1) {
        projectedCount += created.length - 1;
      }
    }

    const totalImportedValue = selectedItems.reduce(
      (acc, i) => acc + Number(i.amount),
      0
    );

    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      workspaceId: store.workspace.id,
      title: `Fatura importada com sucesso (${fileName})`,
      message: `${importedCount} lançamentos (${formatCurrency(
        totalImportedValue
      )}) salvos em ${formatReferenceMonth(referenceMonth)}${
        projectedCount > 0
          ? ` + ${projectedCount} parcelas futuras projetadas automaticamente.`
          : "."
      }`,
      type: "IMPORT_COMPLETED",
      emailSent: false,
      read: false,
      createdAt: new Date().toISOString(),
    });

    writeStore(store);

    return NextResponse.json({
      ok: true,
      importedCount,
      projectedCount,
      invoiceId: invoice.id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao salvar conciliação da fatura", details: String(err) },
      { status: 400 }
    );
  }
}
