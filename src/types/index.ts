

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
  category?: string; // Optional category
  dueDate?: number; // Optional: Day of the month (1-31)
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  accountId: string;
  envelopeId?: string; // Optional, as income might not have an envelope or expenses not yet categorized
  amount: number;
  type: TransactionType;
  description?: string; // Made description optional
  date: string; // ISO string date
  createdAt: string;
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

export interface EnvelopeFormData {
  name: string;
  budgetAmount: number;
  category: string; // Make category mandatory
  dueDate?: number; // Optional: Day of the month (1-31)
}

export interface TransactionFormData {
  accountId: string;
  envelopeId?: string | null; // Allow null
  amount: number;
  type: TransactionType;
  description?: string; // Made description optional
  date: string; // Should be string for form input, then parsed
}

export interface PayeeFormData {
  name: string;
  category?: string;
}

