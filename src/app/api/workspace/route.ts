import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    if (body.action === "ADD_MEMBER") {
      const newMember = {
        id: `usr-${Date.now()}`,
        name: body.name,
        email: body.email,
        role: body.role || "MEMBER",
      };
      store.workspace.members.push(newMember);
      writeStore(store);
      return NextResponse.json({ member: newMember }, { status: 201 });
    }

    if (body.action === "SWITCH_USER") {
      const exists = store.workspace.members.some((m) => m.id === body.userId);
      if (exists) {
        store.activeUserId = body.userId;
        writeStore(store);
      }
      return NextResponse.json({ activeUserId: store.activeUserId });
    }

    if (body.action === "UPDATE_WORKSPACE") {
      if (body.workspaceName) store.workspace.name = body.workspaceName;
      if (body.notificationEmail)
        store.settings.notificationEmail = body.notificationEmail;
      writeStore(store);
      return NextResponse.json({
        workspace: store.workspace,
        settings: store.settings,
      });
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao atualizar espaço familiar", details: String(err) },
      { status: 400 }
    );
  }
}
