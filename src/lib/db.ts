import fs from "fs";
import path from "path";
import {
  DatabaseStore,
  CreditCard,
  Invoice,
  Transaction,
  Category,
  Tag,
  RecurringTransaction,
  AppNotification,
  Visibility,
  TransactionSource,
} from "./types";
import {
  addMonthsToReference,
  buildInvoiceDates,
  calculateInvoiceMonthForPurchase,
} from "./utils";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function createInitialSeed(): DatabaseStore {
  const workspaceId = "ws-familia-silva";
  const userGustavoId = "usr-gustavo";
  const userMarinaId = "usr-marina";

  const categories: Category[] = [
    {
      id: "cat-alimentacao",
      workspaceId,
      name: "Alimentação",
      icon: "Utensils",
      color: "#f97316",
      type: "EXPENSE",
      subcategories: ["Supermercado", "Restaurantes", "Delivery / iFood", "Padaria & Café"],
    },
    {
      id: "cat-moradia",
      workspaceId,
      name: "Moradia & Contas",
      icon: "Home",
      color: "#3b82f6",
      type: "EXPENSE",
      subcategories: ["Aluguel / Financiamento", "Condomínio", "Energia Elétrica", "Internet & TV", "Manutenção"],
    },
    {
      id: "cat-transporte",
      workspaceId,
      name: "Transporte",
      icon: "Car",
      color: "#eab308",
      type: "EXPENSE",
      subcategories: ["Combustível", "Uber / 99", "Estacionamento & Pedágio", "Seguro & IPVA"],
    },
    {
      id: "cat-assinaturas",
      workspaceId,
      name: "Assinaturas & Serviços",
      icon: "Tv",
      color: "#8b5cf6",
      type: "EXPENSE",
      subcategories: ["Streaming Vídeo", "Streaming Música", "Software & Nuvem", "Clubes & Academias"],
    },
    {
      id: "cat-compras",
      workspaceId,
      name: "Compras & Eletrônicos",
      icon: "ShoppingBag",
      color: "#ec4899",
      type: "EXPENSE",
      subcategories: ["Eletrônicos", "Vestuário", "Eletrodomésticos", "Presentes"],
    },
    {
      id: "cat-saude",
      workspaceId,
      name: "Saúde & Bem-estar",
      icon: "HeartPulse",
      color: "#10b981",
      type: "EXPENSE",
      subcategories: ["Farmácia", "Plano de Saúde", "Consultas & Exames"],
    },
    {
      id: "cat-lazer",
      workspaceId,
      name: "Lazer & Viagens",
      icon: "Plane",
      color: "#06b6d4",
      type: "EXPENSE",
      subcategories: ["Passagens Aéreas", "Hospedagem", "Cinema & Eventos"],
    },
    {
      id: "cat-receitas",
      workspaceId,
      name: "Receitas & Salário",
      icon: "Wallet",
      color: "#22c55e",
      type: "INCOME",
      subcategories: ["Salário", "Freelance / PJ", "Dividendos", "Reembolsos"],
    },
  ];

  const tags: Tag[] = [
    { id: "tag-1", workspaceId, name: "essencial", color: "#3b82f6" },
    { id: "tag-2", workspaceId, name: "parcelado", color: "#8b5cf6" },
    { id: "tag-3", workspaceId, name: "casa", color: "#10b981" },
    { id: "tag-4", workspaceId, name: "viagem-ferias", color: "#06b6d4" },
    { id: "tag-5", workspaceId, name: "assinatura", color: "#f59e0b" },
    { id: "tag-6", workspaceId, name: "pessoal", color: "#ec4899" },
  ];

  const creditCards: CreditCard[] = [
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
      createdAt: "2026-01-10T10:00:00Z",
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
      createdAt: "2026-01-15T10:00:00Z",
    },
    {
      id: "card-inter-privado",
      workspaceId,
      ownerId: userGustavoId,
      name: "Inter Black (Pessoal Gustavo)",
      institution: "Banco Inter",
      lastFourDigits: "3371",
      brand: "Mastercard",
      creditLimit: 9000,
      closingDay: 5,
      dueDay: 12,
      color: "#f97316",
      visibility: "PRIVATE",
      createdAt: "2026-02-01T10:00:00Z",
    },
  ];

  const store: DatabaseStore = {
    workspace: {
      id: workspaceId,
      name: "Família Silva",
      type: "FAMILY",
      createdAt: "2026-01-01T00:00:00Z",
      members: [
        {
          id: userGustavoId,
          name: "Gustavo Silva",
          email: "gustavo@controlefinanceiro.local",
          role: "OWNER",
        },
        {
          id: userMarinaId,
          name: "Marina Silva",
          email: "marina@controlefinanceiro.local",
          role: "MEMBER",
        },
      ],
    },
    activeUserId: userGustavoId,
    creditCards,
    categories,
    tags,
    invoices: [],
    transactions: [],
    recurringTransactions: [
      {
        id: "rec-aluguel",
        workspaceId,
        categoryId: "cat-moradia",
        subcategory: "Aluguel / Financiamento",
        userId: userGustavoId,
        title: "Aluguel + Condomínio Residencial",
        type: "EXPENSE",
        expectedAmount: 3450,
        frequency: "MONTHLY",
        dueDay: 10,
        startDate: "2026-01-10",
        notifyDueDate: true,
        daysBeforeAlert: 3,
        visibility: "SHARED",
        paidMonths: ["2026-09", "2026-10", "2026-11"],
        tags: ["essencial", "casa"],
        active: true,
        createdAt: "2026-01-01T10:00:00Z",
      },
      {
        id: "rec-fibra",
        workspaceId,
        categoryId: "cat-moradia",
        subcategory: "Internet & TV",
        userId: userGustavoId,
        title: "Vivo Fibra 700 Mega",
        type: "EXPENSE",
        expectedAmount: 149.9,
        frequency: "MONTHLY",
        dueDay: 22,
        startDate: "2026-01-22",
        notifyDueDate: true,
        daysBeforeAlert: 3,
        visibility: "SHARED",
        paidMonths: ["2026-09", "2026-10"],
        tags: ["essencial", "casa"],
        active: true,
        createdAt: "2026-01-05T10:00:00Z",
      },
      {
        id: "rec-netflix",
        workspaceId,
        categoryId: "cat-assinaturas",
        subcategory: "Streaming Vídeo",
        userId: userMarinaId,
        title: "Netflix 4K Ultra HD",
        type: "EXPENSE",
        expectedAmount: 59.9,
        frequency: "MONTHLY",
        dueDay: 24,
        startDate: "2026-01-24",
        notifyDueDate: true,
        daysBeforeAlert: 2,
        visibility: "SHARED",
        autoDebitCardId: "card-nubank",
        paidMonths: ["2026-09", "2026-10"],
        tags: ["assinatura"],
        active: true,
        createdAt: "2026-01-05T10:00:00Z",
      },
      {
        id: "rec-energia",
        workspaceId,
        categoryId: "cat-moradia",
        subcategory: "Energia Elétrica",
        userId: userMarinaId,
        title: "Enel Energia Elétrica",
        type: "EXPENSE",
        expectedAmount: 285.4,
        frequency: "MONTHLY",
        dueDay: 26,
        startDate: "2026-01-26",
        notifyDueDate: true,
        daysBeforeAlert: 3,
        visibility: "SHARED",
        paidMonths: ["2026-09", "2026-10"],
        tags: ["essencial", "casa"],
        active: true,
        createdAt: "2026-01-05T10:00:00Z",
      },
      {
        id: "rec-salario-gustavo",
        workspaceId,
        categoryId: "cat-receitas",
        subcategory: "Salário",
        userId: userGustavoId,
        title: "Salário Mensal Gustavo",
        type: "INCOME",
        expectedAmount: 12500,
        frequency: "MONTHLY",
        dueDay: 5,
        startDate: "2026-01-05",
        notifyDueDate: false,
        daysBeforeAlert: 1,
        visibility: "SHARED",
        paidMonths: ["2026-09", "2026-10", "2026-11"],
        tags: ["essencial"],
        active: true,
        createdAt: "2026-01-01T10:00:00Z",
      },
      {
        id: "rec-salario-marina",
        workspaceId,
        categoryId: "cat-receitas",
        subcategory: "Salário",
        userId: userMarinaId,
        title: "Salário Mensal Marina",
        type: "INCOME",
        expectedAmount: 9800,
        frequency: "MONTHLY",
        dueDay: 5,
        startDate: "2026-01-05",
        notifyDueDate: false,
        daysBeforeAlert: 1,
        visibility: "SHARED",
        paidMonths: ["2026-09", "2026-10", "2026-11"],
        tags: ["essencial"],
        active: true,
        createdAt: "2026-01-01T10:00:00Z",
      },
    ],
    notifications: [
      {
        id: "notif-1",
        workspaceId,
        title: "Fatura Nubank Ultravioleta fechada",
        message: "A fatura de Novembro/2026 fechou em R$ 3.648,80 e vence no dia 25/11/2026.",
        type: "INVOICE_DUE",
        dueDate: "2026-11-25",
        emailSent: true,
        read: false,
        createdAt: "2026-11-18T12:00:00Z",
      },
      {
        id: "notif-2",
        workspaceId,
        title: "Conta próxima do vencimento: Vivo Fibra 700 Mega",
        message: "Vence em 22/11/2026 no valor estimado de R$ 149,90.",
        type: "RECURRING_DUE",
        dueDate: "2026-11-22",
        emailSent: false,
        read: false,
        createdAt: "2026-11-19T09:00:00Z",
      },
    ],
    settings: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      storageProvider:
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "SUPABASE_STORAGE"
          : "LOCAL_DISK",
      notificationEmail: "gustavo@controlefinanceiro.local",
    },
  };

  // Popular transações realistas com projeção de parcelas
  addPurchaseWithInstallments(store, {
    creditCardId: "card-nubank",
    categoryId: "cat-compras",
    subcategory: "Eletrônicos",
    userId: userGustavoId,
    description: "MacBook Air M3 - Apple Store",
    merchant: "Apple Store Brasil",
    totalAmount: 9600,
    date: "2026-09-12",
    startReferenceMonth: "2026-09",
    totalInstallments: 10,
    tags: ["parcelado"],
    visibility: "SHARED",
    source: "PDF_AI",
  });

  addPurchaseWithInstallments(store, {
    creditCardId: "card-nubank",
    categoryId: "cat-compras",
    subcategory: "Eletrodomésticos",
    userId: userMarinaId,
    description: "Geladeira Brastemp Frost Free Inverse",
    merchant: "Fast Shop",
    totalAmount: 4800,
    date: "2026-10-08",
    startReferenceMonth: "2026-10",
    totalInstallments: 6,
    tags: ["parcelado", "casa"],
    visibility: "SHARED",
    source: "PDF_AI",
  });

  addPurchaseWithInstallments(store, {
    creditCardId: "card-nubank",
    categoryId: "cat-alimentacao",
    subcategory: "Supermercado",
    userId: userMarinaId,
    description: "Pão de Açúcar Supermercados",
    merchant: "Pão de Açúcar",
    totalAmount: 1189.4,
    date: "2026-11-04",
    startReferenceMonth: "2026-11",
    totalInstallments: 1,
    tags: ["essencial", "casa"],
    visibility: "SHARED",
    source: "OFX",
  });

  addPurchaseWithInstallments(store, {
    creditCardId: "card-nubank",
    categoryId: "cat-alimentacao",
    subcategory: "Delivery / iFood",
    userId: userGustavoId,
    description: "iFood *Restaurante Coco Bambu",
    merchant: "iFood",
    totalAmount: 264.5,
    date: "2026-11-11",
    startReferenceMonth: "2026-11",
    totalInstallments: 1,
    tags: [],
    visibility: "SHARED",
    source: "OFX",
  });

  addPurchaseWithInstallments(store, {
    creditCardId: "card-nubank",
    categoryId: "cat-transporte",
    subcategory: "Combustível",
    userId: userGustavoId,
    description: "Posto Shell Select Ipiranga",
    merchant: "Shell",
    totalAmount: 315.0,
    date: "2026-11-14",
    startReferenceMonth: "2026-11",
    totalInstallments: 1,
    tags: ["essencial"],
    visibility: "SHARED",
    source: "OFX",
  });

  addPurchaseWithInstallments(store, {
    creditCardId: "card-nubank",
    categoryId: "cat-assinaturas",
    subcategory: "Streaming Vídeo",
    userId: userMarinaId,
    description: "Netflix.com Assinatura Mensal",
    merchant: "Netflix",
    totalAmount: 59.9,
    date: "2026-11-15",
    startReferenceMonth: "2026-11",
    totalInstallments: 1,
    tags: ["assinatura"],
    visibility: "SHARED",
    source: "OFX",
  });

  addPurchaseWithInstallments(store, {
    creditCardId: "card-nubank",
    categoryId: "cat-saude",
    subcategory: "Farmácia",
    userId: userMarinaId,
    description: "Droga Raia Matriz",
    merchant: "Droga Raia",
    totalAmount: 60.0,
    date: "2026-11-16",
    startReferenceMonth: "2026-11",
    totalInstallments: 1,
    tags: ["essencial"],
    visibility: "SHARED",
    source: "MANUAL",
  });

  // Cartão Itaú Personnalité
  addPurchaseWithInstallments(store, {
    creditCardId: "card-itau",
    categoryId: "cat-lazer",
    subcategory: "Passagens Aéreas",
    userId: userMarinaId,
    description: "LATAM Airlines - Férias Nordeste",
    merchant: "LATAM Airlines",
    totalAmount: 3600,
    date: "2026-10-03",
    startReferenceMonth: "2026-10",
    totalInstallments: 4,
    tags: ["viagem-ferias", "parcelado"],
    visibility: "SHARED",
    source: "PDF_AI",
  });

  addPurchaseWithInstallments(store, {
    creditCardId: "card-itau",
    categoryId: "cat-alimentacao",
    subcategory: "Supermercado",
    userId: userMarinaId,
    description: "Sam's Club Atacado",
    merchant: "Sam's Club",
    totalAmount: 845.2,
    date: "2026-11-02",
    startReferenceMonth: "2026-11",
    totalInstallments: 1,
    tags: ["essencial", "casa"],
    visibility: "SHARED",
    source: "CSV",
  });

  // Cartão Privado Gustavo (Inter Black)
  addPurchaseWithInstallments(store, {
    creditCardId: "card-inter-privado",
    categoryId: "cat-compras",
    subcategory: "Presentes",
    userId: userGustavoId,
    description: "Joalheria Vivara - Presente Aniversário Surpresa",
    merchant: "Vivara",
    totalAmount: 1500,
    date: "2026-11-01",
    startReferenceMonth: "2026-11",
    totalInstallments: 3,
    tags: ["pessoal", "parcelado"],
    visibility: "PRIVATE",
    source: "MANUAL",
  });

  // Marcar faturas de 2026-09 e 2026-10 como PAGAS e a do Itaú de 2026-11 como PAGA com comprovante
  for (const inv of store.invoices) {
    if (inv.referenceMonth === "2026-09" || inv.referenceMonth === "2026-10") {
      inv.status = "PAID";
      inv.paidAmount = inv.totalAmount;
      inv.payments = [
        {
          id: `pay-${inv.id}`,
          invoiceId: inv.id,
          paymentDate: inv.dueDate,
          amountPaid: inv.totalAmount,
          paymentMethod: "PIX / Débito Automático",
          receiptName: `comprovante_${inv.referenceMonth}.pdf`,
          notes: "Pagamento integral liquidado no vencimento.",
          createdAt: `${inv.dueDate}T14:00:00Z`,
        },
      ];
    } else if (inv.referenceMonth === "2026-11" && inv.creditCardId === "card-itau") {
      inv.status = "PAID";
      inv.paidAmount = inv.totalAmount;
      inv.payments = [
        {
          id: `pay-${inv.id}`,
          invoiceId: inv.id,
          paymentDate: "2026-11-16",
          amountPaid: inv.totalAmount,
          paymentMethod: "Débito em Conta Itaú",
          receiptName: "comprovante_itau_nov2026.pdf",
          notes: "Fatura quitada um dia antes do vencimento.",
          createdAt: "2026-11-16T10:30:00Z",
        },
      ];
    } else if (inv.referenceMonth === "2026-11" && inv.creditCardId === "card-nubank") {
      inv.status = "CLOSED";
      inv.fileName = "fatura_nubank_2026_11.pdf";
    }
  }

  return store;
}

