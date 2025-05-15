
export interface Account {
  id: string;
  userId: string;
  name: string;
  initialBalance: number;
  type?: string;
  createdAt: string;
}

export interface Envelope {
  id: string;
  userId: string;
  name: string;
  budgetAmount: number; // Default monthly target funding
  estimatedAmount?: number | undefined;
  category: string;
  dueDate?: number;
  orderIndex: number;
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id:string;
  userId: string;
  accountId: string;
  envelopeId?: string;
  payeeId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  date: string; // ISO string date
  createdAt: string;
  isTransfer?: boolean;
}

export interface Payee {
  id: string;
  userId: string;
  name: string;
  category?: string;
  createdAt: string;
}

// New type for monthly budget allocations
export interface MonthlyEnvelopeBudget {
  id: string; // Firestore document ID
  userId: string;
  envelopeId: string;
  month: string; // Format "YYYY-MM"
  allocatedAmount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface AccountFormData {
  name: string;
  initialBalance: number;
  type?: string;
}

export type AccountWithId = Partial<AccountFormData> & { id: string };

export interface EnvelopeFormData {
  name: string;
  budgetAmount: number; // Default monthly target
  estimatedAmount?: number | undefined;
  category: string;
  dueDate?: number;
}

export interface TransactionFormData {
  accountId: string;
  envelopeId?: string | null;
  payeeId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  date: string;
  isTransfer?: boolean;
}

export type TransactionWithId = Partial<TransactionFormData> & { id: string };

export interface PayeeFormData {
  name: string;
  category?: string;
}

export type PayeeWithId = PayeeFormData & { id: string };

export interface TransferEnvelopeFundsFormData {
  fromEnvelopeId: string;
  toEnvelopeId: string;
  amount: number;
  accountId: string;
  date: string;
  description?: string;
}

export interface TransferAccountFundsFormData {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
}

export interface AppContextType {
  accounts: Account[];
  envelopes: Envelope[];
  transactions: Transaction[];
  payees: Payee[];
  categories: string[];
  orderedCategories: string[];
  lastModified: string | null;
  
  monthlyEnvelopeBudgets: MonthlyEnvelopeBudget[];
  currentViewMonth: Date;
  setCurrentViewMonth: (updater: (date: Date) => Date) => void;
  setMonthlyAllocation: (envelopeId: string, month: string, amount: number) => Promise<void>;

  addAccount: (accountData: AccountFormData) => void;
  updateAccount: (accountData: AccountWithId) => void;
  addEnvelope: (envelopeData: EnvelopeFormData) => void;
  addTransaction: (transactionData: TransactionFormData) => Promise<void>;
  updateTransaction: (transactionData: TransactionWithId) => void;
  addPayee: (payeeData: PayeeFormData) => void;
  updatePayee: (payeeData: PayeeWithId) => void;
  addCategory: (categoryName: string) => void;
  updateCategoryOrder: (newOrder: string[]) => void;
  updateEnvelope: (envelopeData: Partial<Envelope> & { id: string }) => void;
  updateEnvelopeOrder: (reorderedEnvelopes: Envelope[]) => void;
  deleteTransaction: (transactionId: string) => void;
  deleteEnvelope: (envelopeId: string) => Promise<void>;
  transferBetweenEnvelopes: (data: TransferEnvelopeFundsFormData) => void;
  transferBetweenAccounts: (data: TransferAccountFundsFormData) => void;
  
  getAccountBalance: (accountId: string) => number;
  getAccountById: (accountId: string) => Account | undefined;
  getEnvelopeById: (envelopeId: string) => Envelope | undefined;
  
  getEnvelopeSpending: (envelopeId: string, forMonth: Date) => number;
  getEnvelopeBalanceAsOfEOM: (envelopeId: string, asOfEOM: Date) => number;
  getMonthlyAllocation: (envelopeId: string, forMonth: Date) => number;
  getEffectiveMonthlyBudgetWithRollover: (envelopeId: string, forMonth: Date) => number; // New function

  getMonthlyIncomeTotal: (forMonth: Date) => number;
  getMonthlySpendingTotal: (forMonth: Date) => number;
  getTotalMonthlyBudgeted: (forMonth: Date) => number; // This will be sum of getMonthlyAllocation
  getYtdIncomeTotal: () => number;
  
  isLoading: boolean;
}
