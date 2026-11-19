import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/db";
import { CreditCard } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    const newCard: CreditCard = {
      id: `card-${Date.now()}`,
      workspaceId: store.workspace.id,
      ownerId: body.ownerId || store.activeUserId,
      name: body.name,
      institution: body.institution || body.name,
      lastFourDigits: String(body.lastFourDigits || "0000").slice(-4),
      brand: body.brand || "Mastercard",
      creditLimit: Number(body.creditLimit) || 5000,
      closingDay: Math.min(28, Math.max(1, Number(body.closingDay) || 15)),
      dueDay: Math.min(28, Math.max(1, Number(body.dueDay) || 22)),
      color: body.color || "#2563eb",
      visibility: body.visibility === "PRIVATE" ? "PRIVATE" : "SHARED",
      createdAt: new Date().toISOString(),
    };

    store.creditCards.push(newCard);
    writeStore(store);

    return NextResponse.json({ card: newCard }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao criar cartão de crédito", details: String(err) },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();
    const card = store.creditCards.find((c) => c.id === body.id);

    if (!card) {
      return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
    }

    if (body.name !== undefined) card.name = body.name;
    if (body.institution !== undefined) card.institution = body.institution;
    if (body.lastFourDigits !== undefined) card.lastFourDigits = body.lastFourDigits;
    if (body.brand !== undefined) card.brand = body.brand;
    if (body.creditLimit !== undefined) card.creditLimit = Number(body.creditLimit);
    if (body.closingDay !== undefined) card.closingDay = Number(body.closingDay);
    if (body.dueDay !== undefined) card.dueDay = Number(body.dueDay);
    if (body.color !== undefined) card.color = body.color;
    if (body.visibility !== undefined) card.visibility = body.visibility;

    writeStore(store);
    return NextResponse.json({ card });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao atualizar cartão", details: String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID do cartão obrigatório" }, { status: 400 });
  }

  const store = readStore();
  store.creditCards = store.creditCards.filter((c) => c.id !== id);
  store.invoices = store.invoices.filter((i) => i.creditCardId !== id);
  store.transactions = store.transactions.filter((t) => t.creditCardId !== id);

  writeStore(store);
  return NextResponse.json({ ok: true });
}