export function getOrCreateInvoice(
  store: DatabaseStore,
  creditCardId: string,
  referenceMonth: string
): Invoice {
  let invoice = store.invoices.find(
    (i) => i.creditCardId === creditCardId && i.referenceMonth === referenceMonth
  );

  if (!invoice) {
    const card = store.creditCards.find((c) => c.id === creditCardId);
    const closingDay = card?.closingDay ?? 15;
    const dueDay = card?.dueDay ?? 22;
    const { closingDate, dueDate } = buildInvoiceDates(referenceMonth, closingDay, dueDay);

    invoice = {
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
    store.invoices.push(invoice);
  }

  return invoice;
}

export function recalculateInvoiceTotals(store: DatabaseStore): void {
  for (const inv of store.invoices) {
    const txs = store.transactions.filter((t) => t.invoiceId === inv.id);
    const sum = txs.reduce((acc, t) => acc + Number(t.amount), 0);
    inv.totalAmount = Number(sum.toFixed(2));

    const paidSum = inv.payments.reduce((acc, p) => acc + Number(p.amountPaid), 0);
    inv.paidAmount = Number(paidSum.toFixed(2));

    if (inv.paidAmount >= inv.totalAmount && inv.totalAmount > 0) {
      inv.status = "PAID";
    } else if (inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount) {
      inv.status = "PARTIALLY_PAID";
    }
  }
}

export interface AddPurchaseInput {
  creditCardId: string;
  categoryId: string;
  subcategory?: string;
  userId: string;
  description: string;
  merchant?: string;
  totalAmount: number;
  isInstallmentValue?: boolean; // se true, totalAmount já é o valor da parcela individual
  date: string;
  startReferenceMonth?: string;
  startInstallmentNumber?: number;
  totalInstallments: number;
  tags: string[];
  visibility: Visibility;
  source: TransactionSource;
  projectRemaining?: boolean;
}

export function addPurchaseWithInstallments(
  store: DatabaseStore,
  input: AddPurchaseInput
): Transaction[] {
  const card = store.creditCards.find((c) => c.id === input.creditCardId);
  const closingDay = card?.closingDay ?? 15;

  const firstRefMonth =
    input.startReferenceMonth ||
    calculateInvoiceMonthForPurchase(input.date, closingDay);

  const totalInst = Math.max(1, input.totalInstallments || 1);
  const startInst = Math.max(1, input.startInstallmentNumber || 1);
  const projectFuture = input.projectRemaining !== false;

  const installmentAmount = input.isInstallmentValue
    ? Number(Number(input.totalAmount).toFixed(2))
    : Number((Number(input.totalAmount) / totalInst).toFixed(2));

  const groupId = totalInst > 1 ? `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : undefined;
  const createdTransactions: Transaction[] = [];

  const endInst = projectFuture ? totalInst : startInst;

  for (let inst = startInst; inst <= endInst; inst++) {
    const monthOffset = inst - startInst;
    const targetRefMonth = addMonthsToReference(firstRefMonth, monthOffset);
    const invoice = getOrCreateInvoice(store, input.creditCardId, targetRefMonth);

    const tx: Transaction = {
      id: `tx-${Date.now()}-${inst}-${Math.random().toString(36).slice(2, 7)}`,
      invoiceId: invoice.id,
      creditCardId: input.creditCardId,
      categoryId: input.categoryId,
      subcategory: input.subcategory,
      userId: input.userId,
      description: input.description,
      merchant: input.merchant || input.description,
      amount: installmentAmount,
      date: input.date,
      referenceMonth: targetRefMonth,
      currentInstallment: inst,
      totalInstallments: totalInst,
      installmentGroupId: groupId,
      tags: input.tags || [],
      visibility: card?.visibility === "PRIVATE" ? "PRIVATE" : input.visibility,
      source: input.source,
      createdAt: new Date().toISOString(),
    };

    store.transactions.push(tx);
    createdTransactions.push(tx);
  }

  recalculateInvoiceTotals(store);
  return createdTransactions;
}

export function readStore(): DatabaseStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    const seed = createInitialSeed();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as DatabaseStore;
    parsed.settings = {
      ...parsed.settings,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY) || parsed.settings?.geminiConfigured,
      resendConfigured: Boolean(process.env.RESEND_API_KEY) || parsed.settings?.resendConfigured,
      storageProvider:
        process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "SUPABASE_STORAGE"
          : "LOCAL_DISK",
    };
    recalculateInvoiceTotals(parsed);
    return parsed;
  } catch {
    const seed = createInitialSeed();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
}

export function writeStore(store: DatabaseStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  recalculateInvoiceTotals(store);
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}
