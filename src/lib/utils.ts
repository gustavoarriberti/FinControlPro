import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return "-";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function formatReferenceMonth(refMonth: string, short = false): string {
  const [yearStr, monthStr] = refMonth.split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return refMonth;
  const label = short ? SHORT_MONTH_NAMES[monthIndex] : MONTH_NAMES[monthIndex];
  return `${label}/${yearStr}`;
}

export function addMonthsToReference(refMonth: string, offset: number): string {
  const [yearStr, monthStr] = refMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(year, month + offset, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Dado o dia da compra (YYYY-MM-DD) e o dia de fechamento do cartão,
 * calcula em qual mês de referência (YYYY-MM) a 1ª parcela entra.
 * Se a compra ocorrer no dia de fechamento ou após, entra na fatura do mês seguinte.
 */
export function calculateInvoiceMonthForPurchase(
  purchaseDateStr: string,
  closingDay: number
): string {
  const clean = purchaseDateStr.split("T")[0];
  const [yStr, mStr, dStr] = clean.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  const baseRef = `${year}-${String(month).padStart(2, "0")}`;
  if (day >= closingDay) {
    return addMonthsToReference(baseRef, 1);
  }
  return baseRef;
}

export function buildInvoiceDates(
  referenceMonth: string,
  closingDay: number,
  dueDay: number
): { closingDate: string; dueDate: string } {
  const [yStr, mStr] = referenceMonth.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);

  const maxDaysInMonth = new Date(year, month, 0).getDate();
  const safeClosingDay = Math.min(closingDay, maxDaysInMonth);
  const closingDate = `${yStr}-${mStr}-${String(safeClosingDay).padStart(2, "0")}`;

  // Se o dia de vencimento é menor que o fechamento, o vencimento vira no mês seguinte
  let dueRef = referenceMonth;
  if (dueDay < closingDay) {
    dueRef = addMonthsToReference(referenceMonth, 1);
  }
  const [dueY, dueM] = dueRef.split("-");
  const maxDueDays = new Date(parseInt(dueY, 10), parseInt(dueM, 10), 0).getDate();
  const safeDueDay = Math.min(dueDay, maxDueDays);
  const dueDate = `${dueY}-${dueM}-${String(safeDueDay).padStart(2, "0")}`;

  return { closingDate, dueDate };
}
