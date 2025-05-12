
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, TransferEnvelopeFundsFormData, AccountWithId, TransferAccountFundsFormData } from '@/types';
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
  updateAccount: (accountData: AccountWithId) => void; // Added updateAccount function
  addEnvelope: (envelopeData: EnvelopeFormData) => void;
  addTransaction: (transactionData: TransactionFormData) => void;
  addPayee: (payeeData: PayeeFormData) => void;
  addCategory: (categoryName: string) => void; // Added addCategory function
  updateEnvelope: (envelopeData: Partial<Envelope> & { id: string }) => void; // Added updateEnvelope function
  deleteTransaction: (transactionId: string) => void; // Example delete
  transferBetweenEnvelopes: (data: TransferEnvelopeFundsFormData) => void; // New function
  transferBetweenAccounts: (data: TransferAccountFundsFormData) => void; // Function to transfer between accounts
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
            (env.estimatedAmount === undefined || env.estimatedAmount === null || typeof env.estimatedAmount === 'number') && // Allow null for estimatedAmount during validation
            typeof env.createdAt === 'string' && isValid(parseISO(env.createdAt)) &&
            typeof env.category === 'string' && env.category.length > 0 &&
            (env.dueDate === undefined || env.dueDate === null || (typeof env.dueDate === 'number' && env.dueDate >= 1 && env.dueDate <= 31)) // Allow null for dueDate during validation
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
              if (!(tx.description === undefined || tx.description === null || typeof tx.description === 'string')) { // Allow null
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
        setEnvelopes(validEnvelopes.map(env => ({ // Ensure undefined, not null
          ...env,
          estimatedAmount: env.estimatedAmount === null ? undefined : env.estimatedAmount,
          dueDate: env.dueDate === null ? undefined : env.dueDate,
        })));
        setTransactions(validTransactions.map(tx => ({ // Ensure undefined, not null for optional fields
            ...tx,
            description: tx.description === null ? undefined : tx.description,
            envelopeId: tx.envelopeId === null ? undefined : tx.envelopeId,
        })));
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

  const updateAccount = (accountData: AccountWithId) => {
    setAccounts(prevAccounts =>
      prevAccounts.map(acc =>
        acc.id === accountData.id ? { ...acc, ...accountData } : acc
      )
    );
  };

  const addEnvelope = (envelopeData: EnvelopeFormData) => {
    const newEnvelope: Envelope = {
      id: crypto.randomUUID(),
      name: envelopeData.name,
      budgetAmount: envelopeData.budgetAmount,
      // Ensure estimatedAmount is undefined if not provided or invalid
      estimatedAmount: (typeof envelopeData.estimatedAmount === 'number' && !isNaN(envelopeData.estimatedAmount)) ? envelopeData.estimatedAmount : undefined,
      category: envelopeData.category, // Category is mandatory now
      // Ensure dueDate is undefined if not provided or invalid
      dueDate: (typeof envelopeData.dueDate === 'number' && !isNaN(envelopeData.dueDate) && envelopeData.dueDate >= 1 && envelopeData.dueDate <= 31) ? envelopeData.dueDate : undefined,
      createdAt: formatISO(startOfDay(new Date())), // Ensure createdAt is the start of the day for consistent month calculation
    };
    setEnvelopes(prev => [...prev, newEnvelope]);
  };


  const updateEnvelope = (envelopeData: Partial<Envelope> & { id: string }) => {
    setEnvelopes(prevEnvelopes =>
      prevEnvelopes.map(env =>
        env.id === envelopeData.id ? {
            ...env,
            ...envelopeData,
             // Ensure optional fields are set to undefined if they are null/empty after update
            estimatedAmount: (typeof envelopeData.estimatedAmount === 'number' && !isNaN(envelopeData.estimatedAmount)) ? envelopeData.estimatedAmount : undefined,
            dueDate: (typeof envelopeData.dueDate === 'number' && !isNaN(envelopeData.dueDate) && envelopeData.dueDate >= 1 && envelopeData.dueDate <= 31) ? envelopeData.dueDate : undefined,
            }
        : env
      )
    );
  };


  const addTransaction = useCallback((transactionData: TransactionFormData) => {
    if (!transactionData.payeeId) {
      console.error("Cannot add transaction without a payee ID.");
      return;
    }
    // Parse date robustly
    const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
        console.error("Invalid date provided for transaction:", transactionData.date);
        // Maybe show a user-facing error (e.g., toast)
        return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      accountId: transactionData.accountId,
      // Ensure envelopeId is undefined if null or empty string
      envelopeId: transactionData.envelopeId || undefined,
      payeeId: transactionData.payeeId,
      amount: Number(transactionData.amount),
      type: transactionData.type,
      // Ensure description is undefined if null or empty string
      description: transactionData.description || undefined,
      date: formatISO(parsedDate), // Use the validated parsed date
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
      const trimmedName = categoryName.trim();
      if (trimmedName.length === 0) return; // Don't add empty categories

      if (!categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
          setCategories(prev => [...prev, trimmedName].sort());
      } else {
          console.warn(`Category "${trimmedName}" already exists.`);
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


  const transferBetweenAccounts = useCallback((data: TransferAccountFundsFormData) => {
    const { fromAccountId, toAccountId, amount, date, description } = data;

    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    const toAccount = accounts.find(acc => acc.id === toAccountId);

    if (!fromAccount || !toAccount) {
        console.error("Invalid source or destination account for transfer.");
        return;
    }

    let internalTransferPayee = payees.find(p => p.name === "Internal Account Transfer");
    if (!internalTransferPayee) {
        const newPayeeId = crypto.randomUUID();
        internalTransferPayee = {
            id: newPayeeId,
            name: "Internal Account Transfer",
            createdAt: formatISO(new Date()),
        };
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
    }

    // Transaction out of source account
    const expenseTransaction: TransactionFormData = {
        accountId: fromAccountId, // Source account ID
        envelopeId: null,         // No envelope involved in account transfer
        payeeId: internalTransferPayee.id,
        amount,
        type: 'expense',
        description: description || `Transfer to ${toAccount.name}`,
        date,
    };
    addTransaction(expenseTransaction);

    // Transaction into destination account
    const incomeTransaction: TransactionFormData = {
        accountId: toAccountId,   // Destination account ID
        envelopeId: null,         // No envelope involved
        payeeId: internalTransferPayee.id,
        amount,
        type: 'income',
        description: description || `Transfer from ${fromAccount.name}`,
        date,
    };
    addTransaction(incomeTransaction);

}, [addTransaction, accounts, payees]);


  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;

    const balance = transactions.reduce((currentBalance, tx) => {
      if (tx.accountId === accountId) {
        // Ensure amount is a valid number
        const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
        return tx.type === 'income' ? currentBalance + amount : currentBalance - amount;
      }
      return currentBalance;
    }, account.initialBalance);

     // Ensure the final balance is a number
     return isNaN(balance) ? 0 : balance;

  }, [accounts, transactions]);

  const getAccountById = useCallback((accountId: string): Account | undefined => {
    return accounts.find(acc => acc.id === accountId);
  }, [accounts]);

  const getEnvelopeById = useCallback((envelopeId: string): Envelope | undefined => {
    return envelopes.find(env => env.id === envelopeId);
  }, [envelopes]);


  const getEnvelopeSpending = useCallback((envelopeId: string, period?: { start: Date, end: Date }): number => {
    const targetPeriod = period || { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

    const spending = transactions
      .filter(tx => {
          // Basic filtering
          if (tx.envelopeId !== envelopeId || tx.type !== 'expense') {
              return false;
          }
          // Date validation and period check
          const txDate = parseISO(tx.date);
          return isValid(txDate) && isWithinInterval(txDate, targetPeriod);
      })
      .reduce((sum, tx) => {
          // Amount validation inside reduce
          const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
          return sum + amount;
      }, 0);

      // Ensure final result is a number
      return isNaN(spending) ? 0 : spending;
  }, [transactions]);


  const getEnvelopeBalanceWithRollover = useCallback((envelopeId: string): number => {
    const envelope = envelopes.find(env => env.id === envelopeId);
    // Check if envelope exists and createdAt is valid BEFORE parsing
    if (!envelope || !envelope.createdAt) {
        // console.warn(`Envelope not found or missing creation date for ID: ${envelopeId}`);
        return 0;
    }
    const creationDate = parseISO(envelope.createdAt);
     if (!isValid(creationDate)) {
        // console.warn(`Invalid envelope creation date found for ID: ${envelopeId}`);
        return 0;
    }


    const currentDate = new Date();
    // Ensure we don't calculate for future creation dates (edge case)
    if (creationDate > currentDate) return 0;

    // differenceInCalendarMonths requires valid dates
    const monthsActive = differenceInCalendarMonths(currentDate, creationDate) + 1;

    // Check if monthsActive is valid
    if (monthsActive <= 0 || isNaN(monthsActive)) {
        // console.warn(`Invalid months active calculation for envelope ID: ${envelopeId}. Months: ${monthsActive}`);
        return 0; // Return 0 if calculation is invalid
    }

    // Validate budgetAmount
    const budgetAmount = typeof envelope.budgetAmount === 'number' && !isNaN(envelope.budgetAmount) ? envelope.budgetAmount : 0;
    const initialBudgetFunding = monthsActive * budgetAmount;

    // Filter transactions safely
    const relevantTransactions = transactions.filter(tx => {
        if (tx.envelopeId !== envelopeId) return false;
        const txDate = parseISO(tx.date);
        // Check if transaction date is valid AND after or on the creation date
        return isValid(txDate) && txDate >= startOfDay(creationDate);
    });


    const transfersIn = relevantTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => {
          const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
          return sum + amount;
       }, 0);

    const spendingAndTransfersOut = relevantTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => {
           const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
           return sum + amount;
        }, 0);

    // Ensure result is a number
    const balance = initialBudgetFunding + transfersIn - spendingAndTransfersOut;
    return isNaN(balance) ? 0 : balance;

  }, [envelopes, transactions]);


  const getPayeeTransactions = useCallback((payeeId: string): Transaction[] => {
    return transactions
        .filter(tx => tx.payeeId === payeeId)
        .sort((a, b) => {
             // Add date validation within sort for robustness
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            if (!isValid(dateA)) return 1; // Put invalid dates last
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
  }, [transactions]);


  return (
    <AppContext.Provider value={{
      accounts,
      envelopes,
      transactions,
      payees,
      categories,
      addAccount,
      updateAccount,
      addEnvelope,
      addTransaction,
      addPayee,
      addCategory,
      updateEnvelope,
      deleteTransaction,
      transferBetweenEnvelopes,
      transferBetweenAccounts, // Expose the account transfer function
      getAccountBalance,
      getAccountById,
      getEnvelopeById,
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

