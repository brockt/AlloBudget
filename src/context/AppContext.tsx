
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData } from '@/types';
// Use parseISO and isValid for robust date handling
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid } from 'date-fns';

interface AppContextType {
  accounts: Account[];
  envelopes: Envelope[];
  transactions: Transaction[];
  payees: Payee[];
  categories: string[]; // Added categories state
  addAccount: (accountData: AccountFormData) => void;
  addEnvelope: (envelopeData: EnvelopeFormData) => void;
  addTransaction: (transactionData: TransactionFormData) => void;
  addPayee: (payeeData: PayeeFormData) => void;
  addCategory: (categoryName: string) => void; // Added addCategory function
  deleteTransaction: (transactionId: string) => void; // Example delete
  getAccountBalance: (accountId: string) => number;
  getEnvelopeSpending: (envelopeId: string, period?: { start: Date, end: Date }) => number;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'pocketBudgeteerData';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [categories, setCategories] = useState<string[]>([]); // Initialize categories state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);

        // Validate and sanitize loaded data
        const validAccounts = Array.isArray(parsedData.accounts) ? parsedData.accounts.filter((acc: any): acc is Account =>
            acc && typeof acc.id === 'string' && typeof acc.name === 'string' && typeof acc.initialBalance === 'number' && typeof acc.createdAt === 'string' && isValid(parseISO(acc.createdAt))
        ) : [];

        const validEnvelopes = Array.isArray(parsedData.envelopes) ? parsedData.envelopes.filter((env: any): env is Envelope =>
            env && typeof env.id === 'string' && typeof env.name === 'string' && typeof env.budgetAmount === 'number' && typeof env.createdAt === 'string' && isValid(parseISO(env.createdAt)) && typeof env.category === 'string' && env.category.length > 0 && (env.dueDate === undefined || (typeof env.dueDate === 'number' && env.dueDate >= 1 && env.dueDate <= 31)) // Validate category and dueDate
        ) : [];

        const validPayees = Array.isArray(parsedData.payees) ? parsedData.payees.filter((p: any): p is Payee =>
            p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.createdAt === 'string' && isValid(parseISO(p.createdAt))
        ) : [];

        const validTransactions = Array.isArray(parsedData.transactions)
          ? parsedData.transactions.filter((tx: any): tx is Transaction => {
              if (!tx || typeof tx.id !== 'string' || typeof tx.accountId !== 'string' || typeof tx.amount !== 'number' || typeof tx.type !== 'string' || !['income', 'expense'].includes(tx.type) || typeof tx.description !== 'string' || typeof tx.date !== 'string' || typeof tx.createdAt !== 'string') {
                 console.warn(`Invalid structure found in stored transaction ${tx?.id}. Filtering out.`);
                 return false;
              }
              // Check if envelopeId exists and is a string, or if it's null/undefined
              if (!(tx.envelopeId === undefined || tx.envelopeId === null || typeof tx.envelopeId === 'string')) {
                  console.warn(`Invalid envelopeId type found in stored transaction ${tx.id}: type='${typeof tx.envelopeId}'. Filtering out.`);
                  return false;
              }
              const dateObj = parseISO(tx.date);
              const createdAtObj = parseISO(tx.createdAt);
              if (!isValid(dateObj) || !isValid(createdAtObj)) {
                 console.warn(`Invalid date format found in stored transaction ${tx.id}: date='${tx.date}', createdAt='${tx.createdAt}'. Filtering out.`);
                 return false; // Filter out transactions with invalid dates
              }
              return true;
            }).sort((a: Transaction, b: Transaction) => parseISO(b.date).getTime() - parseISO(a.date).getTime()) // Sort after filtering
          : [];

        // Load and validate categories
        const validCategories = Array.isArray(parsedData.categories)
          ? parsedData.categories.filter((cat: any): cat is string => typeof cat === 'string' && cat.length > 0).sort()
          : [];


        // Set state with validated data
        setAccounts(validAccounts);
        setEnvelopes(validEnvelopes);
        setTransactions(validTransactions);
        setPayees(validPayees.sort((a: Payee, b: Payee) => a.name.localeCompare(b.name))); // Sort payees after loading
        setCategories(validCategories); // Set categories state
      }
    } catch (error) {
      console.error("Failed to load or parse data from localStorage", error);
      // Ensure states are default empty arrays in case of error
      setAccounts([]);
      setEnvelopes([]);
      setTransactions([]);
      setPayees([]);
      setCategories([]); // Ensure categories is empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) { // Only save when not initially loading
      try {
        // Include categories in the data to store
        const dataToStore = JSON.stringify({ accounts, envelopes, transactions, payees, categories });
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToStore);
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [accounts, envelopes, transactions, payees, categories, isLoading]); // Add categories dependency


  const addAccount = (accountData: AccountFormData) => {
    const newAccount: Account = {
      ...accountData,
      id: crypto.randomUUID(),
      createdAt: formatISO(new Date()),
    };
    setAccounts(prev => [...prev, newAccount]);
  };

  const addEnvelope = (envelopeData: EnvelopeFormData) => {
    const newEnvelope: Envelope = {
      id: crypto.randomUUID(),
      name: envelopeData.name,
      budgetAmount: envelopeData.budgetAmount,
      category: envelopeData.category, // Category is mandatory now
      ...(envelopeData.dueDate !== undefined && { dueDate: envelopeData.dueDate }), // Conditionally add dueDate
      createdAt: formatISO(new Date()),
    };
    setEnvelopes(prev => [...prev, newEnvelope]);
  };

  const addTransaction = (transactionData: TransactionFormData) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: crypto.randomUUID(),
      amount: Number(transactionData.amount), // Ensure amount is a number
      // Handle envelopeId being null
      envelopeId: transactionData.envelopeId === null ? undefined : transactionData.envelopeId,
      date: formatISO(parseISO(transactionData.date)), // Ensure date is valid ISO string from input
      createdAt: formatISO(new Date()),
    };
    setTransactions(prev => [...prev, newTransaction].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
  };

  const addPayee = (payeeData: PayeeFormData) => {
    const newPayee: Payee = {
      ...payeeData,
      id: crypto.randomUUID(),
      createdAt: formatISO(new Date()),
    };
    // Add new payee and sort alphabetically by name
    setPayees(prev => [...prev, newPayee].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const addCategory = (categoryName: string) => {
      // Check if category already exists (case-insensitive)
      if (!categories.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) {
          setCategories(prev => [...prev, categoryName].sort());
      } else {
          console.warn(`Category "${categoryName}" already exists.`);
          // Optionally, show a toast notification here
      }
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;

    return transactions.reduce((balance, tx) => {
      if (tx.accountId === accountId) {
        return tx.type === 'income' ? balance + tx.amount : balance - tx.amount;
      }
      return balance;
    }, account.initialBalance);
  }, [accounts, transactions]);

  const getEnvelopeSpending = useCallback((envelopeId: string, period?: { start: Date, end: Date }): number => {
    const targetPeriod = period || { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

    return transactions
      .filter(tx => {
          // Ensure date is valid before using it
          const txDate = parseISO(tx.date);
          return isValid(txDate) &&
                 tx.envelopeId === envelopeId &&
                 tx.type === 'expense' &&
                 isWithinInterval(txDate, targetPeriod)
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);


  return (
    <AppContext.Provider value={{
      accounts,
      envelopes,
      transactions,
      payees,
      categories, // Expose categories
      addAccount,
      addEnvelope,
      addTransaction,
      addPayee,
      addCategory, // Expose addCategory
      deleteTransaction,
      getAccountBalance,
      getEnvelopeSpending,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
