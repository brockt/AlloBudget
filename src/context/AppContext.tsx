
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, TransferEnvelopeFundsFormData } from '@/types';
// Use parseISO and isValid for robust date handling
// Import differenceInCalendarMonths for rollover calculation
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid, differenceInCalendarMonths, startOfDay } from 'date-fns';

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
  updateEnvelope: (envelopeData: Partial<Envelope> & { id: string }) => void; // Added updateEnvelope function
  deleteTransaction: (transactionId: string) => void; // Example delete
  transferBetweenEnvelopes: (data: TransferEnvelopeFundsFormData) => void; // New function
  getAccountBalance: (accountId: string) => number;
  getAccountById: (accountId: string) => Account | undefined; // Added function definition
  getEnvelopeById: (envelopeId: string) => Envelope | undefined; // Added function definition
  getEnvelopeSpending: (envelopeId: string, period?: { start: Date, end: Date }) => number;
  getEnvelopeBalanceWithRollover: (envelopeId: string) => number; // Function for balance including rollover
  getPayeeTransactions: (payeeId: string) => Transaction[]; // Added function to get payee transactions
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
            env && typeof env.id === 'string' && typeof env.name === 'string' && typeof env.budgetAmount === 'number' &&
            (env.estimatedAmount === undefined || typeof env.estimatedAmount === 'number') && // Validate optional estimatedAmount
            typeof env.createdAt === 'string' && isValid(parseISO(env.createdAt)) &&
            typeof env.category === 'string' && env.category.length > 0 &&
            (env.dueDate === undefined || (typeof env.dueDate === 'number' && env.dueDate >= 1 && env.dueDate <= 31)) // Validate category and dueDate
        ) : [];

        const validPayees = Array.isArray(parsedData.payees) ? parsedData.payees.filter((p: any): p is Payee =>
            p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.createdAt === 'string' && isValid(parseISO(p.createdAt))
        ) : [];

        const validTransactions = Array.isArray(parsedData.transactions)
          ? parsedData.transactions.filter((tx: any): tx is Transaction => {
              // Basic structure validation
              if (!tx || typeof tx.id !== 'string' || typeof tx.accountId !== 'string' || typeof tx.amount !== 'number' || typeof tx.type !== 'string' || !['income', 'expense'].includes(tx.type) || typeof tx.date !== 'string' || typeof tx.createdAt !== 'string') {
                 // console.warn(`Invalid structure base found in stored transaction ${tx?.id}. Filtering out.`);
                 return false;
              }
               // Description validation (optional)
              if (!(tx.description === undefined || typeof tx.description === 'string')) {
                 // console.warn(`Invalid description type found in stored transaction ${tx.id}: type='${typeof tx.description}'. Filtering out.`);
                 return false;
              }
              // EnvelopeId validation (optional)
              // Now allows envelopeId for income type transactions too.
              if (!(tx.envelopeId === undefined || tx.envelopeId === null || typeof tx.envelopeId === 'string')) {
                  // console.warn(`Invalid envelopeId type found in stored transaction ${tx.id}: type='${typeof tx.envelopeId}'. Filtering out.`);
                  return false;
              }
              // PayeeId validation (now mandatory string)
              if (typeof tx.payeeId !== 'string' || tx.payeeId.length === 0) { // Check for string and non-empty
                  // console.warn(`Invalid or missing payeeId found in stored transaction ${tx.id}: value='${tx.payeeId}'. Filtering out.`);
                  return false;
              }
              // Date validation
              const dateObj = parseISO(tx.date);
              const createdAtObj = parseISO(tx.createdAt);
              if (!isValid(dateObj) || !isValid(createdAtObj)) {
                 // console.warn(`Invalid date format found in stored transaction ${tx.id}: date='${tx.date}', createdAt='${tx.createdAt}'. Filtering out.`);
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
      estimatedAmount: envelopeData.estimatedAmount, // Assign estimatedAmount
      category: envelopeData.category, // Category is mandatory now
      ...(envelopeData.dueDate !== undefined && { dueDate: envelopeData.dueDate }), // Conditionally add dueDate
      createdAt: formatISO(startOfDay(new Date())), // Ensure createdAt is the start of the day for consistent month calculation
    };
    setEnvelopes(prev => [...prev, newEnvelope]);
  };

  const updateEnvelope = (envelopeData: Partial<Envelope> & { id: string }) => {
    setEnvelopes(prevEnvelopes =>
      prevEnvelopes.map(env =>
        env.id === envelopeData.id ? { ...env, ...envelopeData } : env
      )
    );
  };


  const addTransaction = useCallback((transactionData: TransactionFormData) => {
    if (!transactionData.payeeId) {
      console.error("Cannot add transaction without a payee ID.");
      return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      accountId: transactionData.accountId,
      envelopeId: transactionData.envelopeId === null ? undefined : transactionData.envelopeId,
      payeeId: transactionData.payeeId,
      amount: Number(transactionData.amount),
      type: transactionData.type,
      description: transactionData.description,
      date: formatISO(parseISO(transactionData.date)),
      createdAt: formatISO(new Date()),
    };
    setTransactions(prev => [...prev, newTransaction].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
  }, []); // memoized to be used in transferBetweenEnvelopes


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
      if (!categories.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) {
          setCategories(prev => [...prev, categoryName].sort());
      } else {
          console.warn(`Category "${categoryName}" already exists.`);
      }
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const transferBetweenEnvelopes = useCallback((data: TransferEnvelopeFundsFormData) => {
    const { fromEnvelopeId, toEnvelopeId, amount, accountId, date, description } = data;

    const fromEnvelope = envelopes.find(e => e.id === fromEnvelopeId);
    const toEnvelope = envelopes.find(e => e.id === toEnvelopeId);

    if (!fromEnvelope || !toEnvelope) {
      console.error("Invalid source or destination envelope for transfer.");
      // Potentially show a toast error to the user
      return;
    }

    let internalTransferPayee = payees.find(p => p.name === "Internal Budget Transfer");
    if (!internalTransferPayee) {
        const newPayeeId = crypto.randomUUID();
        internalTransferPayee = {
            id: newPayeeId,
            name: "Internal Budget Transfer",
            createdAt: formatISO(new Date()),
        };
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
    }


    // Transaction out of source envelope
    const expenseTransaction: TransactionFormData = {
      accountId,
      envelopeId: fromEnvelopeId,
      payeeId: internalTransferPayee.id,
      amount,
      type: 'expense',
      description: description || `Transfer to ${toEnvelope.name}`,
      date,
    };
    addTransaction(expenseTransaction);

    // Transaction into destination envelope
    const incomeTransaction: TransactionFormData = {
      accountId,
      envelopeId: toEnvelopeId, // Assign to destination envelope
      payeeId: internalTransferPayee.id,
      amount,
      type: 'income', // This is an "income" *to the envelope's balance*
      description: description || `Transfer from ${fromEnvelope.name}`,
      date,
    };
    addTransaction(incomeTransaction);

  }, [addTransaction, envelopes, payees]); // Added payees to dependencies


  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;

    return transactions.reduce((balance, tx) => {
      if (tx.accountId === accountId) {
        // Ensure amount is positive regardless of transaction type for calculation
        const absoluteAmount = Math.abs(tx.amount);
        return tx.type === 'income' ? balance + absoluteAmount : balance - absoluteAmount;
      }
      return balance;
    }, account.initialBalance);
  }, [accounts, transactions]);

  const getAccountById = useCallback((accountId: string): Account | undefined => {
    return accounts.find(acc => acc.id === accountId);
  }, [accounts]);

  const getEnvelopeById = useCallback((envelopeId: string): Envelope | undefined => {
    return envelopes.find(env => env.id === envelopeId);
  }, [envelopes]);


  const getEnvelopeSpending = useCallback((envelopeId: string, period?: { start: Date, end: Date }): number => {
    const targetPeriod = period || { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

    return transactions
      .filter(tx => {
          const txDate = parseISO(tx.date);
          return isValid(txDate) &&
                 tx.envelopeId === envelopeId &&
                 tx.type === 'expense' && // Only consider actual expenses for "spending"
                 isWithinInterval(txDate, targetPeriod)
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const getEnvelopeBalanceWithRollover = useCallback((envelopeId: string): number => {
    const envelope = envelopes.find(env => env.id === envelopeId);
    if (!envelope || !isValid(parseISO(envelope.createdAt))) {
        return 0;
    }

    const creationDate = parseISO(envelope.createdAt);
    const currentDate = new Date();
    // Ensure we don't calculate for future creation dates (edge case)
    if (creationDate > currentDate) return 0;

    const monthsActive = differenceInCalendarMonths(currentDate, creationDate) + 1;

    if (monthsActive <= 0) return 0;

    const initialBudgetFunding = monthsActive * envelope.budgetAmount;

    const transfersIn = transactions
      .filter(tx => {
          const txDate = parseISO(tx.date);
          return isValid(txDate) &&
                 tx.envelopeId === envelopeId &&
                 tx.type === 'income' && // Income to this envelope (transfers in)
                 txDate >= startOfDay(creationDate); // Consider only transactions since envelope creation
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const spendingAndTransfersOut = transactions
      .filter(tx => {
          const txDate = parseISO(tx.date);
          return isValid(txDate) &&
                 tx.envelopeId === envelopeId &&
                 tx.type === 'expense' && // Expenses from this envelope (spending and transfers out)
                 txDate >= startOfDay(creationDate); // Consider only transactions since envelope creation
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    return initialBudgetFunding + transfersIn - spendingAndTransfersOut;

  }, [envelopes, transactions]);


  const getPayeeTransactions = useCallback((payeeId: string): Transaction[] => {
    return transactions
        .filter(tx => tx.payeeId === payeeId)
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [transactions]);


  return (
    <AppContext.Provider value={{
      accounts,
      envelopes,
      transactions,
      payees,
      categories,
      addAccount,
      addEnvelope,
      addTransaction,
      addPayee,
      addCategory,
      updateEnvelope,
      deleteTransaction,
      transferBetweenEnvelopes, // Expose the new function
      getAccountBalance,
      getAccountById,
      getEnvelopeById, // Expose the new function
      getEnvelopeSpending,
      getEnvelopeBalanceWithRollover,
      getPayeeTransactions,
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
