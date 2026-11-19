import { NextRequest, NextResponse } from "next/server";
import { getOrCreateInvoice, readStore, writeStore } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import { formatCurrency, formatReferenceMonth } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const creditCardId = formData.get("creditCardId") as string;
    const referenceMonth = formData.get("referenceMonth") as string;
    const paymentDate =
      (formData.get("paymentDate") as string) ||
      new Date().toISOString().split("T")[0];
    const amountPaid = Number(formData.get("amountPaid") || 0);
    const paymentMethod =
      (formData.get("paymentMethod") as string) || "PIX / Débito em Conta";
    const notes = (formData.get("notes") as string) || "";
    const receiptFile = formData.get("receipt") as File | null;

    if (!creditCardId || !referenceMonth || amountPaid <= 0) {
      return NextResponse.json(
        { error: "Cartão, mês de referência e valor pago são obrigatórios." },
        { status: 400 }
      );
    }

    let receiptUrl: string | undefined;
    let receiptName: string | undefined;

    if (receiptFile && receiptFile.size > 0) {
      const arrayBuffer = await receiptFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const saved = await saveUploadedFile(
        buffer,
        receiptFile.name,
        "receipts",
        receiptFile.type || "application/pdf"
      );
      receiptUrl = saved.fileUrl;
      receiptName = saved.fileName;
    }

    const store = readStore();
    const invoice = getOrCreateInvoice(store, creditCardId, referenceMonth);
    const card = store.creditCards.find((c) => c.id === creditCardId);

    const paymentRecord = {
      id: `pay-${Date.now()}`,
      invoiceId: invoice.id,
      paymentDate,
      amountPaid: Number(amountPaid.toFixed(2)),
      paymentMethod,
      receiptUrl,
      receiptName,
      notes,
      createdAt: new Date().toISOString(),
    };

    invoice.payments.push(paymentRecord);
    invoice.paidAmount = Number(
      invoice.payments.reduce((acc, p) => acc + Number(p.amountPaid), 0).toFixed(2)
    );

    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = "PAID";
    } else {
      invoice.status = "PARTIALLY_PAID";
    }

    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      workspaceId: store.workspace.id,
      title: `Pagamento registrado: ${card?.name || "Cartão"}`,
      message: `Pagamento de ${formatCurrency(
        amountPaid
      )} confirmado para a fatura de ${formatReferenceMonth(referenceMonth)}${
        receiptName ? ` (Comprovante: ${receiptName})` : ""
      }.`,
      type: "PAYMENT_CONFIRMED",
      emailSent: false,
      read: false,
      createdAt: new Date().toISOString(),
    });

    writeStore(store);

    return NextResponse.json({
      ok: true,
      invoice,
      payment: paymentRecord,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao registrar pagamento da fatura", details: String(err) },
      { status: 500 }
    );
  }
}
