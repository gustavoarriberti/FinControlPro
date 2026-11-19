"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DatabaseStore, Visibility } from "@/lib/types";
import {
  addMonthsToReference,
  formatCurrency,
  formatDateBR,
  formatReferenceMonth,
} from "@/lib/utils";
import { ImportInvoiceView } from "@/components/ImportInvoiceView";
import {
  CategoriesAndTagsView,
  RecurringView,
} from "@/components/RecurringAndCategoriesView";
import {
  CreditCard as CreditCardIcon,
  LayoutDashboard,
  UploadCloud,
  Repeat,
  FolderTree,
  Users,
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  FileText,
  Lock,
  ExternalLink,
  Calendar,
  TrendingUp,
  Receipt,
  Sparkles,
  Trash2,
  ShieldCheck,
} from "lucide-react";

type ActiveTab =
  | "DASHBOARD"
  | "CARDS_INVOICES"
  | "IMPORT"
  | "RECURRING"
  | "CATEGORIES"
  | "FAMILY";

export default function ControleFinanceiroApp() {
  const [state, setState] = useState<DatabaseStore | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("DASHBOARD");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-11");
  const [selectedCardId, setSelectedCardId] = useState<string>("ALL");
  const [showNotifications, setShowNotifications] = useState(false);

  // Modais
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [payInvoiceTarget, setPayInvoiceTarget] = useState<{
    creditCardId: string;
    referenceMonth: string;
    totalAmount: number;
    paidAmount: number;
  } | null>(null);

  // Form states: Novo Lançamento
  const [txCardId, setTxCardId] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState("2026-11-15");
  const [txInstallments, setTxInstallments] = useState("1");
  const [txCategoryId, setTxCategoryId] = useState("");
  const [txSubcategory, setTxSubcategory] = useState("");
  const [txVisibility, setTxVisibility] = useState<Visibility>("SHARED");
  const [txTags, setTxTags] = useState("parcelado");

  // Form states: Novo Cartão
  const [cardName, setCardName] = useState("");
  const [cardInstitution, setCardInstitution] = useState("");
  const [cardDigits, setCardDigits] = useState("");
  const [cardBrand, setCardBrand] = useState<"Mastercard" | "Visa" | "Elo" | "Amex">("Mastercard");
  const [cardLimit, setCardLimit] = useState("10000");
  const [cardClosingDay, setCardClosingDay] = useState("15");
  const [cardDueDay, setCardDueDay] = useState("22");
  const [cardColor, setCardColor] = useState("#2563eb");
  const [cardVisibility, setCardVisibility] = useState<Visibility>("SHARED");

  // Form states: Quitação de Fatura com Comprovante
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("2026-11-19");
  const [paymentMethod, setPaymentMethod] = useState("PIX / Débito em Conta");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Form state: Novo Membro da Família
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");

  const loadState = useCallback(async (overrideUserId?: string) => {
    const query = overrideUserId ? `?userId=${overrideUserId}` : "";
    const res = await fetch(`/api/state${query}`);
    const data = (await res.json()) as DatabaseStore;
    setState(data);
    if (data.creditCards.length > 0 && !txCardId) {
      setTxCardId(data.creditCards[0].id);
    }
    if (data.categories.length > 0 && !txCategoryId) {
      setTxCategoryId(data.categories[0].id);
    }
  }, [txCardId, txCategoryId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function handleSwitchUser(userId: string) {
    await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SWITCH_USER", userId }),
    });
    await loadState(userId);
  }

  async function handleTriggerAlerts() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CHECK_ALERTS",
        referenceMonth: selectedMonth,
      }),
    });
    await loadState();
    setShowNotifications(true);
  }

  async function handleMarkNotificationsRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_ALL_READ" }),
    });
    await loadState();
  }

  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!txCardId || !txDescription || !txAmount) return;

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creditCardId: txCardId,
        categoryId: txCategoryId,
        subcategory: txSubcategory || undefined,
        userId: state?.activeUserId,
        description: txDescription,
        amount: Number(txAmount),
        date: txDate,
        totalInstallments: Number(txInstallments) || 1,
        visibility: txVisibility,
        tags: txTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });

    setTxDescription("");
    setTxAmount("");
    setShowNewTxModal(false);
    await loadState();
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardName) return;

    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cardName,
        institution: cardInstitution || cardName,
        lastFourDigits: cardDigits || "1234",
        brand: cardBrand,
        creditLimit: Number(cardLimit),
        closingDay: Number(cardClosingDay),
        dueDay: Number(cardDueDay),
        color: cardColor,
        visibility: cardVisibility,
        ownerId: state?.activeUserId,
      }),
    });

    setCardName("");
    setCardDigits("");
    setShowNewCardModal(false);
    await loadState();
  }

  async function handlePayInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payInvoiceTarget || !paymentAmount) return;
    setIsSubmittingPayment(true);

    try {
      const formData = new FormData();
      formData.append("creditCardId", payInvoiceTarget.creditCardId);
      formData.append("referenceMonth", payInvoiceTarget.referenceMonth);
      formData.append("amountPaid", paymentAmount);
      formData.append("paymentDate", paymentDate);
      formData.append("paymentMethod", paymentMethod);
      formData.append("notes", paymentNotes);
      if (paymentReceiptFile) {
        formData.append("receipt", paymentReceiptFile);
      }

      await fetch("/api/invoices/pay", {
        method: "POST",
        body: formData,
      });

      setPayInvoiceTarget(null);
      setPaymentReceiptFile(null);
      setPaymentNotes("");
      await loadState();
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  async function handleDeleteTransaction(id: string, hasGroup: boolean) {
    const deleteAll = hasGroup
      ? window.confirm(
          "Este lançamento faz parte de um parcelamento. Deseja excluir TODAS as parcelas futuras vinculadas?"
        )
      : false;
    await fetch(
      `/api/transactions?id=${id}&allInstallments=${deleteAll}`,
      { method: "DELETE" }
    );
    await loadState();
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberName || !memberEmail) return;
    await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_MEMBER",
        name: memberName,
        email: memberEmail,
      }),
    });
    setMemberName("");
    setMemberEmail("");
    await loadState();
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-md">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm font-semibold text-slate-700">
            Carregando seu Controle Financeiro...
          </span>
        </div>
      </div>
    );
  }

  const activeUser =
    state.workspace.members.find((m) => m.id === state.activeUserId) ||
    state.workspace.members[0];

  const unreadNotifications = state.notifications.filter((n) => !n.read);

  // Faturas e transações do mês selecionado
  const monthInvoices = state.invoices.filter(
    (inv) =>
      inv.referenceMonth === selectedMonth &&
      (selectedCardId === "ALL" || inv.creditCardId === selectedCardId)
  );

  const monthTransactions = state.transactions
    .filter(
      (tx) =>
        tx.referenceMonth === selectedMonth &&
        (selectedCardId === "ALL" || tx.creditCardId === selectedCardId)
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalInvoicesMonth = monthInvoices.reduce(
    (acc, inv) => acc + Number(inv.totalAmount),
    0
  );
  const totalInvoicesPaidMonth = monthInvoices.reduce(
    (acc, inv) => acc + Number(inv.paidAmount),
    0
  );
  const totalInvoicesPendingMonth = Math.max(
    0,
    totalInvoicesMonth - totalInvoicesPaidMonth
  );

  const monthFixedExpenses = state.recurringTransactions
    .filter((r) => r.type === "EXPENSE" && r.active)
    .reduce((acc, r) => acc + Number(r.expectedAmount), 0);

  const monthFixedIncomes = state.recurringTransactions
    .filter((r) => r.type === "INCOME" && r.active)
    .reduce((acc, r) => acc + Number(r.expectedAmount), 0);

  // Projeção de 6 meses (Mês atual + 5 meses futuros de parcelas já assumidas)
  const projectionMonths = [-1, 0, 1, 2, 3, 4].map((offset) =>
    addMonthsToReference(selectedMonth, offset)
  );
  const projectionData = projectionMonths.map((refM) => {
    const txs = state.transactions.filter(
      (t) =>
        t.referenceMonth === refM &&
        (selectedCardId === "ALL" || t.creditCardId === selectedCardId)
    );
    const total = txs.reduce((acc, t) => acc + Number(t.amount), 0);
    const installmentOnly = txs
      .filter((t) => t.totalInstallments > 1)
      .reduce((acc, t) => acc + Number(t.amount), 0);

    return {
      refM,
      label: formatReferenceMonth(refM, true),
      total: Number(total.toFixed(2)),
      installmentOnly: Number(installmentOnly.toFixed(2)),
    };
  });
  const maxProjectionVal = Math.max(
    1,
    ...projectionData.map((p) => p.total)
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Logo & Workspace */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <CreditCardIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900">
                  FinControl Pro
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  {state.workspace.name}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gestão de Faturas, Parcelamentos e Finanças Familiares
              </p>
            </div>
          </div>

          {/* Seletor de Mês de Referência */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() =>
                setSelectedMonth(addMonthsToReference(selectedMonth, -1))
              }
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white hover:shadow-sm"
              title="Mês Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-800">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>{formatReferenceMonth(selectedMonth)}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedMonth(addMonthsToReference(selectedMonth, 1))
              }
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white hover:shadow-sm"
              title="Próximo Mês (Ver Projeção de Parcelas)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Ações Rápidas, Troca de Membro Familiar e Notificações */}
          <div className="flex items-center gap-3">
            {/* Alternador de Visão de Membro (Demonstra Privado vs Compartilhado) */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="text-left">
                <span className="block text-[10px] font-medium text-slate-400">
                  Visão do Membro
                </span>
                <select
                  value={state.activeUserId}
                  onChange={(e) => handleSwitchUser(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {state.workspace.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role === "OWNER" ? "Titular" : "Família"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sininho de Notificações In-App */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:w-96">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-900">
                      Notificações & Alertas de Vencimento
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkNotificationsRead}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Marcar lidas
                    </button>
                  </div>
                  <div className="mt-2 max-h-72 space-y-2.5 overflow-y-auto">
                    {state.notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl border p-3 text-xs ${
                          n.read
                            ? "border-slate-100 bg-slate-50 text-slate-600"
                            : "border-blue-100 bg-blue-50/50 text-slate-800"
                        }`}
                      >
                        <p className="font-bold">{n.title}</p>
                        <p className="mt-0.5 text-slate-600">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowNewTxModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Gasto</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 pt-2">
            {[
              {
                id: "DASHBOARD" as ActiveTab,
                label: "Visão Geral",
                icon: LayoutDashboard,
              },
              {
                id: "CARDS_INVOICES" as ActiveTab,
                label: "Cartões & Faturas",
                icon: CreditCardIcon,
              },
              {
                id: "IMPORT" as ActiveTab,
                label: "Importar Fatura (PDF/OFX/CSV)",
                icon: UploadCloud,
              },
              {
                id: "RECURRING" as ActiveTab,
                label: "Recorrentes & Assinaturas",
                icon: Repeat,
              },
              {
                id: "CATEGORIES" as ActiveTab,
                label: "Categorias & Tags",
                icon: FolderTree,
              },
              {
                id: "FAMILY" as ActiveTab,
                label: "Grupo Familiar & Privacidade",
                icon: Users,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {/* TAB 1: DASHBOARD */}
        {activeTab === "DASHBOARD" && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Total Faturas ({formatReferenceMonth(selectedMonth, true)})
                  </span>
                  <CreditCardIcon className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {formatCurrency(totalInvoicesMonth)}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-emerald-600">
                    Pago: {formatCurrency(totalInvoicesPaidMonth)}
                  </span>
                  <span className="font-semibold text-amber-600">
                    Aberto: {formatCurrency(totalInvoicesPendingMonth)}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Contas Fixas & Assinaturas
                  </span>
                  <Repeat className="h-4 w-4 text-purple-600" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {formatCurrency(monthFixedExpenses)}
                </p>
                <span className="mt-2 block text-xs text-slate-500">
                  Total mensal comprometido ({formatCurrency(totalInvoicesMonth + monthFixedExpenses)})
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Receitas Familiares Previstas
                  </span>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                  {formatCurrency(monthFixedIncomes)}
                </p>
                <span className="mt-2 block text-xs text-slate-500">
                  Saldo livre estimado:{" "}
                  <strong>
                    {formatCurrency(
                      monthFixedIncomes - totalInvoicesMonth - monthFixedExpenses
                    )}
                  </strong>
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Visibilidade Ativa
                  </span>
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                </div>
                <p className="mt-2 text-lg font-extrabold text-slate-900">
                  {activeUser?.name}
                </p>
                <span className="mt-1 block text-xs text-slate-500">
                  Exibindo itens <strong>Compartilhados</strong> + itens{" "}
                  <strong>Privados</strong> de {activeUser?.name.split(" ")[0]}
                </span>
              </div>
            </div>

            {/* Projeção de Parcelamentos & Faturas do Mês */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Gráfico de Projeção de Parcelas Futuras */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Projeção de Faturas & Parcelamentos Futuros
                    </h2>
                    <p className="text-xs text-slate-500">
                      Clique em qualquer mês para navegar diretamente para as parcelas projetadas
                    </p>
                  </div>
                  <select
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">Todos os Cartões Visíveis</option>
                    {state.creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 grid grid-cols-6 gap-3 pt-4">
                  {projectionData.map((col) => {
                    const heightPct = Math.max(
                      12,
                      Math.round((col.total / maxProjectionVal) * 140)
                    );
                    const isCurrent = col.refM === selectedMonth;
                    return (
                      <button
                        key={col.refM}
                        type="button"
                        onClick={() => setSelectedMonth(col.refM)}
                        className={`flex flex-col items-center rounded-xl p-2 transition ${
                          isCurrent
                            ? "bg-blue-50/80 ring-2 ring-blue-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-[11px] font-bold text-slate-700">
                          {formatCurrency(col.total)}
                        </span>
                        <div className="my-2 flex h-36 w-full items-end justify-center">
                          <div
                            style={{ height: `${heightPct}px` }}
                            className={`w-10 rounded-t-xl transition-all ${
                              isCurrent ? "bg-blue-600" : "bg-slate-300"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            isCurrent ? "text-blue-700" : "text-slate-600"
                          }`}
                        >
                          {col.label}
                        </span>
                        <span className="text-[10px] text-purple-600">
                          Parc: {formatCurrency(col.installmentOnly)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status das Faturas por Cartão no Mês */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Faturas de {formatReferenceMonth(selectedMonth, true)}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("CARDS_INVOICES")}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Ver detalhes
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {state.creditCards.map((card) => {
                    const inv = state.invoices.find(
                      (i) =>
                        i.creditCardId === card.id &&
                        i.referenceMonth === selectedMonth
                    );
                    const amount = inv?.totalAmount || 0;
                    const paid = inv?.paidAmount || 0;
                    const status = inv?.status || "OPEN";

                    return (
                      <div
                        key={card.id}
                        className="rounded-xl border border-slate-200 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: card.color }}
                            />
                            <span className="text-xs font-bold text-slate-900">
                              {card.name}
                            </span>
                            {card.visibility === "PRIVATE" && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                <Lock className="h-2.5 w-2.5" /> Privado
                              </span>
                            )}
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : status === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-700"
                                : status === "CLOSED"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {status === "PAID"
                              ? "PAGA"
                              : status === "PARTIALLY_PAID"
                              ? "PARCIAL"
                              : status === "CLOSED"
                              ? "FECHADA"
                              : "ABERTA"}
                          </span>
                        </div>

                        <div className="mt-2 flex items-end justify-between">
                          <div className="text-[11px] text-slate-500">
                            Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-slate-900">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>

                        {amount > paid && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayInvoiceTarget({
                                creditCardId: card.id,
                                referenceMonth: selectedMonth,
                                totalAmount: amount,
                                paidAmount: paid,
                              });
                              setPaymentAmount(String((amount - paid).toFixed(2)));
                            }}
                            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Quitar Fatura / Anexar Comprovante
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Últimos Lançamentos da Fatura do Mês */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Lançamentos das Faturas em {formatReferenceMonth(selectedMonth)}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Inclui compras avulsas, parcelas projetadas deste mês e itens importados via IA,
                    OFX ou CSV.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("IMPORT")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Importar Fatura PDF / OFX / CSV
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                      <th className="py-3 pr-3">Data Compra</th>
                      <th className="px-3 py-3">Estabelecimento / Descrição</th>
                      <th className="px-3 py-3">Cartão</th>
                      <th className="px-3 py-3">Categoria</th>
                      <th className="px-3 py-3">Parcela</th>
                      <th className="px-3 py-3">Origem</th>
                      <th className="px-3 py-3">Visibilidade</th>
                      <th className="px-3 py-3 text-right">Valor</th>
                      <th className="py-3 pl-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthTransactions.map((tx) => {
                      const card = state.creditCards.find(
                        (c) => c.id === tx.creditCardId
                      );
                      const cat = state.categories.find(
                        (c) => c.id === tx.categoryId
                      );
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80">
                          <td className=" whitespace-nowrap py-3 pr-3 text-xs text-slate-500">
                            {formatDateBR(tx.date)}
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-semibold text-slate-900">
                              {tx.description}
                            </span>
                            {tx.tags.length > 0 && (
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {tx.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[10px] font-medium text-slate-400"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs font-medium text-slate-700">
                            {card?.name || "-"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${cat?.color || "#3b82f6"}18`,
                                color: cat?.color || "#3b82f6",
                              }}
                            >
                              {cat?.name || "Categoria"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {tx.totalInstallments > 1 ? (
                              <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700">
                                {tx.currentInstallment}/{tx.totalInstallments}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                À vista
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {tx.source}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {tx.visibility === "PRIVATE" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                <Lock className="h-3 w-3" /> Privado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                <Users className="h-3 w-3" /> Família
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-900">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="py-3 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteTransaction(
                                  tx.id,
                                  Boolean(tx.installmentGroupId)
                                )
                              }
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {monthTransactions.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 text-center text-sm text-slate-400"
                        >
                          Nenhum lançamento registrado para{" "}
                          {formatReferenceMonth(selectedMonth)}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CARTÕES & FATURAS */}
        {activeTab === "CARDS_INVOICES" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Cartões de Crédito & Ciclo de Faturas
                </h2>
                <p className="text-sm text-slate-500">
                  Gerencie limites, dias de fechamento/vencimento, faturas em PDF arquivadas e
                  comprovantes de pagamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCardModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Adicionar Cartão
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {state.creditCards.map((card) => {
                const inv = state.invoices.find(
                  (i) =>
                    i.creditCardId === card.id &&
                    i.referenceMonth === selectedMonth
                );
                const cardAllFutureUnpaid = state.invoices
                  .filter(
                    (i) => i.creditCardId === card.id && i.status !== "PAID"
                  )
                  .reduce(
                    (acc, i) => acc + (i.totalAmount - i.paidAmount),
                    0
                  );
                const availableLimit = Math.max(
                  0,
                  card.creditLimit - cardAllFutureUnpaid
                );
                const usedPct = Math.min(
                  100,
                  Math.round((cardAllFutureUnpaid / card.creditLimit) * 100)
                );

                return (
                  <div
                    key={card.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div>
                      {/* Visual Card Header */}
                      <div
                        className="rounded-2xl p-5 text-white shadow-md"
                        style={{ backgroundColor: card.color }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                            {card.institution} • {card.brand}
                          </span>
                          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">
                            {card.visibility === "SHARED"
                              ? "Compartilhado"
                              : "Privado"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-extrabold">
                          {card.name}
                        </h3>
                        <p className="mt-1 font-mono text-xs opacity-85">
                          •••• •••• •••• {card.lastFourDigits}
                        </p>
                        <div className="mt-4 flex justify-between text-xs opacity-90">
                          <span>Fechamento: Dia {card.closingDay}</span>
                          <span>Vencimento: Dia {card.dueDay}</span>
                        </div>
                      </div>

                      {/* Barra de Limite */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">
                            Limite Comprometido (Todas Parcelas)
                          </span>
                          <span className="font-bold text-slate-800">
                            {usedPct}% ({formatCurrency(cardAllFutureUnpaid)})
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                          <span>
                            Disponível: {formatCurrency(availableLimit)}
                          </span>
                          <span>Total: {formatCurrency(card.creditLimit)}</span>
                        </div>
                      </div>

                      {/* Resumo da Fatura do Mês Selecionado */}
                      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            Fatura {formatReferenceMonth(selectedMonth)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              inv?.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv?.status === "PARTIALLY_PAID"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {inv?.status === "PAID"
                              ? "QUITADA"
                              : inv?.status === "PARTIALLY_PAID"
                              ? "PAGA PARCIALMENTE"
                              : inv?.status === "CLOSED"
                              ? "FECHADA"
                              : "ABERTA"}
                          </span>
                        </div>

                        <p className="mt-2 text-2xl font-extrabold text-slate-900">
                          {formatCurrency(inv?.totalAmount || 0)}
                        </p>
                        {inv && inv.paidAmount > 0 && (
                          <p className="text-xs font-semibold text-emerald-600">
                            Valor Pago: {formatCurrency(inv.paidAmount)}
                          </p>
                        )}

                        {inv?.fileName && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700">
                            <FileText className="h-3.5 w-3.5" />
                            {inv.fileUrl ? (
                              <a
                                href={inv.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium underline"
                              >
                                Fatura Original: {inv.fileName}
                              </a>
                            ) : (
                              <span>Arquivo: {inv.fileName}</span>
                            )}
                          </div>
                        )}

                        {/* Histórico de Pagamentos e Comprovantes desta Fatura */}
                        {inv && inv.payments.length > 0 && (
                          <div className="mt-3 border-t border-slate-200 pt-2.5">
                            <span className="text-[11px] font-bold uppercase text-slate-400">
                              Pagamentos & Comprovantes
                            </span>
                            {inv.payments.map((p) => (
                              <div
                                key={p.id}
                                className="mt-1.5 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-700">
                                    {formatDateBR(p.paymentDate)}
                                  </span>{" "}
                                  • {formatCurrency(p.amountPaid)}
                                </div>
                                {p.receiptUrl ? (
                                  <a
                                    href={p.receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Comprovante
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-emerald-600">
                                    {p.receiptName || "Confirmado"}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const total = inv?.totalAmount || 0;
                          const paid = inv?.paidAmount || 0;
                          setPayInvoiceTarget({
                            creditCardId: card.id,
                            referenceMonth: selectedMonth,
                            totalAmount: total,
                            paidAmount: paid,
                          });
                          setPaymentAmount(
                            String(Math.max(0, total - paid).toFixed(2))
                          );
                        }}
                        className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Registrar Pagamento
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCardId(card.id);
                          setActiveTab("DASHBOARD");
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Ver Lançamentos
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: IMPORTAÇÃO DE FATURA (PDF/OFX/CSV) */}
        {activeTab === "IMPORT" && (
          <ImportInvoiceView
            creditCards={state.creditCards}
            categories={state.categories}
            selectedMonth={selectedMonth}
            activeUserId={state.activeUserId}
            onImportSuccess={async () => {
              await loadState();
            }}
          />
        )}

        {/* TAB 4: RECORRENTES & ASSINATURAS */}
        {activeTab === "RECURRING" && (
          <RecurringView
            recurringTransactions={state.recurringTransactions}
            categories={state.categories}
            selectedMonth={selectedMonth}
            activeUserId={state.activeUserId}
            onRefresh={() => loadState()}
            onTriggerAlerts={handleTriggerAlerts}
          />
        )}

        {/* TAB 5: CATEGORIAS & TAGS */}
        {activeTab === "CATEGORIES" && (
          <CategoriesAndTagsView
            categories={state.categories}
            tags={state.tags}
            transactions={state.transactions}
            selectedMonth={selectedMonth}
            onRefresh={() => loadState()}
          />
        )}

        {/* TAB 6: GRUPO FAMILIAR & PRIVACIDADE */}
        {activeTab === "FAMILY" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Membros do Espaço Familiar ({state.workspace.name})
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Alterne entre membros no topo da página para testar a privacidade de cartões e
                  lançamentos marcados como <strong>Privado</strong> versus{" "}
                  <strong>Compartilhado</strong>.
                </p>

                <div className="mt-5 divide-y divide-slate-100">
                  {state.workspace.members.map((m) => {
                    const isCurrent = m.id === state.activeUserId;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {m.name}
                            </p>
                            <p className="text-xs text-slate-500">{m.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {m.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSwitchUser(m.id)}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold ${
                              isCurrent
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {isCurrent ? "Visão Ativa" : "Assumir Visão"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Status das Integrações e Infraestrutura
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Extrator PDF (IA Gemini)
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {state.settings.geminiConfigured
                        ? "Gemini 2.5 Flash Ativo"
                        : "Modo Híbrido / Heurístico Local"}
                    </p>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Configure GEMINI_API_KEY no .env
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Object Storage (PDFs/Recibos)
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {state.settings.storageProvider === "SUPABASE_STORAGE"
                        ? "Supabase Cloud Storage"
                        : "Storage Local (/public/uploads)"}
                    </p>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Arquivos acessíveis via link direto
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Alertas por E-mail (Resend)
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {state.settings.resendConfigured
                        ? "Resend API Conectado"
                        : "Notificações In-App Ativas"}
                    </p>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Configure RESEND_API_KEY no .env
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Convidar Membro para a Família
              </h3>
              <form onSubmit={handleAddMember} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nome do Membro
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Lucas Silva"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="lucas@familia.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Adicionar ao Grupo Familiar
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: NOVO LANÇAMENTO MANUAL COM PROJEÇÃO DE PARCELAS */}
      {showNewTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Novo Lançamento em Cartão de Crédito
            </h3>
            <p className="text-xs text-slate-500">
              Compras parceladas são distribuídas e projetadas automaticamente nas faturas dos
              próximos meses respeitando o dia de fechamento do cartão.
            </p>

            <form onSubmit={handleCreateTransaction} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Cartão de Crédito
                  </label>
                  <select
                    value={txCardId}
                    onChange={(e) => setTxCardId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {state.creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Data da Compra
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Descrição / Estabelecimento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: iPhone 16 Pro - Apple Store"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Valor Total da Compra (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1200.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Quantidade de Parcelas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={txInstallments}
                    onChange={(e) => setTxInstallments(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Categoria
                  </label>
                  <select
                    value={txCategoryId}
                    onChange={(e) => setTxCategoryId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {state.categories
                      .filter((c) => c.type === "EXPENSE")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Visibilidade Familiar
                  </label>
                  <select
                    value={txVisibility}
                    onChange={(e) =>
                      setTxVisibility(e.target.value as Visibility)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="SHARED">Compartilhado (Grupo)</option>
                    <option value="PRIVATE">Privado (Somente Eu)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={txTags}
                  onChange={(e) => setTxTags(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewTxModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Lançar e Projetar Parcelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NOVO CARTÃO DE CRÉDITO */}
      {showNewCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Cadastrar Cartão de Crédito
            </h3>
            <form onSubmit={handleCreateCard} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: C6 Carbon Black"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Instituição / Banco
                  </label>
                  <input
                    type="text"
                    placeholder="C6 Bank"
                    value={cardInstitution}
                    onChange={(e) => setCardInstitution(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Últimos 4 Dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="8842"
                    value={cardDigits}
                    onChange={(e) => setCardDigits(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Bandeira
                  </label>
                  <select
                    value={cardBrand}
                    onChange={(e) =>
                      setCardBrand(
                        e.target.value as "Mastercard" | "Visa" | "Elo" | "Amex"
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                    <option value="Elo">Elo</option>
                    <option value="Amex">Amex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Limite Total (R$)
                  </label>
                  <input
                    type="number"
                    value={cardLimit}
                    onChange={(e) => setCardLimit(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Dia de Fechamento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={cardClosingDay}
                    onChange={(e) => setCardClosingDay(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={cardDueDay}
                    onChange={(e) => setCardDueDay(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Privacidade do Cartão
                  </label>
                  <select
                    value={cardVisibility}
                    onChange={(e) =>
                      setCardVisibility(e.target.value as Visibility)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="SHARED">Compartilhado (Família)</option>
                    <option value="PRIVATE">Privado (Somente Titular)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Cor do Cartão
                  </label>
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="mt-1 h-9 w-full cursor-pointer rounded-xl border border-slate-300 p-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewCardModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUITAÇÃO DE FATURA E UPLOAD DE COMPROVANTE */}
      {payInvoiceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-lg font-bold text-slate-900">
                Quitar Fatura & Anexar Comprovante
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Fatura de{" "}
              <strong>
                {formatReferenceMonth(payInvoiceTarget.referenceMonth)}
              </strong>{" "}
              • Total: {formatCurrency(payInvoiceTarget.totalAmount)}
            </p>

            <form onSubmit={handlePayInvoiceSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Valor Pago (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Forma de Pagamento
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Comprovante de Pagamento (PDF ou Imagem)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) =>
                    setPaymentReceiptFile(e.target.files?.[0] || null)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago via PIX conta conjunta"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayInvoiceTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmittingPayment
                    ? "Salvando..."
                    : "Confirmar Quitação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
