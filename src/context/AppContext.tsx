
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, TransferEnvelopeFundsFormData, AccountWithId, TransferAccountFundsFormData, AppContextType } from '@/types';
// Use parseISO and isValid for robust date handling
// Import differenceInCalendarMonths for rollover calculation
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid, differenceInCalendarMonths, startOfDay, startOfYear, endOfDay } from 'date-fns'; // Added startOfYear, endOfDay

// Remove AppContextType definition from here as it's now imported from types

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
                 return false;
              }
              if (!(tx.description === undefined || tx.description === null || typeof tx.description === 'string')) {
                 return false;
              }
              if (!(tx.envelopeId === undefined || tx.envelopeId === null || typeof tx.envelopeId === 'string')) {
                  return false;
              }
              if (typeof tx.payeeId !== 'string' || tx.payeeId.length === 0) {
                  return false;
              }
              // Validate isTransfer (optional boolean)
              if (!(tx.isTransfer === undefined || typeof tx.isTransfer === 'boolean')) {
                  return false;
              }
              const dateObj = parseISO(tx.date);
              const createdAtObj = parseISO(tx.createdAt);
              if (!isValid(dateObj) || !isValid(createdAtObj)) {
                 return false; 
              }
              return true;
            }).sort((a: Transaction, b: Transaction) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
          : [];

        const validCategories = Array.isArray(parsedData.categories)
          ? parsedData.categories.filter((cat: any): cat is string => typeof cat === 'string' && cat.length > 0).sort()
          : [];


        setAccounts(validAccounts);
        setEnvelopes(validEnvelopes.map(env => ({ 
          ...env,
          estimatedAmount: env.estimatedAmount === null ? undefined : env.estimatedAmount,
          dueDate: env.dueDate === null ? undefined : env.dueDate,
        })));
        setTransactions(validTransactions.map(tx => ({ 
            ...tx,
            description: tx.description === null ? undefined : tx.description,
            envelopeId: tx.envelopeId === null ? undefined : tx.envelopeId,
            isTransfer: tx.isTransfer === null ? undefined : tx.isTransfer, // Ensure undefined, not null
        })));
        setPayees(validPayees.sort((a: Payee, b: Payee) => a.name.localeCompare(b.name))); 
        setCategories(validCategories); 
      }
    } catch (error) {
      console.error("Failed to load or parse data from localStorage", error);
      setAccounts([]);
      setEnvelopes([]);
      setTransactions([]);
      setPayees([]);
      setCategories([]); 
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) { 
      try {
        const dataToStore = JSON.stringify({ accounts, envelopes, transactions, payees, categories });
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToStore);
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [accounts, envelopes, transactions, payees, categories, isLoading]); 


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
      estimatedAmount: (typeof envelopeData.estimatedAmount === 'number' && !isNaN(envelopeData.estimatedAmount)) ? envelopeData.estimatedAmount : undefined,
      category: envelopeData.category, 
      dueDate: (typeof envelopeData.dueDate === 'number' && !isNaN(envelopeData.dueDate) && envelopeData.dueDate >= 1 && envelopeData.dueDate <= 31) ? envelopeData.dueDate : undefined,
      createdAt: formatISO(startOfDay(new Date())), 
    };
    setEnvelopes(prev => [...prev, newEnvelope]);
  };


  const updateEnvelope = (envelopeData: Partial<Envelope> & { id: string }) => {
    setEnvelopes(prevEnvelopes =>
      prevEnvelopes.map(env =>
        env.id === envelopeData.id ? {
            ...env,
            ...envelopeData,
            estimatedAmount: (typeof envelopeData.estimatedAmount === 'number' && !isNaN(envelopeData.estimatedAmount)) ? envelopeData.estimatedAmount : undefined,
            dueDate: (typeof envelopeData.dueDate === 'number' && !isNaN(envelopeData.dueDate) && envelopeData.dueDate >= 1 && envelopeData.dueDate <= 31) ? envelopeData.dueDate : undefined,
            }
        : env
      )
    );
  };

  const updateEnvelopeOrder = (reorderedEnvelopes: Envelope[]) => {
    setEnvelopes(reorderedEnvelopes);
  };


  const addTransaction = useCallback((transactionData: TransactionFormData) => {
    if (!transactionData.payeeId) {
      console.error("Cannot add transaction without a payee ID.");
      return;
    }
    const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
        console.error("Invalid date provided for transaction:", transactionData.date);
        return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      accountId: transactionData.accountId,
      envelopeId: transactionData.envelopeId || undefined,
      payeeId: transactionData.payeeId,
      amount: Number(transactionData.amount),
      type: transactionData.type,
      description: transactionData.description || undefined,
      date: formatISO(parsedDate), 
      createdAt: formatISO(new Date()),
      isTransfer: transactionData.isTransfer || false, // Add isTransfer flag
    };
    setTransactions(prev => [...prev, newTransaction].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
  }, []); 


  const addPayee = (payeeData: PayeeFormData) => {
    const newPayee: Payee = {
      ...payeeData,
      id: crypto.randomUUID(),
      createdAt: formatISO(new Date()),
    };
    setPayees(prev => [...prev, newPayee].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const addCategory = (categoryName: string) => {
      const trimmedName = categoryName.trim();
      if (trimmedName.length === 0) return; 

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

    const expenseTransaction: TransactionFormData = {
      accountId,
      envelopeId: fromEnvelopeId,
      payeeId: internalTransferPayee.id,
      amount,
      type: 'expense',
      description: description || `Transfer to ${toEnvelope.name}`,
      date,
      isTransfer: false, // Envelope transfers are not inter-account transfers for income reporting
    };
    addTransaction(expenseTransaction);

    const incomeTransaction: TransactionFormData = {
      accountId,
      envelopeId: toEnvelopeId, 
      payeeId: internalTransferPayee.id,
      amount,
      type: 'income', 
      description: description || `Transfer from ${fromEnvelope.name}`,
      date,
      isTransfer: false, // Envelope transfers are not inter-account transfers for income reporting
    };
    addTransaction(incomeTransaction);

  }, [addTransaction, envelopes, payees]); 


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

    const expenseTransaction: TransactionFormData = {
        accountId: fromAccountId, 
        envelopeId: null,         
        payeeId: internalTransferPayee.id, 
        amount,
        type: 'expense',
        description: description || `Transfer to ${toAccount.name}`,
        date,
        isTransfer: true, // Mark as transfer
    };
    addTransaction(expenseTransaction); 

    const incomeTransaction: TransactionFormData = {
        accountId: toAccountId,   
        envelopeId: null,         
        payeeId: internalTransferPayee.id, 
        amount,
        type: 'income',
        description: description || `Transfer from ${fromAccount.name}`,
        date,
        isTransfer: true, // Mark as transfer
    };
    addTransaction(incomeTransaction); 

  }, [addTransaction, accounts, payees]); 


  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;

    const balance = transactions.reduce((currentBalance, tx) => {
      if (tx.accountId === accountId) {
        const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
        return tx.type === 'income' ? currentBalance + amount : currentBalance - amount;
      }
      return currentBalance;
    }, account.initialBalance);

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
          if (tx.envelopeId !== envelopeId || tx.type !== 'expense') {
              return false;
          }
          const txDate = parseISO(tx.date);
          return isValid(txDate) && isWithinInterval(txDate, targetPeriod);
      })
      .reduce((sum, tx) => {
          const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
          return sum + amount;
      }, 0);

      return isNaN(spending) ? 0 : spending;
  }, [transactions]);


  const getEnvelopeBalanceWithRollover = useCallback((envelopeId: string): number => {
    const envelope = envelopes.find(env => env.id === envelopeId);
    if (!envelope || !envelope.createdAt) {
        return 0;
    }
    const creationDate = parseISO(envelope.createdAt);
     if (!isValid(creationDate)) {
        return 0;
    }

    const currentDate = new Date();
    if (creationDate > currentDate) return 0;

    const monthsActive = differenceInCalendarMonths(currentDate, creationDate) + 1;

    if (monthsActive <= 0 || isNaN(monthsActive)) {
        return 0; 
    }

    const budgetAmount = typeof envelope.budgetAmount === 'number' && !isNaN(envelope.budgetAmount) ? envelope.budgetAmount : 0;
    const initialBudgetFunding = monthsActive * budgetAmount;

    const relevantTransactions = transactions.filter(tx => {
        if (tx.envelopeId !== envelopeId) return false;
        const txDate = parseISO(tx.date);
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

    const balance = initialBudgetFunding + transfersIn - spendingAndTransfersOut;
    return isNaN(balance) ? 0 : balance;

  }, [envelopes, transactions]);


  const getPayeeTransactions = useCallback((payeeId: string): Transaction[] => {
    return transactions
        .filter(tx => tx.payeeId === payeeId)
        .sort((a, b) => {
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            if (!isValid(dateA)) return 1; 
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
  }, [transactions]);


  const getMonthlyIncomeTotal = useCallback((): number => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      // Exclude income transactions that are part of an inter-account transfer
      if (tx.type === 'income' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
        return total + amount;
      }
      return total;
    }, 0);
  }, [transactions]);

  const getMonthlySpendingTotal = useCallback((): number => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
       // Exclude expense transactions that are part of an inter-account transfer (optional, typically transfers are neutral for spending reports)
       // For now, we keep them as they do represent money leaving an account, even if it goes to another owned account.
       // If these should also be excluded, add `&& !tx.isTransfer`
      if (tx.type === 'expense' && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
        return total + amount;
      }
      return total;
    }, 0);
  }, [transactions]);

  const getTotalMonthlyBudgeted = useCallback((): number => {
    return envelopes.reduce((total, env) => {
       const budgetAmount = typeof env.budgetAmount === 'number' && !isNaN(env.budgetAmount) ? env.budgetAmount : 0;
       return total + budgetAmount;
    }, 0);
  }, [envelopes]);

  const getYtdIncomeTotal = useCallback((): number => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const todayEnd = endOfDay(now); 

    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      // Exclude income transactions that are part of an inter-account transfer
      if (tx.type === 'income' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: yearStart, end: todayEnd })) {
        const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
        return total + amount;
      }
      return total;
    }, 0);
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
      updateEnvelopeOrder, 
      deleteTransaction,
      transferBetweenEnvelopes,
      transferBetweenAccounts, 
      getAccountBalance,
      getAccountById,
      getEnvelopeById,
      getEnvelopeSpending,
      getEnvelopeBalanceWithRollover,
      getPayeeTransactions,
      getMonthlyIncomeTotal,
      getMonthlySpendingTotal,
      getTotalMonthlyBudgeted,
      getYtdIncomeTotal,
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
