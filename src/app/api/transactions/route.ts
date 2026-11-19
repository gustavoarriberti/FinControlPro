import { NextRequest, NextResponse } from "next/server";
import {
  addPurchaseWithInstallments,
  readStore,
  writeStore,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    const created = addPurchaseWithInstallments(store, {
      creditCardId: body.creditCardId,
      categoryId: body.categoryId || store.categories[0]?.id,
      subcategory: body.subcategory,
      userId: body.userId || store.activeUserId,
      description: body.description,
      merchant: body.merchant || body.description,
      totalAmount: Number(body.amount),
      isInstallmentValue: Boolean(body.isInstallmentValue),
      date: body.date || new Date().toISOString().split("T")[0],
      startReferenceMonth: body.referenceMonth || undefined,
      startInstallmentNumber: Number(body.currentInstallment) || 1,
      totalInstallments: Number(body.totalInstallments) || 1,
      tags: Array.isArray(body.tags) ? body.tags : [],
      visibility: body.visibility === "PRIVATE" ? "PRIVATE" : "SHARED",
      source: body.source || "MANUAL",
      projectRemaining: body.projectRemaining !== false,
    });

    writeStore(store);
    return NextResponse.json({ transactions: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao registrar lançamento", details: String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const deleteAllInstallments = searchParams.get("allInstallments") === "true";

  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }

  const store = readStore();
  const target = store.transactions.find((t) => t.id === id);
  if (!target) {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  }

  if (deleteAllInstallments && target.installmentGroupId) {
    store.transactions = store.transactions.filter(
      (t) => t.installmentGroupId !== target.installmentGroupId
    );
  } else {
    store.transactions = store.transactions.filter((t) => t.id !== id);
  }

  writeStore(store);
  return NextResponse.json({ ok: true });
}
