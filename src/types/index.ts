
export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  // Optional: type like 'checking', 'savings', 'credit card'
  type?: string;
  createdAt: string;
}

export interface Envelope {
  id: string;
  name: string;
  budgetAmount: number; // Typically monthly budget
  estimatedAmount?: number | undefined; // Optional: Estimated amount (explicitly allow undefined)
  category: string; // Category is mandatory
  dueDate?: number; // Optional: Day of the month (1-31)
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id:string;
  accountId: string;
  envelopeId?: string; // Optional, used for expenses and for transfers (both income/expense legs)
  payeeId: string; // Mandatory: Link to a payee
  amount: number;
  type: TransactionType;
  description?: string; // Description remains optional
  date: string; // ISO string date
  createdAt: string;
  isTransfer?: boolean; // Flag to identify inter-account transfer transactions
}

export interface Payee {
  id: string;
  name: string;
  category?: string;
  createdAt: string;
}

// For forms
export interface AccountFormData {
  name: string;
  initialBalance: number;
  type?: string;
}

// For updating an account, ensure ID is present
export type AccountWithId = Partial<AccountFormData> & { id: string };


export interface EnvelopeFormData {
  name: string;
  budgetAmount: number;
  estimatedAmount?: number | undefined; // Optional: Estimated amount (explicitly allow undefined)
  category: string; // Make category mandatory
  dueDate?: number; // Optional: Day of the month (1-31)
}

export interface TransactionFormData {
  accountId: string;
  envelopeId?: string | null; // Allow null. Will be set for expenses and for both legs of an envelope transfer.
  payeeId: string; // Made mandatory, cannot be null
  amount: number;
  type: TransactionType;
  description?: string; // Description remains optional
  date: string; // Should be string for form input, then parsed
  isTransfer?: boolean; // Flag for inter-account transfers
}

export interface PayeeFormData {
  name: string;
  category?: string;
}

// For updating a payee, ensure ID is present
export type PayeeWithId = PayeeFormData & { id: string };


// For transfer envelope funds form
export interface TransferEnvelopeFundsFormData {
  fromEnvelopeId: string;
  toEnvelopeId: string;
  amount: number;
  accountId: string; // The account where the corresponding transactions will be recorded (relevant if using double-entry simulation)
  date: string; // ISO string date
  description?: string;
}

// For transfer account funds form
export interface TransferAccountFundsFormData {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string; // ISO string date
    description?: string;
}

export interface AppContextType {
  accounts: Account[];
  envelopes: Envelope[];
  transactions: Transaction[];
  payees: Payee[];
  categories: string[]; // Original category names
  orderedCategories: string[]; // Added: maintains the user-defined order of categories
  addAccount: (accountData: AccountFormData) => void;
  updateAccount: (accountData: AccountWithId) => void; // Added updateAccount function
  addEnvelope: (envelopeData: EnvelopeFormData) => void;
  addTransaction: (transactionData: TransactionFormData) => void;
  addPayee: (payeeData: PayeeFormData) => void;
  updatePayee: (payeeData: PayeeWithId) => void; // Added updatePayee function
  addCategory: (categoryName: string) => void; // Added addCategory function
  updateCategoryOrder: (newOrder: string[]) => void; // Added function to update category order
  updateEnvelope: (envelopeData: Partial<Envelope> & { id: string }) => void; // Added updateEnvelope function
  updateEnvelopeOrder: (reorderedEnvelopes: Envelope[]) => void; // Added updateEnvelopeOrder function
  deleteTransaction: (transactionId: string) => void; // Example delete
  transferBetweenEnvelopes: (data: TransferEnvelopeFundsFormData) => void; // New function
  transferBetweenAccounts: (data: TransferAccountFundsFormData) => void; // Function to transfer between accounts
  getAccountBalance: (accountId: string) => number;
  getAccountById: (accountId: string) => Account | undefined; // Added function definition
  getEnvelopeById: (envelopeId: string) => Envelope | undefined; // Added function definition
  getEnvelopeSpending: (envelopeId: string, period?: { start: Date, end: Date }) => number;
  getEnvelopeBalanceWithRollover: (envelopeId: string) => number; // Function for balance including rollover
  getPayeeTransactions: (payeeId: string) => Transaction[]; // Added function to get payee transactions
  // New calculation functions
  getMonthlyIncomeTotal: () => number;
  getMonthlySpendingTotal: () => number;
  getTotalMonthlyBudgeted: () => number;
  getYtdIncomeTotal: () => number;
  isLoading: boolean;
}
