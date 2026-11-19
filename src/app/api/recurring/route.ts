import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/db";
import { RecurringTransaction } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    const newRecurring: RecurringTransaction = {
      id: `rec-${Date.now()}`,
      workspaceId: store.workspace.id,
      categoryId: body.categoryId || store.categories[0]?.id,
      subcategory: body.subcategory,
      userId: body.userId || store.activeUserId,
      title: body.title,
      type: body.type === "INCOME" ? "INCOME" : "EXPENSE",
      expectedAmount: Number(body.expectedAmount) || 0,
      frequency: body.frequency || "MONTHLY",
      dueDay: Math.min(31, Math.max(1, Number(body.dueDay) || 10)),
      startDate: body.startDate || new Date().toISOString().split("T")[0],
      endDate: body.endDate || undefined,
      notifyDueDate: body.notifyDueDate !== false,
      daysBeforeAlert: Number(body.daysBeforeAlert) || 3,
      visibility: body.visibility === "PRIVATE" ? "PRIVATE" : "SHARED",
      autoDebitCardId: body.autoDebitCardId || undefined,
      paidMonths: Array.isArray(body.paidMonths) ? body.paidMonths : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      active: true,
      createdAt: new Date().toISOString(),
    };

    store.recurringTransactions.push(newRecurring);
    writeStore(store);

    return NextResponse.json({ recurring: newRecurring }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao criar transação recorrente", details: String(err) },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();
    const rec = store.recurringTransactions.find((r) => r.id === body.id);

    if (!rec) {
      return NextResponse.json(
        { error: "Transação recorrente não encontrada" },
        { status: 404 }
      );
    }

    if (body.toggleMonth) {
      const m = body.toggleMonth as string;
      if (rec.paidMonths.includes(m)) {
        rec.paidMonths = rec.paidMonths.filter((item) => item !== m);
      } else {
        rec.paidMonths.push(m);
      }
    }

    if (body.title !== undefined) rec.title = body.title;
    if (body.expectedAmount !== undefined)
      rec.expectedAmount = Number(body.expectedAmount);
    if (body.dueDay !== undefined) rec.dueDay = Number(body.dueDay);
    if (body.visibility !== undefined) rec.visibility = body.visibility;
    if (body.notifyDueDate !== undefined) rec.notifyDueDate = Boolean(body.notifyDueDate);

    writeStore(store);
    return NextResponse.json({ recurring: rec });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao atualizar recorrência", details: String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }

  const store = readStore();
  store.recurringTransactions = store.recurringTransactions.filter(
    (r) => r.id !== id
  );
  writeStore(store);
  return NextResponse.json({ ok: true });
}
