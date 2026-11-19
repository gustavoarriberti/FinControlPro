"use client";

import React, { useState } from "react";
import {
  Category,
  RecurringTransaction,
  Tag,
  Transaction,
  Visibility,
} from "@/lib/types";
import { formatCurrency, formatReferenceMonth } from "@/lib/utils";
import {
  Repeat,
  Plus,
  CheckCircle2,
  Clock,
  Bell,
  Lock,
  Users,
  Trash2,
  Tag as TagIcon,
  FolderTree,
  MailCheck,
} from "lucide-react";

interface RecurringViewProps {
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  selectedMonth: string;
  activeUserId: string;
  onRefresh: () => Promise<void>;
  onTriggerAlerts: () => Promise<void>;
}

export function RecurringView({
  recurringTransactions,
  categories,
  selectedMonth,
  activeUserId,
  onRefresh,
  onTriggerAlerts,
}: RecurringViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [visibility, setVisibility] = useState<Visibility>("SHARED");
  const [notifyDueDate, setNotifyDueDate] = useState(true);

  async function handleCreateRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !expectedAmount) return;

    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        expectedAmount: Number(expectedAmount),
        dueDay: Number(dueDay),
        categoryId,
        userId: activeUserId,
        visibility,
        notifyDueDate,
      }),
    });

    setTitle("");
    setExpectedAmount("");
    setShowModal(false);
    await onRefresh();
  }

  async function handleTogglePaid(id: string) {
    await fetch("/api/recurring", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        toggleMonth: selectedMonth,
      }),
    });
    await onRefresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/recurring?id=${id}`, { method: "DELETE" });
    await onRefresh();
  }

  const expenses = recurringTransactions.filter((r) => r.type === "EXPENSE");
  const incomes = recurringTransactions.filter((r) => r.type === "INCOME");

  const totalFixedExpenses = expenses.reduce(
    (acc, r) => acc + Number(r.expectedAmount),
    0
  );
  const totalPaidFixed = expenses
    .filter((r) => r.paidMonths.includes(selectedMonth))
    .reduce((acc, r) => acc + Number(r.expectedAmount), 0);
  const totalFixedIncomes = incomes.reduce(
    (acc, r) => acc + Number(r.expectedAmount),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Transações Recorrentes & Assinaturas ({formatReferenceMonth(selectedMonth)})
          </h2>
          <p className="text-sm text-slate-500">
            Controle de contas fixas (aluguel, energia, internet), serviços de streaming e receitas
            recorrentes com alerta de vencimento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onTriggerAlerts}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <MailCheck className="h-4 w-4 text-amber-600" />
            Verificar Vencimentos & Disparar Alertas
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova Recorrência / Assinatura
          </button>
        </div>
      </div>

      {/* Cards de resumo de recorrências */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Despesas Fixas & Assinaturas
          </span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalFixedExpenses)}
          </p>
          <span className="mt-1 block text-xs text-slate-500">
            Quitado em {formatReferenceMonth(selectedMonth, true)}:{" "}
            <strong className="text-emerald-600">
              {formatCurrency(totalPaidFixed)}
            </strong>
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Pendente de Quitação no Mês
          </span>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">
            {formatCurrency(Math.max(0, totalFixedExpenses - totalPaidFixed))}
          </p>
          <span className="mt-1 block text-xs text-slate-500">
            {
              expenses.filter((r) => !r.paidMonths.includes(selectedMonth))
                .length
            }{" "}
            compromissos aguardando baixa
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Receitas Recorrentes (Salários/Renda)
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">
            {formatCurrency(totalFixedIncomes)}
          </p>
          <span className="mt-1 block text-xs text-slate-500">
            {incomes.length} fontes de renda cadastradas
          </span>
        </div>
      </div>

      {/* Lista de Despesas Fixas e Assinaturas */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">
          Contas Fixas, Assinaturas e Receitas Mensais
        </h3>

        <div className="mt-4 divide-y divide-slate-100">
          {recurringTransactions.map((rec) => {
            const isPaid = rec.paidMonths.includes(selectedMonth);
            const cat = categories.find((c) => c.id === rec.categoryId);

            return (
              <div
                key={rec.id}
                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePaid(rec.id)}
                    title="Alternar status Pago/Pendente neste mês"
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                      isPaid
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                    }`}
                  >
                    {isPaid ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {rec.title}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${cat?.color || "#3b82f6"}18`,
                          color: cat?.color || "#3b82f6",
                        }}
                      >
                        {cat?.name || "Geral"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          rec.visibility === "SHARED"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {rec.visibility === "SHARED" ? (
                          <>
                            <Users className="h-3 w-3" /> Compartilhado
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Privado
                          </>
                        )}
                      </span>
                      {rec.notifyDueDate && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          <Bell className="h-3 w-3 text-blue-600" /> Alerta ativo
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Vencimento todo dia <strong>{rec.dueDay}</strong> •{" "}
                      {rec.type === "INCOME" ? "Receita Fixa" : "Despesa Recorrente"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <span
                      className={`text-base font-bold ${
                        rec.type === "INCOME"
                          ? "text-emerald-600"
                          : "text-slate-900"
                      }`}
                    >
                      {rec.type === "INCOME" ? "+" : ""}
                      {formatCurrency(rec.expectedAmount)}
                    </span>
                    <span
                      className={`block text-[11px] font-semibold ${
                        isPaid ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {isPaid
                        ? `Quitado em ${formatReferenceMonth(selectedMonth, true)}`
                        : `Pendente em ${formatReferenceMonth(selectedMonth, true)}`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePaid(rec.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isPaid
                        ? "border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {isPaid ? "Reabrir" : "Marcar Pago"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(rec.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Nova Transação Recorrente / Assinatura
            </h3>
            <form onSubmit={handleCreateRecurring} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Descrição (ex: Netflix, Condomínio, Internet)
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Tipo
                  </label>
                  <select
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as "EXPENSE" | "INCOME")
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="EXPENSE">Despesa / Assinatura</option>
                    <option value="INCOME">Receita / Salário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Dia do Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Categoria
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Visibilidade no Grupo
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="SHARED">Compartilhado (Família)</option>
                    <option value="PRIVATE">Privado (Só eu)</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={notifyDueDate}
                      onChange={(e) => setNotifyDueDate(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    Notificar vencimento (In-App + E-mail)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Salvar Recorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoriesAndTagsViewProps {
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
  selectedMonth: string;
  onRefresh: () => Promise<void>;
}

export function CategoriesAndTagsView({
  categories,
  tags,
  transactions,
  selectedMonth,
  onRefresh,
}: CategoriesAndTagsViewProps) {
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#3b82f6");
  const [subcatsText, setSubcatsText] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#8b5cf6");

  const monthTxs = transactions.filter(
    (t) => t.referenceMonth === selectedMonth
  );

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName) return;

    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: catName,
        color: catColor,
        subcategories: subcatsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });

    setCatName("");
    setSubcatsText("");
    await onRefresh();
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagName) return;

    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "TAG",
        name: tagName,
        color: tagColor,
      }),
    });

    setTagName("");
    await onRefresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Categorias & Subcategorias Personalizadas
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Gastos acumulados em {formatReferenceMonth(selectedMonth)} por categoria e suas
            subcategorias.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {categories.map((cat) => {
              const catSpend = monthTxs
                .filter((t) => t.categoryId === cat.id)
                .reduce((acc, t) => acc + Number(t.amount), 0);

              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-bold text-slate-900">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800">
                      {formatCurrency(catSpend)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cat.subcategories.map((sub) => (
                      <span
                        key={sub}
                        className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Criação de Categoria e Tags */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900">
            Adicionar Nova Categoria
          </h3>
          <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Nome da Categoria
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Educação & Cursos"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Subcategorias (separadas por vírgula)
              </label>
              <input
                type="text"
                placeholder="Livros, Pós-graduação, Idiomas"
                value={subcatsText}
                onChange={(e) => setSubcatsText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Cor Identificadora
              </label>
              <input
                type="color"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
                className="mt-1 h-9 w-full cursor-pointer rounded-xl border border-slate-300 p-1"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Criar Categoria
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">
              Tags Personalizadas
            </h3>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: `${t.color}18`,
                  color: t.color,
                }}
              >
                #{t.name}
              </span>
            ))}
          </div>

          <form onSubmit={handleCreateTag} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="nova-tag"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
            <input
              type="color"
              value={tagColor}
              onChange={(e) => setTagColor(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded-xl border border-slate-300 p-1"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              + Tag
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
