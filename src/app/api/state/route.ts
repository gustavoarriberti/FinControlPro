import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/db";

export async function GET(req: NextRequest) {
  const store = readStore();
  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId") || store.activeUserId;

  // Filtrar cartões conforme regras de privacidade do grupo familiar
  const visibleCards = store.creditCards.filter(
    (card) => card.visibility === "SHARED" || card.ownerId === requestedUserId
  );
  const visibleCardIds = new Set(visibleCards.map((c) => c.id));

  // Filtrar transações conforme visibilidade do cartão e do lançamento individual
  const visibleTransactions = store.transactions.filter(
    (tx) =>
      visibleCardIds.has(tx.creditCardId) &&
      (tx.visibility === "SHARED" || tx.userId === requestedUserId)
  );

  // Recalcular faturas visíveis para o membro atual
  const visibleInvoices = store.invoices
    .filter((inv) => visibleCardIds.has(inv.creditCardId))
    .map((inv) => {
      const invTxs = visibleTransactions.filter((t) => t.invoiceId === inv.id);
      const visibleTotal = Number(
        invTxs.reduce((acc, t) => acc + Number(t.amount), 0).toFixed(2)
      );
      return {
        ...inv,
        totalAmount: visibleTotal,
      };
    });

  const visibleRecurrings = store.recurringTransactions.filter(
    (rec) => rec.visibility === "SHARED" || rec.userId === requestedUserId
  );

  return NextResponse.json({
    workspace: store.workspace,
    activeUserId: requestedUserId,
    creditCards: visibleCards,
    categories: store.categories,
    tags: store.tags,
    invoices: visibleInvoices,
    transactions: visibleTransactions,
    recurringTransactions: visibleRecurrings,
    notifications: store.notifications,
    settings: store.settings,
  });
}
