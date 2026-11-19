import { AppNotification, DatabaseStore } from "./types";
import { formatCurrency, formatDateBR, formatReferenceMonth } from "./utils";

/**
 * Verifica faturas abertas/fechadas e contas recorrentes não quitadas no mês de referência,
 * gerando notificações In-App e disparando e-mails via Resend quando RESEND_API_KEY está configurada.
 */
export async function checkAndDispatchDueAlerts(
  store: DatabaseStore,
  referenceMonth: string
): Promise<{
  createdNotifications: AppNotification[];
  emailsDispatched: number;
}> {
  const created: AppNotification[] = [];
  let emailsDispatched = 0;

  // 1. Verificar faturas pendentes deste mês
  const monthInvoices = store.invoices.filter(
    (inv) =>
      inv.referenceMonth === referenceMonth &&
      inv.status !== "PAID" &&
      inv.totalAmount > 0
  );

  for (const inv of monthInvoices) {
    const card = store.creditCards.find((c) => c.id === inv.creditCardId);
    const remaining = inv.totalAmount - inv.paidAmount;
    const refKey = `inv-alert-${inv.id}-${referenceMonth}`;

    const alreadyExists = store.notifications.some((n) => n.referenceId === refKey);
    if (!alreadyExists && card) {
      const emailSent = await sendEmailReminderIfConfigured(
        store.settings.notificationEmail,
        `Lembrete de Fatura: ${card.name} (${formatReferenceMonth(referenceMonth)})`,
        `A fatura do cartão ${card.name} referente a ${formatReferenceMonth(
          referenceMonth
        )} no valor de ${formatCurrency(remaining)} vence em ${formatDateBR(inv.dueDate)}.`
      );
      if (emailSent) emailsDispatched++;

      const notif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        workspaceId: store.workspace.id,
        title: `Fatura pendente: ${card.name}`,
        message: `Saldo a pagar de ${formatCurrency(remaining)} com vencimento em ${formatDateBR(
          inv.dueDate
        )}.`,
        type: "INVOICE_DUE",
        referenceId: refKey,
        dueDate: inv.dueDate,
        emailSent,
        read: false,
        createdAt: new Date().toISOString(),
      };
      store.notifications.unshift(notif);
      created.push(notif);
    }
  }

  // 2. Verificar assinaturas e transações recorrentes pendentes no mês
  const pendingRecurrings = store.recurringTransactions.filter(
    (rec) =>
      rec.active &&
      rec.notifyDueDate &&
      rec.type === "EXPENSE" &&
      !rec.paidMonths.includes(referenceMonth)
  );

  for (const rec of pendingRecurrings) {
    const refKey = `rec-alert-${rec.id}-${referenceMonth}`;
    const alreadyExists = store.notifications.some((n) => n.referenceId === refKey);

    if (!alreadyExists) {
      const dueDate = `${referenceMonth}-${String(rec.dueDay).padStart(2, "0")}`;
      const emailSent = await sendEmailReminderIfConfigured(
        store.settings.notificationEmail,
        `Vencimento Recorrente: ${rec.title}`,
        `O compromisso recorrente "${rec.title}" no valor de ${formatCurrency(
          rec.expectedAmount
        )} vence no dia ${formatDateBR(dueDate)}.`
      );
      if (emailSent) emailsDispatched++;

      const notif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        workspaceId: store.workspace.id,
        title: `Lembrete de Vencimento: ${rec.title}`,
        message: `Valor previsto de ${formatCurrency(
          rec.expectedAmount
        )} com vencimento no dia ${rec.dueDay} (${formatDateBR(dueDate)}).`,
        type: "RECURRING_DUE",
        referenceId: refKey,
        dueDate,
        emailSent,
        read: false,
        createdAt: new Date().toISOString(),
      };
      store.notifications.unshift(notif);
      created.push(notif);
    }
  }

  return { createdNotifications: created, emailsDispatched };
}

async function sendEmailReminderIfConfigured(
  to: string,
  subject: string,
  textBody: string
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !to) return false;

  try {
    const fromEmail =
      process.env.NOTIFICATION_FROM_EMAIL || "Controle Financeiro <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e293b; margin-top: 0;">${subject}</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">${textBody}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <small style="color: #94a3b8;">Enviado automaticamente pelo seu Controle Financeiro Inteligente.</small>
        </div>`,
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
