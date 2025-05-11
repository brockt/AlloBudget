
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
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  accountId: string;
  envelopeId?: string; // Optional, as income might not have an envelope or expenses not yet categorized
  amount: number;
  type: TransactionType;
  description: string;
  date: string; // ISO string date
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
}

export interface TransactionFormData {
  accountId: string;
  envelopeId?: string;
  amount: number;
  type: TransactionType;
  description: string;
  date: string; // Should be string for form input, then parsed
}
