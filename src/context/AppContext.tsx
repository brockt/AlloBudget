"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, AccountFormData, EnvelopeFormData, TransactionFormData } from '@/types';
import { formatISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface AppContextType {
  accounts: Account[];
  envelopes: Envelope[];
  transactions: Transaction[];
  addAccount: (accountData: AccountFormData) => void;
  addEnvelope: (envelopeData: EnvelopeFormData) => void;
  addTransaction: (transactionData: TransactionFormData) => void;
  deleteTransaction: (transactionId: string) => void; // Example delete
  // Placeholder for more complex operations if needed
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setAccounts(parsedData.accounts || []);
        setEnvelopes(parsedData.envelopes || []);
        setTransactions(parsedData.transactions || []);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) { // Only save when not initially loading
      try {
        const dataToStore = JSON.stringify({ accounts, envelopes, transactions });
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToStore);
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [accounts, envelopes, transactions, isLoading]);


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
      ...envelopeData,
      id: crypto.randomUUID(),
      createdAt: formatISO(new Date()),
    };
    setEnvelopes(prev => [...prev, newEnvelope]);
  };

  const addTransaction = (transactionData: TransactionFormData) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: crypto.randomUUID(),
      amount: Number(transactionData.amount), // Ensure amount is a number
      date: formatISO(new Date(transactionData.date)), // Store as ISO string
      createdAt: formatISO(new Date()),
    };
    setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
      .filter(tx => 
        tx.envelopeId === envelopeId && 
        tx.type === 'expense' &&
        isWithinInterval(new Date(tx.date), targetPeriod)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);


  return (
    <AppContext.Provider value={{ 
      accounts, 
      envelopes, 
      transactions, 
      addAccount, 
      addEnvelope, 
      addTransaction,
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
