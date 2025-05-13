
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, PayeeWithId, TransferEnvelopeFundsFormData, AccountWithId, TransferAccountFundsFormData, AppContextType, TransactionWithId } from '@/types';
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid, differenceInCalendarMonths, startOfDay, startOfYear, endOfDay } from 'date-fns';
import { db } from '@/lib/firebase'; // Import Firestore instance
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  deleteDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  getDoc
} from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Firestore Collection Names
const ACCOUNTS_COLLECTION = 'accounts';
const ENVELOPES_COLLECTION = 'envelopes';
const TRANSACTIONS_COLLECTION = 'transactions';
const PAYEES_COLLECTION = 'payees';
const APP_METADATA_COLLECTION = 'app_metadata';
const APP_METADATA_DOC_ID = 'main';


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastModified, setLastModified] = useState<string | null>(null);

  const updateLastModified = async () => {
    try {
      const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
      await updateDoc(metadataDocRef, { lastModified: serverTimestamp() });
      // No need to setLastModified locally here, it will be fetched
    } catch (error) {
      console.error("Error updating lastModified timestamp in Firestore:", error);
    }
  };

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
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Accounts
        const accountsSnapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
        const fetchedAccounts = accountsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account))
         .sort((a,b) => a.name.localeCompare(b.name));
        setAccounts(fetchedAccounts);

        // Fetch Envelopes
        const envelopesSnapshot = await getDocs(collection(db, ENVELOPES_COLLECTION));
        const fetchedEnvelopes = envelopesSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            estimatedAmount: d.data().estimatedAmount === null ? undefined : d.data().estimatedAmount,
            dueDate: d.data().dueDate === null ? undefined : d.data().dueDate,
        } as Envelope));
        // Note: Envelope order within categories is handled by client-side drag-and-drop persistence.
        // If specific server-side ordering is needed, it would require an 'order' field.
        setEnvelopes(fetchedEnvelopes);


        // Fetch Transactions (ordered by date descending)
        const transactionsQuery = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const fetchedTransactions = transactionsSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            description: d.data().description === null ? undefined : d.data().description,
            envelopeId: d.data().envelopeId === null ? undefined : d.data().envelopeId,
            isTransfer: d.data().isTransfer === null ? undefined : d.data().isTransfer,
        } as Transaction));
        setTransactions(fetchedTransactions);

        // Fetch Payees (ordered by name ascending)
        const payeesQuery = query(collection(db, PAYEES_COLLECTION), orderBy("name", "asc"));
        const payeesSnapshot = await getDocs(payeesQuery);
        const fetchedPayees = payeesSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            category: d.data().category === null ? undefined : d.data().category,
        } as Payee));
        setPayees(fetchedPayees);

        // Fetch App Metadata (Categories, OrderedCategories, LastModified)
        const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
        const metadataDocSnap = await getDoc(metadataDocRef);

        if (metadataDocSnap.exists()) {
          const metadata = metadataDocSnap.data();
          setCategories(Array.isArray(metadata.categories) ? metadata.categories : deriveCategoriesFromEnvelopes(fetchedEnvelopes));
          setOrderedCategories(Array.isArray(metadata.orderedCategories) ? metadata.orderedCategories : (Array.isArray(metadata.categories) ? metadata.categories : deriveCategoriesFromEnvelopes(fetchedEnvelopes)));
          
          const lm = metadata.lastModified;
          if (lm && lm instanceof Timestamp) {
            setLastModified(formatISO(lm.toDate()));
          } else if (typeof lm === 'string') { // Fallback for older string format if any
            setLastModified(lm);
          } else {
             setLastModified(null);
          }

        } else {
          // Initialize metadata if it doesn't exist
          const initialCategories = deriveCategoriesFromEnvelopes(fetchedEnvelopes);
          setCategories(initialCategories);
          setOrderedCategories(initialCategories);
          setLastModified(null); // Or set current time after writing
          await setDoc(metadataDocRef, {
            categories: initialCategories,
            orderedCategories: initialCategories,
            lastModified: serverTimestamp()
          });
        }

      } catch (error) {
        console.error("Failed to load data from Firestore:", error);
        // Set to empty arrays on error to prevent app crash
        setAccounts([]);
        setEnvelopes([]);
        setTransactions([]);
        setPayees([]);
        setCategories([]);
        setOrderedCategories([]);
        setLastModified(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  const addAccount = async (accountData: AccountFormData) => {
    const newAccount: Omit<Account, 'id'> = {
      ...accountData,
      createdAt: formatISO(new Date()),
    };
    try {
      const docRef = doc(collection(db, ACCOUNTS_COLLECTION));
      await setDoc(docRef, newAccount);
      setAccounts(prev => [...prev, { id: docRef.id, ...newAccount }].sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) {
      console.error("Error adding account to Firestore:", error);
    }
  };

  const updateAccount = async (accountData: AccountWithId) => {
    const { id, ...dataToUpdate } = accountData;
    try {
      const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
      await updateDoc(accountDocRef, dataToUpdate);
      setAccounts(prevAccounts =>
        prevAccounts.map(acc =>
          acc.id === id ? { ...acc, ...dataToUpdate } : acc
        ).sort((a,b)=>a.name.localeCompare(b.name))
      );
      await updateLastModified();
    } catch (error) {
      console.error("Error updating account in Firestore:", error);
    }
  };

  const addEnvelope = async (envelopeData: EnvelopeFormData) => {
    const newEnvelopeData: Omit<Envelope, 'id'> = {
      name: envelopeData.name,
      budgetAmount: envelopeData.budgetAmount,
      estimatedAmount: (typeof envelopeData.estimatedAmount === 'number' && !isNaN(envelopeData.estimatedAmount)) ? envelopeData.estimatedAmount : undefined,
      category: envelopeData.category,
      dueDate: (typeof envelopeData.dueDate === 'number' && !isNaN(envelopeData.dueDate) && envelopeData.dueDate >= 1 && envelopeData.dueDate <= 31) ? envelopeData.dueDate : undefined,
      createdAt: formatISO(startOfDay(new Date())),
    };
    try {
      const docRef = doc(collection(db, ENVELOPES_COLLECTION));
      await setDoc(docRef, newEnvelopeData);
      const newEnvelopeWithId = { id: docRef.id, ...newEnvelopeData };
      setEnvelopes(prev => [...prev, newEnvelopeWithId]); // Order might need adjustment based on category/dnd

      let updatedCategories = categories;
      let updatedOrderedCategories = orderedCategories;

      if (!categories.some(cat => cat.toLowerCase() === newEnvelopeData.category.toLowerCase())) {
        updatedCategories = [...categories, newEnvelopeData.category].sort((a, b) => a.localeCompare(b));
        setCategories(updatedCategories);
        updatedOrderedCategories = [...orderedCategories, newEnvelopeData.category];
        setOrderedCategories(updatedOrderedCategories);
      }
      
      const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
      await updateDoc(metadataDocRef, { 
        categories: updatedCategories, 
        orderedCategories: updatedOrderedCategories,
        lastModified: serverTimestamp() 
      });
      // await updateLastModified(); // Covered by metadata update
    } catch (error) {
      console.error("Error adding envelope to Firestore:", error);
    }
  };

  const updateEnvelope = async (envelopeData: Partial<Envelope> & { id: string }) => {
    const { id, ...dataToUpdate } = envelopeData;
     const cleanDataToUpdate = {
        ...dataToUpdate,
        estimatedAmount: (typeof dataToUpdate.estimatedAmount === 'number' && !isNaN(dataToUpdate.estimatedAmount)) ? dataToUpdate.estimatedAmount : undefined,
        dueDate: (typeof dataToUpdate.dueDate === 'number' && !isNaN(dataToUpdate.dueDate) && dataToUpdate.dueDate >=1 && dataToUpdate.dueDate <=31) ? dataToUpdate.dueDate : undefined,
    };

    try {
      const envelopeDocRef = doc(db, ENVELOPES_COLLECTION, id);
      await updateDoc(envelopeDocRef, cleanDataToUpdate);
      
      let oldCategory: string | undefined;
      let newCategory: string | undefined = cleanDataToUpdate.category;

      setEnvelopes(prevEnvelopes => {
        const updatedEnvelopes = prevEnvelopes.map(env => {
            if (env.id === id) {
                oldCategory = env.category;
                return { ...env, ...cleanDataToUpdate };
            }
            return env;
        });

        // After updating envelopes, check if category lists need adjustment
        const currentDerivedCategories = deriveCategoriesFromEnvelopes(updatedEnvelopes);
        setCategories(currentDerivedCategories); 

        setOrderedCategories(prevOrdered => {
            let newOrdered = [...prevOrdered];
            if (newCategory && !newOrdered.includes(newCategory)) {
                newOrdered.push(newCategory);
            }
            if (oldCategory && !currentDerivedCategories.includes(oldCategory)) {
                newOrdered = newOrdered.filter(cat => cat !== oldCategory);
            }
            newOrdered = newOrdered.filter(cat => currentDerivedCategories.includes(cat));
            currentDerivedCategories.forEach(cat => {
                if (!newOrdered.includes(cat)) {
                    newOrdered.push(cat);
                }
            });
             // Persist category changes to Firestore metadata
            const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
            updateDoc(metadataDocRef, { categories: currentDerivedCategories, orderedCategories: newOrdered, lastModified: serverTimestamp() })
                .catch(err => console.error("Error updating categories in Firestore after envelope update:", err));
            return newOrdered;
        });
        return updatedEnvelopes;
      });
      // updateLastModified() handled by metadata update
    } catch (error) {
      console.error("Error updating envelope in Firestore:", error);
    }
  };

  const updateEnvelopeOrder = async (reorderedEnvelopes: Envelope[]) => {
    setEnvelopes(reorderedEnvelopes); // Local state update is immediate for UX
    // For Firestore, this is more complex. If order is critical to persist per-category,
    // each envelope might need an 'orderIndex' field, or categories store ordered lists of envelope IDs.
    // For now, relying on client-side persistence of the full 'envelopes' array after drag might not be efficient.
    // This function assumes the order is mainly for client-side display within categories.
    // True persistence of drag-and-drop order across sessions would require more specific Firestore updates.
    // Consider updating all envelope documents if an 'order' field is added, or handle ordering on fetch.
    // Let's assume for now that drag-and-drop changes are client-side visual sorting primarily.
    // If full persistence of this new order is required, a batch write to update an 'order' field on each envelope would be needed.
    // For now, this function will only update the local state.
    // A more robust solution would involve updating an 'orderIndex' field on each envelope in Firestore.
    // This is a placeholder for more complex server-side order persistence.
    console.warn("updateEnvelopeOrder currently only updates local state. Full persistence of drag-and-drop order to Firestore is more complex.");
    await updateLastModified(); // Indicate some change occurred.
  };

  const updateCategoryOrder = async (newOrder: string[]) => {
    const currentCategorySet = new Set(categories);
    const newOrderSet = new Set(newOrder);

    if (currentCategorySet.size !== newOrderSet.size || ![...currentCategorySet].every(cat => newOrderSet.has(cat))) {
        console.error("Category order update failed: Mismatched categories.");
        return;
    }
    try {
      const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
      await updateDoc(metadataDocRef, { orderedCategories: newOrder, lastModified: serverTimestamp() });
      setOrderedCategories(newOrder);
      // updateLastModified() handled by metadata update
    } catch (error) {
      console.error("Error updating category order in Firestore:", error);
    }
  };

  const addTransaction = useCallback(async (transactionData: TransactionFormData) => {
    if (!transactionData.payeeId) {
      console.error("Cannot add transaction without a payee ID.");
      return;
    }
    const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
        console.error("Invalid date provided for transaction:", transactionData.date);
        return;
    }

    const newTransactionData: Omit<Transaction, 'id'> = {
      accountId: transactionData.accountId,
      envelopeId: transactionData.envelopeId || undefined,
      payeeId: transactionData.payeeId,
      amount: Number(transactionData.amount),
      type: transactionData.type,
      description: transactionData.description || undefined,
      date: formatISO(parsedDate),
      createdAt: formatISO(new Date()),
      isTransfer: transactionData.isTransfer || false,
    };
    try {
      const docRef = doc(collection(db, TRANSACTIONS_COLLECTION));
      await setDoc(docRef, newTransactionData);
      setTransactions(prev => [...prev, {id: docRef.id, ...newTransactionData}].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      await updateLastModified();
    } catch (error) {
      console.error("Error adding transaction to Firestore:", error);
    }
  }, []);


  const updateTransaction = useCallback(async (transactionData: TransactionWithId) => {
    const { id, ...dataToUpdate } = transactionData;
    if (!id) {
        console.error("Cannot update transaction without an ID.");
        return;
    }
    if (!dataToUpdate.payeeId) {
        console.error("Cannot update transaction without a payee ID.");
        return;
    }
    const parsedDate = dataToUpdate.date ? parseISO(dataToUpdate.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
        console.error("Invalid date provided for transaction update:", dataToUpdate.date);
        return;
    }

    const cleanedData: Partial<Omit<Transaction, 'id'>> = {
        ...dataToUpdate,
        amount: dataToUpdate.amount !== undefined ? Number(dataToUpdate.amount) : undefined,
        envelopeId: dataToUpdate.envelopeId === null ? undefined : dataToUpdate.envelopeId,
        description: dataToUpdate.description === null ? undefined : dataToUpdate.description,
        date: formatISO(parsedDate), // Always update date based on input
        isTransfer: dataToUpdate.isTransfer !== undefined ? dataToUpdate.isTransfer : undefined,
    };
    // Remove undefined fields to avoid overwriting with undefined in Firestore update
    Object.keys(cleanedData).forEach(key => cleanedData[key as keyof typeof cleanedData] === undefined && delete cleanedData[key as keyof typeof cleanedData]);


    try {
      const transactionDocRef = doc(db, TRANSACTIONS_COLLECTION, id);
      await updateDoc(transactionDocRef, cleanedData);
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === id ? { ...tx, ...cleanedData } : tx
        ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      );
      await updateLastModified();
    } catch (error) {
      console.error("Error updating transaction in Firestore:", error);
    }
  }, []);

  const addPayee = async (payeeData: PayeeFormData) => {
    const newPayeeData: Omit<Payee, 'id'> = {
      name: payeeData.name,
      category: payeeData.category?.trim() ? payeeData.category.trim() : undefined,
      createdAt: formatISO(new Date()),
    };
    try {
      const docRef = doc(collection(db, PAYEES_COLLECTION));
      await setDoc(docRef, newPayeeData);
      setPayees(prev => [...prev, { id: docRef.id, ...newPayeeData }].sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) {
      console.error("Error adding payee to Firestore:", error);
    }
  };

  const updatePayee = useCallback(async (payeeData: PayeeWithId) => {
    const { id, ...dataToUpdate } = payeeData;
     const cleanedData = {
        name: dataToUpdate.name,
        category: dataToUpdate.category?.trim() ? dataToUpdate.category.trim() : undefined,
    };
    try {
      const payeeDocRef = doc(db, PAYEES_COLLECTION, id);
      await updateDoc(payeeDocRef, cleanedData);
      setPayees(prevPayees =>
        prevPayees.map(payee =>
          payee.id === id ? { ...payee, ...cleanedData } : payee
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      await updateLastModified();
    } catch (error) {
      console.error("Error updating payee in Firestore:", error);
    }
  }, []);

  const addCategory = async (categoryName: string) => {
    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) return;

    if (!categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
        const newCategories = [...categories, trimmedName].sort((a,b)=>a.localeCompare(b));
        const newOrderedCategories = [...orderedCategories, trimmedName]; // Add to end of ordered list

        try {
            const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
            await updateDoc(metadataDocRef, {
                categories: newCategories,
                orderedCategories: newOrderedCategories,
                lastModified: serverTimestamp()
            });
            setCategories(newCategories);
            setOrderedCategories(newOrderedCategories);
            // updateLastModified() handled by metadata update
        } catch (error) {
            console.error("Error adding category to Firestore:", error);
        }
    } else {
        console.warn(`Category "${trimmedName}" already exists.`);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, transactionId));
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      await updateLastModified();
    } catch (error) {
      console.error("Error deleting transaction from Firestore:", error);
    }
  };

  const deleteEnvelope = useCallback(async (envelopeId: string) => {
    const envelopeToDelete = envelopes.find(env => env.id === envelopeId);
    if (!envelopeToDelete) return;

    try {
      const batch = writeBatch(db);
      const envelopeDocRef = doc(db, ENVELOPES_COLLECTION, envelopeId);
      batch.delete(envelopeDocRef);

      // Detach transactions - this query could be large, consider alternatives for performance
      const relatedTransactions = transactions.filter(tx => tx.envelopeId === envelopeId);
      relatedTransactions.forEach(tx => {
        const txDocRef = doc(db, TRANSACTIONS_COLLECTION, tx.id);
        batch.update(txDocRef, { envelopeId: null }); // Set to null or delete field
      });
      
      const updatedEnvelopes = envelopes.filter(env => env.id !== envelopeId);
      const remainingCategories = deriveCategoriesFromEnvelopes(updatedEnvelopes);
      let newOrderedCategories = orderedCategories;
      if (!remainingCategories.includes(envelopeToDelete.category)) {
          newOrderedCategories = orderedCategories.filter(cat => cat !== envelopeToDelete.category);
      }
      newOrderedCategories = newOrderedCategories.filter(cat => remainingCategories.includes(cat));
      remainingCategories.forEach(cat => {
        if(!newOrderedCategories.includes(cat)) newOrderedCategories.push(cat);
      });


      const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
      batch.update(metadataDocRef, {
        categories: remainingCategories,
        orderedCategories: newOrderedCategories,
        lastModified: serverTimestamp()
      });

      await batch.commit();

      setEnvelopes(updatedEnvelopes);
      setTransactions(prev => prev.map(tx => tx.envelopeId === envelopeId ? { ...tx, envelopeId: undefined } : tx ));
      setCategories(remainingCategories);
      setOrderedCategories(newOrderedCategories);
      // updateLastModified() handled by metadata update
    } catch (error) {
      console.error("Error deleting envelope and updating transactions in Firestore:", error);
    }
  }, [envelopes, transactions, categories, orderedCategories]);


  const transferBetweenEnvelopes = useCallback(async (data: TransferEnvelopeFundsFormData) => {
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
        const newPayeeData: Omit<Payee, 'id'> = {
            name: "Internal Budget Transfer",
            createdAt: formatISO(new Date()),
        };
        const payeeDocRef = doc(db, PAYEES_COLLECTION, newPayeeId); // Use explicit ID
        await setDoc(payeeDocRef, newPayeeData);
        internalTransferPayee = {id: newPayeeId, ...newPayeeData};
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
    }

    const expenseTxData: TransactionFormData = {
      accountId, envelopeId: fromEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'expense',
      description: description || `Transfer to ${toEnvelope.name}`, date, isTransfer: false,
    };
    const incomeTxData: TransactionFormData = {
      accountId, envelopeId: toEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'income',
      description: description || `Transfer from ${fromEnvelope.name}`, date, isTransfer: false,
    };
    
    // addTransaction will handle Firestore write and local state update
    await addTransaction(expenseTxData);
    await addTransaction(incomeTxData);
    // updateLastModified is handled by addTransaction calls
  }, [addTransaction, envelopes, payees]);


  const transferBetweenAccounts = useCallback(async (data: TransferAccountFundsFormData) => {
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
        const newPayeeData: Omit<Payee, 'id'> = {
            name: "Internal Account Transfer",
            createdAt: formatISO(new Date()),
        };
        const payeeDocRef = doc(db, PAYEES_COLLECTION, newPayeeId);
        await setDoc(payeeDocRef, newPayeeData);
        internalTransferPayee = {id: newPayeeId, ...newPayeeData};
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
    }

    const expenseTxData: TransactionFormData = {
        accountId: fromAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'expense',
        description: description || `Transfer to ${toAccount.name}`, date, isTransfer: true,
    };
    const incomeTxData: TransactionFormData = {
        accountId: toAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'income',
        description: description || `Transfer from ${fromAccount.name}`, date, isTransfer: true,
    };
    await addTransaction(expenseTxData);
    await addTransaction(incomeTxData);
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
          if (tx.envelopeId !== envelopeId || tx.type !== 'expense') return false;
          const txDate = parseISO(tx.date);
          return isValid(txDate) && isWithinInterval(txDate, targetPeriod);
      })
      .reduce((sum, tx) => (sum + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0)), 0);
      return isNaN(spending) ? 0 : spending;
  }, [transactions]);

  const getEnvelopeBalanceWithRollover = useCallback((envelopeId: string): number => {
    const envelope = envelopes.find(env => env.id === envelopeId);
    if (!envelope || !envelope.createdAt) return 0;
    const creationDate = parseISO(envelope.createdAt);
    if (!isValid(creationDate)) return 0;

    const currentDate = new Date();
    if (creationDate > currentDate) return 0;
    const monthsActive = differenceInCalendarMonths(currentDate, creationDate) + 1;
    if (monthsActive <= 0 || isNaN(monthsActive)) return 0;

    const budgetAmount = typeof envelope.budgetAmount === 'number' && !isNaN(envelope.budgetAmount) ? envelope.budgetAmount : 0;
    const initialBudgetFunding = monthsActive * budgetAmount;

    const relevantTransactions = transactions.filter(tx => {
        if (tx.envelopeId !== envelopeId) return false;
        const txDate = parseISO(tx.date);
        return isValid(txDate) && txDate >= startOfDay(creationDate);
    });

    const transfersIn = relevantTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => (sum + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0)), 0);
    const spendingAndTransfersOut = relevantTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => (sum + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0)), 0);

    const balance = initialBudgetFunding + transfersIn - spendingAndTransfersOut;
    return isNaN(balance) ? 0 : balance;
  }, [envelopes, transactions]);

  const getPayeeTransactions = useCallback((payeeId: string): Transaction[] => {
    return transactions
        .filter(tx => tx.payeeId === payeeId)
        .sort((a, b) => {
            const dateA = parseISO(a.date); const dateB = parseISO(b.date);
            if (!isValid(dateA)) return 1; if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
  }, [transactions]);

  const getMonthlyIncomeTotal = useCallback((): number => {
    const now = new Date(); const monthStart = startOfMonth(now); const monthEnd = endOfMonth(now);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'income' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        return total + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  const getMonthlySpendingTotal = useCallback((): number => {
    const now = new Date(); const monthStart = startOfMonth(now); const monthEnd = endOfMonth(now);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'expense' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        return total + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  const getTotalMonthlyBudgeted = useCallback((): number => {
    return envelopes.reduce((total, env) => (total + (typeof env.budgetAmount === 'number' && !isNaN(env.budgetAmount) ? env.budgetAmount : 0)), 0);
  }, [envelopes]);

  const getYtdIncomeTotal = useCallback((): number => {
    const now = new Date(); const yearStart = startOfYear(now); const todayEnd = endOfDay(now);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'income' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: yearStart, end: todayEnd })) {
        return total + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  return (
    <AppContext.Provider value={{
      accounts, envelopes, transactions, payees, categories, orderedCategories, lastModified,
      addAccount, updateAccount, addEnvelope, addTransaction, updateTransaction, addPayee, updatePayee,
      addCategory, updateCategoryOrder, updateEnvelope, updateEnvelopeOrder, deleteTransaction, deleteEnvelope,
      transferBetweenEnvelopes, transferBetweenAccounts,
      getAccountBalance, getAccountById, getEnvelopeById, getEnvelopeSpending, getEnvelopeBalanceWithRollover,
      getPayeeTransactions, getMonthlyIncomeTotal, getMonthlySpendingTotal, getTotalMonthlyBudgeted, getYtdIncomeTotal,
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
