import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/db";
import { checkAndDispatchDueAlerts } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    if (body.action === "MARK_ALL_READ") {
      store.notifications.forEach((n) => {
        n.read = true;
      });
      writeStore(store);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "CHECK_ALERTS") {
      const referenceMonth = body.referenceMonth || "2026-11";
      const result = await checkAndDispatchDueAlerts(store, referenceMonth);
      writeStore(store);
      return NextResponse.json({
        ok: true,
        createdCount: result.createdNotifications.length,
        emailsDispatched: result.emailsDispatched,
        notifications: store.notifications,
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao processar notificações", details: String(err) },
      { status: 500 }
    );
  }
}
