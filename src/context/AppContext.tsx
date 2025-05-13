

"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Added PayeeWithId type
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, PayeeWithId, TransferEnvelopeFundsFormData, AccountWithId, TransferAccountFundsFormData, AppContextType, TransactionWithId } from '@/types'; // Added TransactionWithId
// Use parseISO and isValid for robust date handling
// Import differenceInCalendarMonths for rollover calculation
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid, differenceInCalendarMonths, startOfDay, startOfYear, endOfDay } from 'date-fns'; // Added startOfYear, endOfDay
import { arrayMove } from '@dnd-kit/sortable'; // Import arrayMove

// Remove AppContextType definition from here as it's now imported from types

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'pocketBudgeteerData';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [categories, setCategories] = useState<string[]>([]); // All unique category names
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]); // User-defined order
  const [isLoading, setIsLoading] = useState(true);

  // Function to derive sorted unique categories from envelopes
  const deriveCategoriesFromEnvelopes = (envelopeList: Envelope[]): string[] => {
    const uniqueCategories = [...new Set(envelopeList.map(env => env.category || "Uncategorized"))];
    return uniqueCategories.sort((a, b) => {
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
    });
  };

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
            p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.createdAt === 'string' && isValid(parseISO(p.createdAt)) &&
            (p.category === undefined || p.category === null || typeof p.category === 'string') // Allow null for category during validation
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
              if (!(tx.isTransfer === undefined || tx.isTransfer === null || typeof tx.isTransfer === 'boolean')) {
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

        // Load or derive categories
        const derivedCats = deriveCategoriesFromEnvelopes(validEnvelopes);
        const loadedCategories = Array.isArray(parsedData.categories)
            ? parsedData.categories.filter((cat: any): cat is string => typeof cat === 'string' && cat.length > 0).sort()
            : derivedCats; // Fallback to derived if not stored

        // Load orderedCategories or initialize from loaded/derived categories
        const loadedOrderedCategories = Array.isArray(parsedData.orderedCategories)
            ? parsedData.orderedCategories.filter((cat: any): cat is string => typeof cat === 'string' && cat.length > 0)
            : loadedCategories; // Initialize order based on loaded/derived categories

        // Ensure consistency between categories and orderedCategories
        const uniqueLoadedCats = [...new Set(loadedCategories)];
        let finalOrderedCategories = loadedOrderedCategories.filter(cat => uniqueLoadedCats.includes(cat));

        // Add any missing categories from uniqueLoadedCats to the end
        uniqueLoadedCats.forEach(cat => {
            if (!finalOrderedCategories.includes(cat)) {
                finalOrderedCategories.push(cat);
            }
        });


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
        setPayees(validPayees.map(p => ({ // Ensure category is undefined, not null
            ...p,
            category: p.category === null ? undefined : p.category,
        })).sort((a: Payee, b: Payee) => a.name.localeCompare(b.name)));
        setCategories(uniqueLoadedCats); // Store the unique, sorted list
        setOrderedCategories(finalOrderedCategories); // Store the ordered list

      } else {
          // If no stored data, initialize based on default empty arrays
          setCategories([]);
          setOrderedCategories([]);
      }
    } catch (error) {
      console.error("Failed to load or parse data from localStorage", error);
      setAccounts([]);
      setEnvelopes([]);
      setTransactions([]);
      setPayees([]);
      setCategories([]);
      setOrderedCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        // Save orderedCategories as well
        const dataToStore = JSON.stringify({ accounts, envelopes, transactions, payees, categories, orderedCategories });
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToStore);
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [accounts, envelopes, transactions, payees, categories, orderedCategories, isLoading]);


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
    // Add envelope
    setEnvelopes(prev => [...prev, newEnvelope]);
    // Update categories if necessary
    if (!categories.some(cat => cat.toLowerCase() === newEnvelope.category.toLowerCase())) {
        const newCategories = [...categories, newEnvelope.category].sort((a, b) => a.localeCompare(b));
        setCategories(newCategories);
        // Add to ordered categories as well (e.g., at the end)
        setOrderedCategories(prevOrdered => [...prevOrdered, newEnvelope.category]);
    }
  };


  const updateEnvelope = (envelopeData: Partial<Envelope> & { id: string }) => {
    let oldCategory: string | undefined;
    let newCategory: string | undefined = envelopeData.category;

    setEnvelopes(prevEnvelopes => {
        const updatedEnvelopes = prevEnvelopes.map(env => {
            if (env.id === envelopeData.id) {
                oldCategory = env.category; // Store the old category before updating
                return {
                    ...env,
                    ...envelopeData,
                    estimatedAmount: (typeof envelopeData.estimatedAmount === 'number' && !isNaN(envelopeData.estimatedAmount)) ? envelopeData.estimatedAmount : undefined,
                    dueDate: (typeof envelopeData.dueDate === 'number' && !isNaN(envelopeData.dueDate) && envelopeData.dueDate >= 1 && envelopeData.dueDate <= 31) ? envelopeData.dueDate : undefined,
                };
            }
            return env;
        });

        // After updating envelopes, check if category lists need adjustment
        const currentCategories = deriveCategoriesFromEnvelopes(updatedEnvelopes);
        setCategories(currentCategories); // Update the main category list

        // Adjust ordered categories
        setOrderedCategories(prevOrdered => {
            let newOrdered = [...prevOrdered];
            // Add new category if it doesn't exist
            if (newCategory && !newOrdered.includes(newCategory)) {
                newOrdered.push(newCategory);
            }
            // Remove old category only if it's no longer used by any envelope
            if (oldCategory && !currentCategories.includes(oldCategory)) {
                newOrdered = newOrdered.filter(cat => cat !== oldCategory);
            }
            // Ensure order contains only current categories
            newOrdered = newOrdered.filter(cat => currentCategories.includes(cat));
            // Add any missing current categories to the end
            currentCategories.forEach(cat => {
                if (!newOrdered.includes(cat)) {
                    newOrdered.push(cat);
                }
            });

            return newOrdered;
        });


        return updatedEnvelopes;
    });
  };


  const updateEnvelopeOrder = (reorderedEnvelopes: Envelope[]) => {
    // This only updates the order *within* categories, not the category order itself
    setEnvelopes(reorderedEnvelopes);
  };

  const updateCategoryOrder = (newOrder: string[]) => {
      // Validate that the new order contains the same categories as the current ones
      const currentCategorySet = new Set(categories);
      const newOrderSet = new Set(newOrder);

      // Check if sizes are different or if any category in the current set is missing from the new order set.
      if (currentCategorySet.size !== newOrderSet.size || ![...currentCategorySet].every(cat => newOrderSet.has(cat))) {
          console.error("Category order update failed: Mismatched categories. Provided:", newOrder, "Expected:", categories);
          // Optionally revert or show an error message to the user
          // For now, we just prevent the state update
          return;
      }

      // If validation passes, update the state. This will trigger the useEffect to save to localStorage.
      setOrderedCategories(newOrder);
  }


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
      isTransfer: transactionData.isTransfer || false, // Default to false if not provided
    };
    setTransactions(prev => [...prev, newTransaction].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
  }, []);

  const updateTransaction = useCallback((transactionData: TransactionWithId) => {
      if (!transactionData.id) {
          console.error("Cannot update transaction without an ID.");
          return;
      }
      if (!transactionData.payeeId) {
          console.error("Cannot update transaction without a payee ID.");
          return;
      }
      const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
      if (!parsedDate || !isValid(parsedDate)) {
          console.error("Invalid date provided for transaction update:", transactionData.date);
          return;
      }

      setTransactions(prev =>
          prev.map(tx =>
              tx.id === transactionData.id
                  ? {
                      ...tx, // Spread existing transaction data
                      // Apply updates from transactionData
                      accountId: transactionData.accountId ?? tx.accountId, // Use new value or keep old
                      envelopeId: transactionData.envelopeId === null ? undefined : transactionData.envelopeId ?? tx.envelopeId, // Handle null and undefined
                      payeeId: transactionData.payeeId ?? tx.payeeId,
                      amount: transactionData.amount !== undefined ? Number(transactionData.amount) : tx.amount,
                      type: transactionData.type ?? tx.type,
                      description: transactionData.description === null ? undefined : transactionData.description ?? tx.description,
                      date: formatISO(parsedDate), // Always update date based on input
                      isTransfer: transactionData.isTransfer !== undefined ? transactionData.isTransfer : tx.isTransfer, // Keep existing if not provided
                      // Note: createdAt should generally not be updated
                  }
                  : tx
          ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()) // Resort after update
      );
  }, []);


  const addPayee = (payeeData: PayeeFormData) => {
    const newPayee: Payee = {
      id: crypto.randomUUID(),
      name: payeeData.name,
      // Ensure category is undefined if empty string, otherwise use the value
      category: payeeData.category?.trim() ? payeeData.category.trim() : undefined,
      createdAt: formatISO(new Date()),
    };
    setPayees(prev => [...prev, newPayee].sort((a, b) => a.name.localeCompare(b.name)));
  };

  // Function to update an existing payee
  const updatePayee = useCallback((payeeData: PayeeWithId) => {
    setPayees(prevPayees =>
      prevPayees.map(payee =>
        payee.id === payeeData.id
          ? {
              ...payee,
              name: payeeData.name,
              // Ensure category is undefined if empty string, otherwise update
              category: payeeData.category?.trim() ? payeeData.category.trim() : undefined,
            }
          : payee
      ).sort((a, b) => a.name.localeCompare(b.name)) // Resort after update
    );
  }, []);

  const addCategory = (categoryName: string) => {
      const trimmedName = categoryName.trim();
      if (trimmedName.length === 0) return;

      if (!categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
          const newCategories = [...categories, trimmedName].sort((a,b)=>a.localeCompare(b));
          setCategories(newCategories);
          // Add to the end of the ordered list by default
          setOrderedCategories(prevOrdered => [...prevOrdered, trimmedName]);
      } else {
          console.warn(`Category "${trimmedName}" already exists.`);
      }
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const deleteEnvelope = useCallback((envelopeId: string) => {
    const envelopeToDelete = envelopes.find(env => env.id === envelopeId);
    if (!envelopeToDelete) return;

    // 1. Remove the envelope
    const updatedEnvelopes = envelopes.filter(env => env.id !== envelopeId);
    setEnvelopes(updatedEnvelopes);

    // 2. Detach transactions from the deleted envelope (make them uncategorized)
    setTransactions(prevTransactions =>
      prevTransactions.map(tx =>
        tx.envelopeId === envelopeId ? { ...tx, envelopeId: undefined } : tx
      )
    );

    // 3. Update category lists if necessary
    const remainingCategories = deriveCategoriesFromEnvelopes(updatedEnvelopes);
    setCategories(remainingCategories);

    // Check if the deleted envelope's category is no longer used by any *other* envelope
    const categoryIsStillUsed = updatedEnvelopes.some(env => env.category === envelopeToDelete.category);
    if (!categoryIsStillUsed) {
      // If the category is no longer used by any envelope, remove it from orderedCategories
      setOrderedCategories(prevOrdered => prevOrdered.filter(cat => cat !== envelopeToDelete.category));
    } else {
      // If the category is still used, just ensure orderedCategories only contains valid, remaining categories
       setOrderedCategories(prevOrdered => prevOrdered.filter(cat => remainingCategories.includes(cat)));
    }

  }, [envelopes]); // Keep `envelopes` as a dependency


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
      isTransfer: false, // Envelope transfers are not inter-account transfers for income/spending reporting
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
      isTransfer: false, // Envelope transfers are not inter-account transfers for income/spending reporting
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
      .filter(tx => tx.type === 'income') // Includes transfers from other envelopes
      .reduce((sum, tx) => {
          const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
          return sum + amount;
       }, 0);

    const spendingAndTransfersOut = relevantTransactions
      .filter(tx => tx.type === 'expense') // Includes spending and transfers to other envelopes
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
       // Exclude expense transactions that are part of an inter-account transfer
      if (tx.type === 'expense' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
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
      categories, // Provide the sorted list of unique category names
      orderedCategories, // Provide the user-ordered list
      addAccount,
      updateAccount,
      addEnvelope,
      addTransaction,
      updateTransaction, // Add updateTransaction to context
      addPayee,
      updatePayee, // Provide updatePayee
      addCategory,
      updateCategoryOrder, // Provide updateCategoryOrder
      updateEnvelope,
      updateEnvelopeOrder,
      deleteTransaction,
      deleteEnvelope, // Provide deleteEnvelope
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

