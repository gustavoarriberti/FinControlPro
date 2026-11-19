export type WorkspaceType = "PERSONAL" | "FAMILY";
export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type Visibility = "PRIVATE" | "SHARED";
export type InvoiceStatus = "OPEN" | "CLOSED" | "OVERDUE" | "PAID" | "PARTIALLY_PAID";
export type RecurringFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";
export type TransactionType = "EXPENSE" | "INCOME";
export type TransactionSource = "MANUAL" | "PDF_AI" | "OFX" | "CSV";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: MemberRole;
}

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  createdAt: string;
  members: User[];
}

export interface CreditCard {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  institution: string;
  lastFourDigits: string;
  brand: "Mastercard" | "Visa" | "Elo" | "Amex";
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  visibility: Visibility;
  createdAt: string;
}

export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  subcategories: string[];
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  receiptUrl?: string;
  receiptName?: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  creditCardId: string;
  categoryId: string;
  subcategory?: string;
  userId: string;
  description: string;
  merchant?: string;
  amount: number;
  date: string; // YYYY-MM-DD (data da compra original)
  referenceMonth: string; // YYYY-MM (mês da fatura em que esta parcela cai)
  currentInstallment: number;
  totalInstallments: number;
  installmentGroupId?: string;
  tags: string[];
  visibility: Visibility;
  source: TransactionSource;
  createdAt: string;
}

export interface Invoice {
  id: string;
  creditCardId: string;
  referenceMonth: string; // YYYY-MM
  closingDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  fileUrl?: string;
  fileName?: string;
  payments: InvoicePayment[];
  updatedAt: string;
}

export interface RecurringTransaction {
  id: string;
  workspaceId: string;
  categoryId: string;
  subcategory?: string;
  userId: string;
  title: string;
  type: TransactionType;
  expectedAmount: number;
  frequency: RecurringFrequency;
  dueDay: number;
  startDate: string;
  endDate?: string;
  notifyDueDate: boolean;
  daysBeforeAlert: number;
  visibility: Visibility;
  autoDebitCardId?: string;
  paidMonths: string[]; // ['2026-10', '2026-11']
  tags: string[];
  active: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  workspaceId: string;
  title: string;
  message: string;
  type: "INVOICE_DUE" | "RECURRING_DUE" | "PAYMENT_CONFIRMED" | "IMPORT_COMPLETED";
  referenceId?: string;
  dueDate?: string;
  emailSent: boolean;
  read: boolean;
  createdAt: string;
}

export interface ExtractedTransactionDraft {
  tempId: string;
  date: string;
  description: string;
  merchant?: string;
  amount: number;
  currentInstallment: number;
  totalInstallments: number;
  categoryId: string;
  subcategory?: string;
  tags: string[];
  visibility: Visibility;
  selected: boolean;
  projectRemainingInstallments: boolean;
}

export interface ParsedInvoicePayload {
  fileName: string;
  fileUrl: string;
  fileFormat: "PDF" | "OFX" | "CSV";
  extractionEngine: "GEMINI_AI" | "NATIVE_OFX" | "NATIVE_CSV" | "PDF_HEURISTIC";
  detectedBank?: string;
  detectedReferenceMonth?: string;
  detectedDueDate?: string;
  detectedTotalAmount: number;
  items: ExtractedTransactionDraft[];
}

export interface DatabaseStore {
  workspace: Workspace;
  activeUserId: string;
  creditCards: CreditCard[];
  categories: Category[];
  tags: Tag[];
  invoices: Invoice[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  notifications: AppNotification[];
  settings: {
    geminiConfigured: boolean;
    resendConfigured: boolean;
    storageProvider: "LOCAL_DISK" | "SUPABASE_STORAGE";
    notificationEmail: string;
  };
}
