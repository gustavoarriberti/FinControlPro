import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/db";
import { Category, Tag } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    if (body.entity === "TAG") {
      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        workspaceId: store.workspace.id,
        name: String(body.name || "").toLowerCase().replace(/\s+/g, "-"),
        color: body.color || "#6366f1",
      };
      store.tags.push(newTag);
      writeStore(store);
      return NextResponse.json({ tag: newTag }, { status: 201 });
    }

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      workspaceId: store.workspace.id,
      name: body.name,
      icon: body.icon || "Tag",
      color: body.color || "#3b82f6",
      type: body.type === "INCOME" ? "INCOME" : "EXPENSE",
      subcategories: Array.isArray(body.subcategories)
        ? body.subcategories.filter(Boolean)
        : [],
    };

    store.categories.push(newCat);
    writeStore(store);
    return NextResponse.json({ category: newCat }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao salvar categoria/tag", details: String(err) },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();
    const cat = store.categories.find((c) => c.id === body.id);
    if (!cat) {
      return NextResponse.json(
        { error: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    if (body.name !== undefined) cat.name = body.name;
    if (body.color !== undefined) cat.color = body.color;
    if (body.icon !== undefined) cat.icon = body.icon;
    if (Array.isArray(body.subcategories)) {
      cat.subcategories = body.subcategories.filter(Boolean);
    }

    writeStore(store);
    return NextResponse.json({ category: cat });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao atualizar categoria", details: String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const entity = searchParams.get("entity");

  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }

  const store = readStore();
  if (entity === "TAG") {
    store.tags = store.tags.filter((t) => t.id !== id);
  } else {
    store.categories = store.categories.filter((c) => c.id !== id);
  }

  writeStore(store);
  return NextResponse.json({ ok: true });
}
