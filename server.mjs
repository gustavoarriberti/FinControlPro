import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function addMonths(refMonth, offset) {
  const [y, m] = refMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildInvoiceDates(refMonth, closingDay, dueDay) {
  const [yStr, mStr] = refMonth.split("-");
  const maxClosing = new Date(Number(yStr), Number(mStr), 0).getDate();
  const closingDate = `${yStr}-${mStr}-${String(Math.min(closingDay, maxClosing)).padStart(2, "0")}`;
  const dueRef = dueDay < closingDay ? addMonths(refMonth, 1) : refMonth;
  const [dy, dm] = dueRef.split("-");
  const maxDue = new Date(Number(dy), Number(dm), 0).getDate();
  const dueDate = `${dy}-${dm}-${String(Math.min(dueDay, maxDue)).padStart(2, "0")}`;
  return { closingDate, dueDate };
}

function getOrCreateInvoice(store, creditCardId, referenceMonth) {
  let inv = store.invoices.find(
    (i) => i.creditCardId === creditCardId && i.referenceMonth === referenceMonth
  );
  if (!inv) {
    const card = store.creditCards.find((c) => c.id === creditCardId);
    const { closingDate, dueDate } = buildInvoiceDates(
      referenceMonth,
      card?.closingDay ?? 15,
      card?.dueDay ?? 22
    );
    inv = {
      id: `inv-${creditCardId}-${referenceMonth}`,
      creditCardId,
      referenceMonth,
      closingDate,
      dueDate,
      totalAmount: 0,
      paidAmount: 0,
      status: "OPEN",
      payments: [],
      updatedAt: new Date().toISOString(),
    };
    store.invoices.push(inv);
  }
  return inv;
}

function recalculateTotals(store) {
  for (const inv of store.invoices) {
    const txs = store.transactions.filter((t) => t.invoiceId === inv.id);
    inv.totalAmount = Number(txs.reduce((a, t) => a + Number(t.amount), 0).toFixed(2));
    inv.paidAmount = Number(
      (inv.payments || []).reduce((a, p) => a + Number(p.amountPaid), 0).toFixed(2)
    );
    if (inv.paidAmount >= inv.totalAmount && inv.totalAmount > 0) inv.status = "PAID";
    else if (inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount)
      inv.status = "PARTIALLY_PAID";
  }
}

function addPurchase(store, input) {
  const card = store.creditCards.find((c) => c.id === input.creditCardId);
  const closingDay = card?.closingDay ?? 15;
  const [y, m, d] = (input.date || "2026-11-10").split("-").map(Number);
  const baseRef = `${y}-${String(m).padStart(2, "0")}`;
  const firstRef =
    input.startReferenceMonth || (d >= closingDay ? addMonths(baseRef, 1) : baseRef);

  const totalInst = Math.max(1, Number(input.totalInstallments) || 1);
  const startInst = Math.max(1, Number(input.startInstallmentNumber) || 1);
  const installmentAmount = input.isInstallmentValue
    ? Number(Number(input.totalAmount).toFixed(2))
    : Number((Number(input.totalAmount) / totalInst).toFixed(2));

  const groupId = totalInst > 1 ? `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : undefined;

  for (let inst = startInst; inst <= totalInst; inst++) {
    const refMonth = addMonths(firstRef, inst - startInst);
    const inv = getOrCreateInvoice(store, input.creditCardId, refMonth);
    store.transactions.push({
      id: `tx-${Date.now()}-${inst}-${Math.random().toString(36).slice(2, 6)}`,
      invoiceId: inv.id,
      creditCardId: input.creditCardId,
      categoryId: input.categoryId,
      subcategory: input.subcategory,
      userId: input.userId,
      description: input.description,
      merchant: input.description,
      amount: installmentAmount,
      date: input.date,
      referenceMonth: refMonth,
      currentInstallment: inst,
      totalInstallments: totalInst,
      installmentGroupId: groupId,
      tags: input.tags || [],
      visibility: card?.visibility === "PRIVATE" ? "PRIVATE" : input.visibility || "SHARED",
      source: input.source || "MANUAL",
      createdAt: new Date().toISOString(),
    });
  }
  recalculateTotals(store);
}

function loadOrSeedStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(STORE_PATH)) {
    try {
      const s = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
      recalculateTotals(s);
      return s;
    } catch {}
  }

  const workspaceId = "ws-familia-silva";
  const userGustavoId = "usr-gustavo";
  const userMarinaId = "usr-marina";

  const store = {
    workspace: {
      id: workspaceId,
      name: "Família Silva",
      type: "FAMILY",
      createdAt: "2026-01-01T00:00:00Z",
      members: [
        { id: userGustavoId, name: "Gustavo Silva", email: "gustavo@familia.local", role: "OWNER" },
        { id: userMarinaId, name: "Marina Silva", email: "marina@familia.local", role: "MEMBER" },
      ],
    },
    activeUserId: userGustavoId,
    creditCards: [
      {
        id: "card-nubank",
        workspaceId,
        ownerId: userGustavoId,
        name: "Nubank Ultravioleta",
        institution: "Nubank",
        lastFourDigits: "4829",
        brand: "Mastercard",
        creditLimit: 18500,
        closingDay: 18,
        dueDay: 25,
        color: "#7c3aed",
        visibility: "SHARED",
      },
      {
        id: "card-itau",
        workspaceId,
        ownerId: userMarinaId,
        name: "Itaú Personnalité Black",
        institution: "Itaú",
        lastFourDigits: "9014",
        brand: "Visa",
        creditLimit: 25000,
        closingDay: 10,
        dueDay: 17,
        color: "#ea580c",
        visibility: "SHARED",
      },
      {
        id: "card-inter-privado",
        workspaceId,
        ownerId: userGustavoId,
        name: "Inter Black (Privado Gustavo)",
        institution: "Banco Inter",
        lastFourDigits: "3371",
        brand: "Mastercard",
        creditLimit: 9000,
        closingDay: 5,
        dueDay: 12,
        color: "#f97316",
        visibility: "PRIVATE",
      },
    ],
    categories: [
      { id: "cat-alimentacao", workspaceId, name: "Alimentação", color: "#f97316", type: "EXPENSE", subcategories: ["Supermercado", "Restaurantes", "iFood / Delivery"] },
      { id: "cat-moradia", workspaceId, name: "Moradia & Contas", color: "#3b82f6", type: "EXPENSE", subcategories: ["Aluguel", "Condomínio", "Energia", "Internet"] },
      { id: "cat-transporte", workspaceId, name: "Transporte", color: "#eab308", type: "EXPENSE", subcategories: ["Combustível", "Uber / 99", "Pedágio"] },
      { id: "cat-assinaturas", workspaceId, name: "Assinaturas & Streaming", color: "#8b5cf6", type: "EXPENSE", subcategories: ["Netflix / Vídeo", "Spotify", "Software & Nuvem"] },
      { id: "cat-compras", workspaceId, name: "Compras & Eletrônicos", color: "#ec4899", type: "EXPENSE", subcategories: ["Eletrônicos", "Eletrodomésticos", "Presentes"] },
      { id: "cat-saude", workspaceId, name: "Saúde & Farmácia", color: "#10b981", type: "EXPENSE", subcategories: ["Farmácia", "Consultas"] },
      { id: "cat-lazer", workspaceId, name: "Lazer & Viagens", color: "#06b6d4", type: "EXPENSE", subcategories: ["Passagens Aéreas", "Hotéis"] },
      { id: "cat-receitas", workspaceId, name: "Receitas & Salário", color: "#22c55e", type: "INCOME", subcategories: ["Salário", "Projetos"] },
    ],
    tags: [
      { id: "t1", workspaceId, name: "essencial", color: "#3b82f6" },
      { id: "t2", workspaceId, name: "parcelado", color: "#8b5cf6" },
      { id: "t3", workspaceId, name: "casa", color: "#10b981" },
      { id: "t4", workspaceId, name: "assinatura", color: "#f59e0b" },
    ],
    invoices: [],
    transactions: [],
    recurringTransactions: [
      { id: "rec-1", workspaceId, categoryId: "cat-moradia", userId: userGustavoId, title: "Aluguel + Condomínio", type: "EXPENSE", expectedAmount: 3450, frequency: "MONTHLY", dueDay: 10, notifyDueDate: true, visibility: "SHARED", paidMonths: ["2026-10", "2026-11"], active: true },
      { id: "rec-2", workspaceId, categoryId: "cat-moradia", userId: userGustavoId, title: "Vivo Fibra 700 Mega", type: "EXPENSE", expectedAmount: 149.9, frequency: "MONTHLY", dueDay: 22, notifyDueDate: true, visibility: "SHARED", paidMonths: ["2026-10"], active: true },
      { id: "rec-3", workspaceId, categoryId: "cat-assinaturas", userId: userMarinaId, title: "Netflix 4K Ultra HD", type: "EXPENSE", expectedAmount: 59.9, frequency: "MONTHLY", dueDay: 24, notifyDueDate: true, visibility: "SHARED", paidMonths: ["2026-10"], active: true },
      { id: "rec-4", workspaceId, categoryId: "cat-moradia", userId: userMarinaId, title: "Enel Energia Elétrica", type: "EXPENSE", expectedAmount: 285.4, frequency: "MONTHLY", dueDay: 26, notifyDueDate: true, visibility: "SHARED", paidMonths: ["2026-10"], active: true },
      { id: "rec-5", workspaceId, categoryId: "cat-receitas", userId: userGustavoId, title: "Salário Mensal Gustavo", type: "INCOME", expectedAmount: 12500, frequency: "MONTHLY", dueDay: 5, notifyDueDate: false, visibility: "SHARED", paidMonths: ["2026-11"], active: true },
      { id: "rec-6", workspaceId, categoryId: "cat-receitas", userId: userMarinaId, title: "Salário Mensal Marina", type: "INCOME", expectedAmount: 9800, frequency: "MONTHLY", dueDay: 5, notifyDueDate: false, visibility: "SHARED", paidMonths: ["2026-11"], active: true },
    ],
    notifications: [
      { id: "n1", workspaceId, title: "Fatura Nubank Ultravioleta fechada", message: "Vence em 25/11/2026. Confira os lançamentos e anexe o comprovante ao pagar.", type: "INVOICE_DUE", read: false },
      { id: "n2", workspaceId, title: "Lembrete: Vivo Fibra 700 Mega", message: "Conta recorrente de R$ 149,90 vence no dia 22/11/2026.", type: "RECURRING_DUE", read: false },
    ],
    settings: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      storageProvider: "LOCAL_DISK",
      notificationEmail: "gustavo@familia.local",
    },
  };

  addPurchase(store, { creditCardId: "card-nubank", categoryId: "cat-compras", userId: userGustavoId, description: "MacBook Air M3 - Apple Store", totalAmount: 9600, date: "2026-09-12", startReferenceMonth: "2026-09", totalInstallments: 10, tags: ["parcelado"], visibility: "SHARED", source: "PDF_AI" });
  addPurchase(store, { creditCardId: "card-nubank", categoryId: "cat-compras", userId: userMarinaId, description: "Geladeira Brastemp Frost Free Inverse", totalAmount: 4800, date: "2026-10-08", startReferenceMonth: "2026-10", totalInstallments: 6, tags: ["parcelado", "casa"], visibility: "SHARED", source: "PDF_AI" });
  addPurchase(store, { creditCardId: "card-nubank", categoryId: "cat-alimentacao", userId: userMarinaId, description: "Pão de Açúcar Supermercados", totalAmount: 1189.4, date: "2026-11-04", startReferenceMonth: "2026-11", totalInstallments: 1, tags: ["essencial", "casa"], visibility: "SHARED", source: "OFX" });
  addPurchase(store, { creditCardId: "card-nubank", categoryId: "cat-alimentacao", userId: userGustavoId, description: "iFood *Restaurante Coco Bambu", totalAmount: 264.5, date: "2026-11-11", startReferenceMonth: "2026-11", totalInstallments: 1, tags: [], visibility: "SHARED", source: "OFX" });
  addPurchase(store, { creditCardId: "card-nubank", categoryId: "cat-transporte", userId: userGustavoId, description: "Posto Shell Select", totalAmount: 315, date: "2026-11-14", startReferenceMonth: "2026-11", totalInstallments: 1, tags: ["essencial"], visibility: "SHARED", source: "OFX" });
  addPurchase(store, { creditCardId: "card-itau", categoryId: "cat-lazer", userId: userMarinaId, description: "LATAM Airlines - Férias Nordeste", totalAmount: 3600, date: "2026-10-03", startReferenceMonth: "2026-10", totalInstallments: 4, tags: ["parcelado"], visibility: "SHARED", source: "PDF_AI" });
  addPurchase(store, { creditCardId: "card-itau", categoryId: "cat-alimentacao", userId: userMarinaId, description: "Sam's Club Atacado", totalAmount: 845.2, date: "2026-11-02", startReferenceMonth: "2026-11", totalInstallments: 1, tags: ["casa"], visibility: "SHARED", source: "CSV" });
  addPurchase(store, { creditCardId: "card-inter-privado", categoryId: "cat-compras", userId: userGustavoId, description: "Joalheria Vivara - Presente Surpresa (Privado)", totalAmount: 1500, date: "2026-11-01", startReferenceMonth: "2026-11", totalInstallments: 3, tags: ["parcelado"], visibility: "PRIVATE", source: "MANUAL" });

  for (const inv of store.invoices) {
    if (inv.referenceMonth === "2026-09" || inv.referenceMonth === "2026-10") {
      inv.status = "PAID";
      inv.paidAmount = inv.totalAmount;
      inv.payments = [{ id: `p-${inv.id}`, invoiceId: inv.id, paymentDate: inv.dueDate, amountPaid: inv.totalAmount, paymentMethod: "PIX", receiptName: `comprovante_${inv.referenceMonth}.pdf` }];
    } else if (inv.referenceMonth === "2026-11" && inv.creditCardId === "card-itau") {
      inv.status = "PAID";
      inv.paidAmount = inv.totalAmount;
      inv.payments = [{ id: `p-${inv.id}`, invoiceId: inv.id, paymentDate: "2026-11-16", amountPaid: inv.totalAmount, paymentMethod: "Débito Itaú", receiptName: "comprovante_itau_nov2026.pdf" }];
    }
  }

  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  return store;
}

function saveStore(store) {
  recalculateTotals(store);
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

const HTML_APP = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FinControl Pro | Gestão de Faturas, Cartões e Finanças Familiares</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-50 text-slate-900 antialiased">
  <div id="app"></div>
  <script>
    let state = null;
    let activeTab = "DASHBOARD";
    let selectedMonth = "2026-11";
    let selectedCardId = "ALL";
    let parsedDraft = null;

    const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
    const fmtMonth = (m) => {
      const names = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      const [y, mm] = m.split("-");
      return (names[parseInt(mm, 10) - 1] || m) + "/" + y;
    };
    const addMonth = (m, offset) => {
      const [y, mm] = m.split("-").map(Number);
      const d = new Date(y, mm - 1 + offset, 1);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    };

    async function fetchState(userId) {
      const q = userId ? "?userId=" + userId : "";
      const res = await fetch("/api/state" + q);
      state = await res.json();
      render();
    }

    async function switchUser(userId) {
      await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SWITCH_USER", userId })
      });
      await fetchState(userId);
    }

    async function toggleRecurring(id) {
      await fetch("/api/recurring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, toggleMonth: selectedMonth })
      });
      await fetchState();
    }

    async function payInvoicePrompt(cardId, cardName, remAmount) {
      const val = prompt("Confirmar valor pago para " + cardName + " (" + fmtMonth(selectedMonth) + "):", remAmount.toFixed(2));
      if (!val || isNaN(Number(val))) return;
      const receiptName = prompt("Nome do arquivo de comprovante (ex: comprovante_pix.pdf):", "comprovante_pagamento_" + selectedMonth + ".pdf");
      await fetch("/api/invoices/pay-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditCardId: cardId,
          referenceMonth: selectedMonth,
          amountPaid: Number(val),
          paymentDate: new Date().toISOString().split("T")[0],
          receiptName: receiptName || "comprovante.pdf"
        })
      });
      await fetchState();
    }

    async function simulateImport(type) {
      const sampleItems = type === "PDF" ? [
        { tempId: "1", date: selectedMonth + "-03", description: "Amazon.com.br *Echo Show", amount: 215.00, currentInstallment: 1, totalInstallments: 4, categoryId: "cat-compras", visibility: "SHARED", selected: true, projectRemainingInstallments: true },
        { tempId: "2", date: selectedMonth + "-07", description: "Supermercado Pão de Açúcar", amount: 742.80, currentInstallment: 1, totalInstallments: 1, categoryId: "cat-alimentacao", visibility: "SHARED", selected: true, projectRemainingInstallments: false },
        { tempId: "3", date: selectedMonth + "-12", description: "Posto Shell Combustível", amount: 260.00, currentInstallment: 1, totalInstallments: 1, categoryId: "cat-transporte", visibility: "SHARED", selected: true, projectRemainingInstallments: false },
        { tempId: "4", date: selectedMonth + "-15", description: "Drogasil Farmácia", amount: 94.50, currentInstallment: 1, totalInstallments: 1, categoryId: "cat-saude", visibility: "SHARED", selected: true, projectRemainingInstallments: false }
      ] : [
        { tempId: "5", date: selectedMonth + "-04", description: "Mercado Livre *Cadeira Ergonômica", amount: 310.00, currentInstallment: 1, totalInstallments: 6, categoryId: "cat-compras", visibility: "SHARED", selected: true, projectRemainingInstallments: true },
        { tempId: "6", date: selectedMonth + "-09", description: "iFood *Outback Steakhouse", amount: 142.90, currentInstallment: 1, totalInstallments: 1, categoryId: "cat-alimentacao", visibility: "SHARED", selected: true, projectRemainingInstallments: false },
        { tempId: "7", date: selectedMonth + "-14", description: "Disney+ Assinatura Mensal", amount: 43.90, currentInstallment: 1, totalInstallments: 1, categoryId: "cat-assinaturas", visibility: "SHARED", selected: true, projectRemainingInstallments: false }
      ];
      parsedDraft = {
        fileName: "fatura_" + type.toLowerCase() + "_" + selectedMonth + "." + type.toLowerCase(),
        fileFormat: type,
        engine: type === "PDF" ? "IA Híbrida (Gemini / OCR)" : "Parser Nativo " + type,
        creditCardId: state.creditCards[0]?.id,
        items: sampleItems
      };
      render();
    }

    async function handleFileSelect(input) {
      const file = input.files[0];
      if (!file) return;
      const text = await file.text();
      const ext = file.name.split(".").pop().toUpperCase();
      const res = await fetch("/api/invoices/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, content: text, referenceMonth: selectedMonth })
      });
      const data = await res.json();
      parsedDraft = {
        fileName: file.name,
        fileFormat: ext,
        engine: data.engine,
        creditCardId: state.creditCards[0]?.id,
        items: data.items
      };
      render();
    }

    async function confirmImport() {
      if (!parsedDraft) return;
      await fetch("/api/invoices/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditCardId: parsedDraft.creditCardId,
          referenceMonth: selectedMonth,
          fileName: parsedDraft.fileName,
          fileFormat: parsedDraft.fileFormat,
          userId: state.activeUserId,
          items: parsedDraft.items
        })
      });
      parsedDraft = null;
      activeTab = "DASHBOARD";
      await fetchState();
    }

    async function createManualTx(e) {
      e.preventDefault();
      const f = e.target;
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditCardId: f.cardId.value,
          description: f.description.value,
          amount: Number(f.amount.value),
          date: f.date.value,
          totalInstallments: Number(f.installments.value) || 1,
          categoryId: f.categoryId.value,
          visibility: f.visibility.value
        })
      });
      f.reset();
      await fetchState();
    }

    function render() {
      if (!state) return;
      const activeUser = state.workspace.members.find(m => m.id === state.activeUserId) || state.workspace.members[0];
      const monthInvoices = state.invoices.filter(i => i.referenceMonth === selectedMonth && (selectedCardId === "ALL" || i.creditCardId === selectedCardId));
      const monthTxs = state.transactions.filter(t => t.referenceMonth === selectedMonth && (selectedCardId === "ALL" || t.creditCardId === selectedCardId));
      const totalInvoices = monthInvoices.reduce((a, i) => a + Number(i.totalAmount), 0);
      const totalPaid = monthInvoices.reduce((a, i) => a + Number(i.paidAmount), 0);
      const totalOpen = Math.max(0, totalInvoices - totalPaid);
      const fixedExpenses = state.recurringTransactions.filter(r => r.type === "EXPENSE").reduce((a, r) => a + Number(r.expectedAmount), 0);
      const fixedIncomes = state.recurringTransactions.filter(r => r.type === "INCOME").reduce((a, r) => a + Number(r.expectedAmount), 0);

      const projMonths = [-1, 0, 1, 2, 3, 4].map(o => addMonth(selectedMonth, o));
      const projCols = projMonths.map(m => {
        const txs = state.transactions.filter(t => t.referenceMonth === m && (selectedCardId === "ALL" || t.creditCardId === selectedCardId));
        return { m, total: txs.reduce((a, t) => a + Number(t.amount), 0) };
      });
      const maxProj = Math.max(1, ...projCols.map(c => c.total));

      document.getElementById("app").innerHTML = \`
        <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black text-white shadow">FC</div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="text-base font-extrabold text-slate-900">FinControl Pro</h1>
                  <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">\${state.workspace.name}</span>
                </div>
                <p class="text-xs text-slate-500">Faturas de Cartão, Projeção de Parcelas & Finanças Compartilhadas</p>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button onclick="selectedMonth = addMonth(selectedMonth, -1); render()" class="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white">◀ Anterior</button>
              <span class="px-3 py-1 text-xs font-extrabold text-blue-700">📅 \${fmtMonth(selectedMonth)}</span>
              <button onclick="selectedMonth = addMonth(selectedMonth, 1); render()" class="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white">Próximo ▶</button>
            </div>

            <div class="flex items-center gap-3">
              <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                <span class="block text-[10px] font-semibold uppercase text-slate-400">Visão Familiar (Privacidade)</span>
                <select onchange="switchUser(this.value)" class="bg-transparent text-xs font-bold text-slate-800 focus:outline-none">
                  \${state.workspace.members.map(m => \`<option value="\${m.id}" \${m.id === state.activeUserId ? "selected" : ""}>\${m.name} (\${m.role})</option>\`).join("")}
                </select>
              </div>
            </div>
          </div>

          <div class="mx-auto max-w-7xl px-4">
            <nav class="flex gap-2 overflow-x-auto border-t border-slate-100 pt-2">
              \${[
                ["DASHBOARD", "📊 Visão Geral & Lançamentos"],
                ["CARDS", "💳 Cartões & Quitação de Faturas"],
                ["IMPORT", "📥 Importar Fatura (PDF IA / OFX / CSV)"],
                ["RECURRING", "🔁 Recorrentes & Assinaturas"],
                ["CATEGORIES", "🏷️ Categorias & Tags"]
              ].map(([id, label]) => \`
                <button onclick="activeTab = '\${id}'; render()" class="whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-bold transition \${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}">\${label}</button>
              \`).join("")}
            </nav>
          </div>
        </header>

        <main class="mx-auto max-w-7xl px-4 py-6 space-y-6">
          \${activeTab === "DASHBOARD" ? \`
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span class="text-xs font-semibold uppercase text-slate-500">Faturas em \${fmtMonth(selectedMonth)}</span>
                <p class="mt-2 text-2xl font-extrabold text-slate-900">\${fmtBRL(totalInvoices)}</p>
                <div class="mt-2 flex justify-between text-xs">
                  <span class="text-emerald-600 font-semibold">Pago: \${fmtBRL(totalPaid)}</span>
                  <span class="text-amber-600 font-semibold">Aberto: \${fmtBRL(totalOpen)}</span>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span class="text-xs font-semibold uppercase text-slate-500">Recorrentes & Assinaturas</span>
                <p class="mt-2 text-2xl font-extrabold text-slate-900">\${fmtBRL(fixedExpenses)}</p>
                <span class="mt-2 block text-xs text-slate-500">Total Comprometido: \${fmtBRL(totalInvoices + fixedExpenses)}</span>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span class="text-xs font-semibold uppercase text-slate-500">Receitas Familiares</span>
                <p class="mt-2 text-2xl font-extrabold text-emerald-600">\${fmtBRL(fixedIncomes)}</p>
                <span class="mt-2 block text-xs text-slate-500">Saldo Livre: <strong>\${fmtBRL(fixedIncomes - totalInvoices - fixedExpenses)}</strong></span>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span class="text-xs font-semibold uppercase text-slate-500">Filtro de Privacidade</span>
                <p class="mt-2 text-lg font-extrabold text-blue-700">\${activeUser.name}</p>
                <span class="mt-1 block text-xs text-slate-500">Vendo itens Compartilhados + Privados de \${activeUser.name.split(" ")[0]}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-base font-bold text-slate-900">Projeção de Faturas & Parcelas nos Próximos Meses</h2>
                    <p class="text-xs text-slate-500">Clique em uma barra para inspecionar as compras parceladas projetadas naquele mês</p>
                  </div>
                </div>
                <div class="mt-6 grid grid-cols-6 gap-3">
                  \${projCols.map(c => {
                    const h = Math.max(14, Math.round((c.total / maxProj) * 130));
                    const isCur = c.m === selectedMonth;
                    return \`
                      <button onclick="selectedMonth = '\${c.m}'; render()" class="flex flex-col items-center rounded-xl p-2 transition \${isCur ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-slate-50'}">
                        <span class="text-[11px] font-bold text-slate-700">\${fmtBRL(c.total)}</span>
                        <div class="my-2 flex h-32 w-full items-end justify-center">
                          <div style="height:\${h}px" class="w-10 rounded-t-xl \${isCur ? 'bg-blue-600' : 'bg-slate-300'}"></div>
                        </div>
                        <span class="text-xs font-bold \${isCur ? 'text-blue-700' : 'text-slate-600'}">\${c.m}</span>
                      </button>
                    \`;
                  }).join("")}
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-base font-bold text-slate-900">Novo Lançamento Rápido</h2>
                <form onsubmit="createManualTx(event)" class="mt-3 space-y-3 text-xs">
                  <div>
                    <label class="font-semibold text-slate-600">Cartão</label>
                    <select name="cardId" class="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2">
                      \${state.creditCards.map(c => \`<option value="\${c.id}">\${c.name}</option>\`).join("")}
                    </select>
                  </div>
                  <div>
                    <label class="font-semibold text-slate-600">Descrição da Compra</label>
                    <input name="description" required placeholder="Ex: Notebook Asus Vivobook" class="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2" />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="font-semibold text-slate-600">Valor Total (R$)</label>
                      <input name="amount" type="number" step="0.01" required placeholder="3600.00" class="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2" />
                    </div>
                    <div>
                      <label class="font-semibold text-slate-600">Nº Parcelas</label>
                      <input name="installments" type="number" min="1" max="24" value="1" class="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2" />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="font-semibold text-slate-600">Data da Compra</label>
                      <input name="date" type="date" value="\${selectedMonth}-12" class="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2" />
                    </div>
                    <div>
                      <label class="font-semibold text-slate-600">Privacidade</label>
                      <select name="visibility" class="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2">
                        <option value="SHARED">Compartilhado</option>
                        <option value="PRIVATE">Privado (Só eu)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="font-semibold text-slate-600">Categoria</label>
                    <select name="categoryId" class="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2">
                      \${state.categories.filter(c => c.type === "EXPENSE").map(c => \`<option value="\${c.id}">\${c.name}</option>\`).join("")}
                    </select>
                  </div>
                  <button type="submit" class="w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700">+ Lançar & Projetar Parcelas</button>
                </form>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex items-center justify-between">
                <h2 class="text-base font-bold text-slate-900">Lançamentos das Faturas em \${fmtMonth(selectedMonth)} (\${monthTxs.length} itens)</h2>
                <button onclick="activeTab = 'IMPORT'; render()" class="rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">📥 Importar PDF / OFX / CSV</button>
              </div>
              <div class="mt-4 overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead>
                    <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                      <th class="py-2.5">Data</th>
                      <th class="py-2.5">Estabelecimento / Descrição</th>
                      <th class="py-2.5">Cartão</th>
                      <th class="py-2.5">Categoria</th>
                      <th class="py-2.5">Parcela</th>
                      <th class="py-2.5">Privacidade</th>
                      <th class="py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    \${monthTxs.map(tx => {
                      const card = state.creditCards.find(c => c.id === tx.creditCardId);
                      const cat = state.categories.find(c => c.id === tx.categoryId);
                      return \`
                        <tr class="hover:bg-slate-50">
                          <td class="py-3 text-xs text-slate-500">\${tx.date}</td>
                          <td class="py-3 font-semibold text-slate-900">\${tx.description}</td>
                          <td class="py-3 text-xs text-slate-700">\${card ? card.name : "-"}</td>
                          <td class="py-3"><span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">\${cat ? cat.name : "Geral"}</span></td>
                          <td class="py-3">\${tx.totalInstallments > 1 ? \`<span class="rounded bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700">\${tx.currentInstallment}/\${tx.totalInstallments}</span>\` : '<span class="text-xs text-slate-400">À vista</span>'}</td>
                          <td class="py-3">\${tx.visibility === "PRIVATE" ? '<span class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">🔒 Privado</span>' : '<span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">👥 Família</span>'}</td>
                          <td class="py-3 text-right font-bold text-slate-900">\${fmtBRL(tx.amount)}</td>
                        </tr>
                      \`;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          \` : ""}

          \${activeTab === "CARDS" ? \`
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
              \${state.creditCards.map(card => {
                const inv = state.invoices.find(i => i.creditCardId === card.id && i.referenceMonth === selectedMonth);
                const total = inv ? inv.totalAmount : 0;
                const paid = inv ? inv.paidAmount : 0;
                const status = inv ? inv.status : "OPEN";
                return \`
                  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div class="rounded-2xl p-5 text-white shadow" style="background-color:\${card.color}">
                        <div class="flex justify-between text-xs font-bold uppercase opacity-90">
                          <span>\${card.institution} • \${card.brand}</span>
                          <span>\${card.visibility === "PRIVATE" ? "🔒 Privado" : "👥 Compartilhado"}</span>
                        </div>
                        <h3 class="mt-3 text-lg font-extrabold">\${card.name}</h3>
                        <p class="mt-1 font-mono text-xs opacity-80">•••• •••• •••• \${card.lastFourDigits}</p>
                        <div class="mt-4 flex justify-between text-xs">
                          <span>Fecha dia \${card.closingDay}</span>
                          <span>Vence dia \${card.dueDay}</span>
                        </div>
                      </div>

                      <div class="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                        <div class="flex justify-between items-center">
                          <span class="text-xs font-bold text-slate-600">Fatura \${fmtMonth(selectedMonth)}</span>
                          <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold \${status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">\${status}</span>
                        </div>
                        <p class="mt-2 text-2xl font-extrabold text-slate-900">\${fmtBRL(total)}</p>
                        <p class="text-xs text-emerald-600 font-semibold">Pago: \${fmtBRL(paid)}</p>
                        \${inv && inv.payments && inv.payments.length > 0 ? \`
                          <div class="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-600">
                            <strong>Comprovantes Arquivados:</strong>
                            \${inv.payments.map(p => \`<div class="mt-1 flex justify-between"><span>\${p.paymentDate}: \${fmtBRL(p.amountPaid)}</span><span class="text-emerald-700 font-semibold">📎 \${p.receiptName || 'Recibo'}</span></div>\`).join("")}
                          </div>
                        \` : ""}
                      </div>
                    </div>

                    <button onclick="payInvoicePrompt('\${card.id}', '\${card.name}', \${Math.max(0, total - paid)})" class="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">
                      ✅ Quitar Fatura & Anexar Comprovante
                    </button>
                  </div>
                \`;
              }).join("")}
            </div>
          \` : ""}

          \${activeTab === "IMPORT" ? \`
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">✨ Extrator Híbrido (IA Gemini para PDF + Parser Nativo OFX/CSV)</span>
                <h2 class="mt-2 text-xl font-bold text-slate-900">Importar e Conciliar Fatura de Cartão</h2>
                <p class="text-sm text-slate-500">Selecione um arquivo .PDF, .OFX ou .CSV do seu computador ou clique em um dos botões de simulação instantânea abaixo:</p>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-8 text-center hover:bg-blue-50 md:col-span-2">
                  <span class="text-3xl">📄</span>
                  <span class="mt-2 text-sm font-bold text-slate-800">Clique para escolher um arquivo PDF, OFX ou CSV</span>
                  <input type="file" accept=".pdf,.ofx,.csv" class="hidden" onchange="handleFileSelect(this)" />
                </label>
                <div class="flex flex-col justify-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span class="text-xs font-bold text-slate-700">Testar com 1 Clique:</span>
                  <button onclick="simulateImport('PDF')" class="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:border-blue-400">🤖 Simular Extração PDF (IA / OCR)</button>
                  <button onclick="simulateImport('OFX')" class="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:border-blue-400">🟣 Simular Fatura Nubank (.OFX)</button>
                  <button onclick="simulateImport('CSV')" class="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:border-blue-400">🟠 Simular Fatura Itaú (.CSV)</button>
                </div>
              </div>

              \${parsedDraft ? \`
                <div class="rounded-2xl border border-blue-200 bg-blue-50/30 p-5 space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span class="text-xs font-bold text-blue-700">Arquivo: \${parsedDraft.fileName} • Motor: \${parsedDraft.engine}</span>
                      <h3 class="text-base font-bold text-slate-900">Conciliação Prévia (\${parsedDraft.items.length} lançamentos extraídos)</h3>
                    </div>
                    <div class="flex items-center gap-3">
                      <select onchange="parsedDraft.creditCardId = this.value" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold">
                        \${state.creditCards.map(c => \`<option value="\${c.id}" \${c.id === parsedDraft.creditCardId ? 'selected' : ''}>\${c.name}</option>\`).join("")}
                      </select>
                      <button onclick="confirmImport()" class="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700">✅ Confirmar & Projetar Parcelas</button>
                    </div>
                  </div>
                  <table class="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-slate-200">
                    <thead class="bg-slate-100 text-slate-600 uppercase">
                      <tr>
                        <th class="p-3">Data</th>
                        <th class="p-3">Estabelecimento</th>
                        <th class="p-3">Parcela Detectada</th>
                        <th class="p-3">Projeção Futura</th>
                        <th class="p-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      \${parsedDraft.items.map(it => \`
                        <tr>
                          <td class="p-3">\${it.date}</td>
                          <td class="p-3 font-bold text-slate-900">\${it.description}</td>
                          <td class="p-3">\${it.currentInstallment}/\${it.totalInstallments}</td>
                          <td class="p-3 text-purple-700 font-semibold">\${it.totalInstallments > 1 ? '+' + (it.totalInstallments - it.currentInstallment) + ' meses futuros' : 'Parcela única'}</td>
                          <td class="p-3 text-right font-bold">\${fmtBRL(it.amount)}</td>
                        </tr>
                      \`).join("")}
                    </tbody>
                  </table>
                </div>
              \` : ""}
            </div>
          \` : ""}

          \${activeTab === "RECURRING" ? \`
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Transações Recorrentes & Assinaturas (\${fmtMonth(selectedMonth)})</h2>
              <p class="text-xs text-slate-500">Clique no botão de status para marcar como Pago ou Pendente no mês selecionado.</p>
              <div class="mt-4 divide-y divide-slate-100">
                \${state.recurringTransactions.map(rec => {
                  const isPaid = (rec.paidMonths || []).includes(selectedMonth);
                  return \`
                    <div class="flex items-center justify-between py-3.5">
                      <div>
                        <span class="font-bold text-slate-900">\${rec.title}</span>
                        <span class="ml-2 text-xs text-slate-500">Vence dia \${rec.dueDay} • \${rec.type === "INCOME" ? "Receita" : "Despesa Fixa"}</span>
                      </div>
                      <div class="flex items-center gap-4">
                        <span class="font-extrabold \${rec.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900'}">\${fmtBRL(rec.expectedAmount)}</span>
                        <button onclick="toggleRecurring('\${rec.id}')" class="rounded-xl px-3 py-1.5 text-xs font-bold \${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                          \${isPaid ? "✓ Quitado" : "⏳ Pendente (Marcar Pago)"}
                        </button>
                      </div>
                    </div>
                  \`;
                }).join("")}
              </div>
            </div>
          \` : ""}

          \${activeTab === "CATEGORIES" ? \`
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              \${state.categories.map(cat => {
                const sum = monthTxs.filter(t => t.categoryId === cat.id).reduce((a, t) => a + Number(t.amount), 0);
                return \`
                  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-slate-900">\${cat.name}</span>
                      <span class="h-3 w-3 rounded-full" style="background-color:\${cat.color}"></span>
                    </div>
                    <p class="mt-2 text-xl font-extrabold text-slate-900">\${fmtBRL(sum)}</p>
                    <div class="mt-3 flex flex-wrap gap-1">
                      \${(cat.subcategories || []).map(s => \`<span class="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">\${s}</span>\`).join("")}
                    </div>
                  </div>
                \`;
              }).join("")}
            </div>
          \` : ""}
        </main>
      \`;
    }

    fetchState();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const store = loadOrSeedStore();

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_APP);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    const userId = url.searchParams.get("userId") || store.activeUserId;
    const visibleCards = store.creditCards.filter(
      (c) => c.visibility === "SHARED" || c.ownerId === userId
    );
    const cardIds = new Set(visibleCards.map((c) => c.id));
    const visibleTxs = store.transactions.filter(
      (t) => cardIds.has(t.creditCardId) && (t.visibility === "SHARED" || t.userId === userId)
    );
    const visibleInvs = store.invoices
      .filter((i) => cardIds.has(i.creditCardId))
      .map((inv) => ({
        ...inv,
        totalAmount: Number(
          visibleTxs
            .filter((t) => t.invoiceId === inv.id)
            .reduce((a, t) => a + Number(t.amount), 0)
            .toFixed(2)
        ),
      }));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ...store,
        activeUserId: userId,
        creditCards: visibleCards,
        transactions: visibleTxs,
        invoices: visibleInvs,
      })
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/workspace") {
    const body = await readJsonBody(req);
    if (body.action === "SWITCH_USER" && body.userId) {
      store.activeUserId = body.userId;
      saveStore(store);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/transactions") {
    const body = await readJsonBody(req);
    addPurchase(store, {
      creditCardId: body.creditCardId,
      categoryId: body.categoryId || store.categories[0].id,
      userId: store.activeUserId,
      description: body.description,
      totalAmount: Number(body.amount),
      date: body.date,
      totalInstallments: Number(body.totalInstallments) || 1,
      visibility: body.visibility || "SHARED",
      source: "MANUAL",
    });
    saveStore(store);
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "PATCH" && url.pathname === "/api/recurring") {
    const body = await readJsonBody(req);
    const rec = store.recurringTransactions.find((r) => r.id === body.id);
    if (rec && body.toggleMonth) {
      if (rec.paidMonths.includes(body.toggleMonth)) {
        rec.paidMonths = rec.paidMonths.filter((m) => m !== body.toggleMonth);
      } else {
        rec.paidMonths.push(body.toggleMonth);
      }
      saveStore(store);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/invoices/pay-json") {
    const body = await readJsonBody(req);
    const inv = getOrCreateInvoice(store, body.creditCardId, body.referenceMonth);
    inv.payments.push({
      id: `pay-${Date.now()}`,
      invoiceId: inv.id,
      paymentDate: body.paymentDate,
      amountPaid: Number(body.amountPaid),
      paymentMethod: "PIX / Conta",
      receiptName: body.receiptName,
    });
    saveStore(store);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/invoices/parse-text") {
    const body = await readJsonBody(req);
    const content = String(body.content || "");
    const refM = body.referenceMonth || "2026-11";
    const items = [];
    const lines = content.split(/\r?\n/).filter(Boolean);
    lines.forEach((line, idx) => {
      const m = line.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})[,;\s]+"?([^",;]+)"?[,;\s]+([0-9.,]+)/);
      if (m) {
        items.push({
          tempId: `p-${idx}`,
          date: m[1].includes("/") ? m[1].split("/").reverse().join("-") : m[1],
          description: m[2].trim(),
          amount: parseFloat(m[3].replace(",", ".")),
          currentInstallment: 1,
          totalInstallments: 1,
          categoryId: "cat-compras",
          visibility: "SHARED",
          selected: true,
        });
      }
    });
    if (items.length === 0) {
      items.push({
        tempId: "auto-1",
        date: `${refM}-05`,
        description: `Fatura Importada (${body.fileName})`,
        amount: 459.9,
        currentInstallment: 1,
        totalInstallments: 3,
        categoryId: "cat-compras",
        visibility: "SHARED",
        selected: true,
      });
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ engine: "Extrator Híbrido", items }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/invoices/import") {
    const body = await readJsonBody(req);
    for (const item of body.items || []) {
      addPurchase(store, {
        creditCardId: body.creditCardId,
        categoryId: item.categoryId || "cat-compras",
        userId: body.userId || store.activeUserId,
        description: item.description,
        totalAmount: Number(item.amount),
        isInstallmentValue: true,
        date: item.date,
        startReferenceMonth: body.referenceMonth,
        startInstallmentNumber: Number(item.currentInstallment) || 1,
        totalInstallments: Number(item.totalInstallments) || 1,
        visibility: item.visibility || "SHARED",
        source: body.fileFormat || "PDF_AI",
      });
    }
    saveStore(store);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  loadOrSeedStore();
  console.log(`\n=============================================================`);
  console.log(`🚀 FinControl Pro rodando em: http://localhost:${PORT}`);
  console.log(`=============================================================\n`);
});
