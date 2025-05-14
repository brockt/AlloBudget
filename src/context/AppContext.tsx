"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, PayeeWithId, TransferEnvelopeFundsFormData, AccountWithId, TransferAccountFundsFormData, AppContextType, TransactionWithId } from '@/types';
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid, differenceInCalendarMonths, startOfDay, startOfYear, endOfDay } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
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
  getDoc,
  deleteField, // For removing fields like optional ones
} from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Firestore Collection Names (base names, userId will be prefixed)
const ACCOUNTS_COLLECTION = 'accounts';
const ENVELOPES_COLLECTION = 'envelopes';
const TRANSACTIONS_COLLECTION = 'transactions';
const PAYEES_COLLECTION = 'payees';
const APP_METADATA_COLLECTION = 'app_metadata';
const APP_METADATA_DOC_ID = 'main'; // Document ID for user-specific metadata

type PayeeWithOptionalCategory = Omit<Payee, 'id' | 'category'> & { category?: string };

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastModified, setLastModified] = useState<string | null>(null);

  const getCollectionPath = useCallback((collectionName: string) => {
    if (!currentUser) return null;
    return `users/${currentUser.uid}/${collectionName}`;
  }, [currentUser]);

  const getDocPath = useCallback((collectionName: string, docId: string) => {
    if (!currentUser) return null;
    return `users/${currentUser.uid}/${collectionName}/${docId}`;
  }, [currentUser]);
  
  const getMetadataDocRef = useCallback(() => {
    if (!currentUser) return null;
    return doc(db, `users/${currentUser.uid}/${APP_METADATA_COLLECTION}`, APP_METADATA_DOC_ID);
  }, [currentUser]);


  const updateLastModified = useCallback(async () => {
    console.log("AppContext: Attempting to update lastModified timestamp...");
    if (!db || !currentUser) {
      console.error("AppContext: Firestore db instance or current user is not available for updateLastModified.");
      return;
    }
    try {
      const metadataDocRef = getMetadataDocRef();
      if (!metadataDocRef) return;
      await setDoc(metadataDocRef, { lastModified: serverTimestamp() }, { merge: true });
      console.log("AppContext: Successfully updated lastModified timestamp for user:", currentUser.uid);
    } catch (error) {
      console.error("AppContext: Error updating lastModified timestamp in Firestore for user:", currentUser.uid, error);
    }
  }, [currentUser, getMetadataDocRef]);

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
      if (!currentUser) {
        console.log("AppContext: No authenticated user. Clearing data and stopping fetch.");
        setAccounts([]); setEnvelopes([]); setTransactions([]); setPayees([]);
        setCategories([]); setOrderedCategories([]); setLastModified(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      console.log(`AppContext: Starting data fetch for user ${currentUser.uid}...`);
      if (!db) {
        console.error("AppContext: Firestore db instance is not available for fetchData.");
        setIsLoading(false);
        return;
      }
      try {
        const accountsPath = getCollectionPath(ACCOUNTS_COLLECTION);
        const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
        const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);

        if (!accountsPath || !envelopesPath || !transactionsPath || !payeesPath) {
            console.error("AppContext: Could not construct collection paths for fetching data.");
            setIsLoading(false);
            return;
        }

        const accountsSnapshot = await getDocs(collection(db, accountsPath));
        const fetchedAccounts = accountsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account))
         .sort((a,b) => a.name.localeCompare(b.name));
        setAccounts(fetchedAccounts);

        const envelopesSnapshot = await getDocs(collection(db, envelopesPath));
        const fetchedEnvelopes = envelopesSnapshot.docs.map(d => ({
            id: d.id, ...d.data(),
            estimatedAmount: d.data().estimatedAmount === null || d.data().estimatedAmount === undefined ? undefined : d.data().estimatedAmount,
            dueDate: d.data().dueDate === null || d.data().dueDate === undefined ? undefined : d.data().dueDate,
        } as Envelope));
        setEnvelopes(fetchedEnvelopes);

        const transactionsQuery = query(collection(db, transactionsPath), orderBy("date", "desc"));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const fetchedTransactions = transactionsSnapshot.docs.map(d => ({
            id: d.id, ...d.data(),
            description: d.data().description === null || d.data().description === undefined ? undefined : d.data().description,
            envelopeId: d.data().envelopeId === null || d.data().envelopeId === undefined ? undefined : d.data().envelopeId,
            isTransfer: !!d.data().isTransfer,
        } as Transaction));
        setTransactions(fetchedTransactions);

        const payeesQuery = query(collection(db, payeesPath), orderBy("name", "asc"));
        const payeesSnapshot = await getDocs(payeesQuery);
        const fetchedPayees = payeesSnapshot.docs.map(d => ({
            id: d.id, ...d.data(),
            category: d.data().category === null || d.data().category === undefined ? undefined : d.data().category,
        } as Payee));
        setPayees(fetchedPayees);
        
        const metadataDocRef = getMetadataDocRef();
        if (!metadataDocRef) {
            console.error("AppContext: Metadata doc ref is null, cannot fetch metadata.");
            setIsLoading(false);
            return;
        }
        const metadataDocSnap = await getDoc(metadataDocRef);
        
        if (metadataDocSnap.exists()) {
          const metadata = metadataDocSnap.data();
          setCategories(Array.isArray(metadata.categories) ? metadata.categories : deriveCategoriesFromEnvelopes(fetchedEnvelopes));
          setOrderedCategories(Array.isArray(metadata.orderedCategories) ? metadata.orderedCategories : (Array.isArray(metadata.categories) ? metadata.categories : deriveCategoriesFromEnvelopes(fetchedEnvelopes)));
          const lm = metadata.lastModified;
          if (lm && lm instanceof Timestamp) setLastModified(formatISO(lm.toDate()));
          else if (typeof lm === 'string') setLastModified(lm);
          else setLastModified(null);
        } else {
          const initialCategories = deriveCategoriesFromEnvelopes(fetchedEnvelopes);
          setCategories(initialCategories);
          setOrderedCategories(initialCategories);
          setLastModified(null); 
          await setDoc(metadataDocRef, { categories: initialCategories, orderedCategories: initialCategories, lastModified: serverTimestamp() });
        }
        console.log(`AppContext: Data fetching successful for user ${currentUser.uid}.`);
      } catch (error) {
        console.error(`AppContext: CRITICAL ERROR during fetchData for user ${currentUser.uid}:`, error);
        setAccounts([]); setEnvelopes([]); setTransactions([]); setPayees([]);
        setCategories([]); setOrderedCategories([]); setLastModified(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, getCollectionPath, getMetadataDocRef]); // Depend on currentUser and path getters


  const addAccount = async (accountData: AccountFormData) => {
    if (!db || !currentUser) return;
    const accountsPath = getCollectionPath(ACCOUNTS_COLLECTION);
    if (!accountsPath) return;

    const newAccount: Omit<Account, 'id'> = {
      userId: currentUser.uid,
      ...accountData,
      createdAt: formatISO(new Date())
    };
    try {
      const docRef = doc(collection(db, accountsPath));
      await setDoc(docRef, newAccount);
      setAccounts(prev => [...prev, { id: docRef.id, ...newAccount }].sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) { console.error("Error adding account:", error); }
  };

  const updateAccount = async (accountData: AccountWithId) => {
    if (!db || !currentUser) return;
    const { id, ...dataToUpdate } = accountData;
    const accountDocPath = getDocPath(ACCOUNTS_COLLECTION, id);
    if (!accountDocPath) return;

    try {
      await updateDoc(doc(db, accountDocPath), dataToUpdate);
      setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...dataToUpdate } : acc).sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) { console.error("Error updating account:", error); }
  };

  const addEnvelope = async (envelopeData: EnvelopeFormData) => {
    if (!db || !currentUser) return;
    const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
    const metadataDocRef = getMetadataDocRef();
    if (!envelopesPath || !metadataDocRef) return;

    const newEnvelopeData: Omit<Envelope, 'id'> = {
      userId: currentUser.uid,
      ...envelopeData,
      estimatedAmount: envelopeData.estimatedAmount ?? undefined,
      dueDate: envelopeData.dueDate ?? undefined,
      createdAt: formatISO(startOfDay(new Date())),
    };
    try {
      const docRef = doc(collection(db, envelopesPath));
      await setDoc(docRef, newEnvelopeData);
      const newEnvelopeWithId = { id: docRef.id, ...newEnvelopeData };
      setEnvelopes(prev => [...prev, newEnvelopeWithId]); 

      let updatedCategories = categories;
      let updatedOrderedCategories = orderedCategories;
      if (!categories.some(cat => cat.toLowerCase() === newEnvelopeData.category.toLowerCase())) {
        updatedCategories = [...categories, newEnvelopeData.category].sort((a, b) => a.localeCompare(b));
        setCategories(updatedCategories);
        updatedOrderedCategories = [...orderedCategories, newEnvelopeData.category]; 
        setOrderedCategories(updatedOrderedCategories);
      }
      await updateDoc(metadataDocRef, { categories: updatedCategories, orderedCategories: updatedOrderedCategories });
      await updateLastModified();
    } catch (error) { console.error("Error adding envelope:", error); }
  };

  const updateEnvelope = async (envelopeData: Partial<Envelope> & { id: string }) => {
    if (!db || !currentUser) return;
    const { id, ...dataToUpdate } = envelopeData;
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, id);
    const metadataDocRef = getMetadataDocRef();
    if (!envelopeDocPath || !metadataDocRef) return;

    const cleanDataToUpdate: Partial<Envelope> = { ...dataToUpdate };
    if (dataToUpdate.estimatedAmount === null || dataToUpdate.estimatedAmount === undefined) {
        cleanDataToUpdate.estimatedAmount = undefined; // Or deleteField() if you want to remove it
    }
    if (dataToUpdate.dueDate === null || dataToUpdate.dueDate === undefined) {
        cleanDataToUpdate.dueDate = undefined; // Or deleteField()
    }

    try {
      await updateDoc(doc(db, envelopeDocPath), cleanDataToUpdate);
      let oldCategory: string | undefined;
      let newCategory: string | undefined = cleanDataToUpdate.category;

      setEnvelopes(prevEnvelopes => {
        const updatedEnvelopesList = prevEnvelopes.map(env => {
            if (env.id === id) {
                oldCategory = env.category;
                return { ...env, ...cleanDataToUpdate };
            }
            return env;
        });

        const currentDerivedCategories = deriveCategoriesFromEnvelopes(updatedEnvelopesList);
        setCategories(currentDerivedCategories); 

        setOrderedCategories(prevOrdered => {
            let newOrdered = [...prevOrdered];
            if (newCategory && !newOrdered.includes(newCategory)) newOrdered.push(newCategory);
            if (oldCategory && !currentDerivedCategories.includes(oldCategory)) newOrdered = newOrdered.filter(cat => cat !== oldCategory);
            newOrdered = newOrdered.filter(cat => currentDerivedCategories.includes(cat));
            currentDerivedCategories.forEach(cat => { if (!newOrdered.includes(cat)) newOrdered.push(cat); });
            
            updateDoc(metadataDocRef, { categories: currentDerivedCategories, orderedCategories: newOrdered })
                .catch(err => console.error("Error updating metadata in updateEnvelope:", err));
            return newOrdered;
        });
        return updatedEnvelopesList;
      });
      await updateLastModified();
    } catch (error) { console.error("Error updating envelope:", error); }
  };
  
  const updateEnvelopeOrder = async (reorderedEnvelopes: Envelope[]) => {
    // This is primarily a local UI state update.
    // For persistent order, each envelope would need an 'orderIndex' field in Firestore.
    setEnvelopes(reorderedEnvelopes);
    // If you implement orderIndex, you'd batch update those here.
  };

  const updateCategoryOrder = async (newOrder: string[]) => {
    if (!db || !currentUser) return;
    const metadataDocRef = getMetadataDocRef();
    if (!metadataDocRef) return;

    const currentCategorySet = new Set(categories);
    const newOrderSet = new Set(newOrder);
    if (currentCategorySet.size !== newOrderSet.size || ![...currentCategorySet].every(cat => newOrderSet.has(cat))) {
      console.error("Category order update failed: Mismatched categories.");
      return;
    }
    try {
      await updateDoc(metadataDocRef, { orderedCategories: newOrder });
      setOrderedCategories(newOrder);
      await updateLastModified();
    } catch (error) { console.error("Error updating category order:", error); }
  };

  const addTransaction = useCallback(async (transactionData: TransactionFormData) => {
    if (!db || !currentUser) return;
    const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
    if (!transactionsPath) return;

    if (!transactionData.payeeId) { console.error("Cannot add transaction without payeeId."); return; }
    const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
    if (!parsedDate || !isValid(parsedDate)) { console.error("Invalid date for transaction."); return; }

    const newTransactionData: Omit<Transaction, 'id'> = {
      userId: currentUser.uid,
      ...transactionData,
      amount: Number(transactionData.amount),
      envelopeId: transactionData.envelopeId || undefined,
      description: transactionData.description || undefined,
      date: formatISO(parsedDate),
      createdAt: formatISO(new Date()),
      isTransfer: !!transactionData.isTransfer,
    };
    try {
      const docRef = doc(collection(db, transactionsPath));
      await setDoc(docRef, newTransactionData);
      setTransactions(prev => [...prev, {id: docRef.id, ...newTransactionData}].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      await updateLastModified();
    } catch (error) { console.error("Error adding transaction:", error); }
  }, [currentUser, getCollectionPath, updateLastModified]);

  const updateTransaction = useCallback(async (transactionData: TransactionWithId) => {
    if (!db || !currentUser) return;
    const { id, ...dataToUpdate } = transactionData;
    const transactionDocPath = getDocPath(TRANSACTIONS_COLLECTION, id);
    if (!transactionDocPath) return;

    if (!dataToUpdate.payeeId) { console.error("Cannot update transaction without payeeId."); return; }
    const parsedDate = dataToUpdate.date ? parseISO(dataToUpdate.date) : null;
    if (!parsedDate || !isValid(parsedDate)) { console.error("Invalid date for transaction update."); return; }

    const cleanedData: Partial<Omit<Transaction, 'id'>> = {
        ...dataToUpdate,
        amount: dataToUpdate.amount !== undefined ? Number(dataToUpdate.amount) : undefined,
        envelopeId: dataToUpdate.envelopeId === null ? undefined : dataToUpdate.envelopeId,
        description: dataToUpdate.description === null || dataToUpdate.description === "" ? undefined : dataToUpdate.description,
        date: formatISO(parsedDate), 
        isTransfer: !!dataToUpdate.isTransfer,
    };
    
    // Remove undefined fields to avoid overwriting with undefined in Firestore
    Object.keys(cleanedData).forEach(key => cleanedData[key as keyof typeof cleanedData] === undefined && delete cleanedData[key as keyof typeof cleanedData]);


    try {
      await updateDoc(doc(db, transactionDocPath), cleanedData);
      setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...cleanedData } as Transaction : tx)
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      await updateLastModified();
    } catch (error) { console.error("Error updating transaction:", error); }
  }, [currentUser, getDocPath, updateLastModified]);

  const addPayee = async (payeeData: PayeeFormData) => {
    if (!db || !currentUser) return;
    const payeesPath = getCollectionPath(PAYEES_COLLECTION);
    if(!payeesPath) return;

    const newPayeeData: Omit<Payee, 'id'> = {
        userId: currentUser.uid,
        name: payeeData.name,
        createdAt: formatISO(new Date()),
        // Conditionally add category only if it has a value after trimming
        ...(payeeData.category?.trim() && { category: payeeData.category.trim() }),
    };

    try {
      const docRef = doc(collection(db, payeesPath));
      await setDoc(docRef, newPayeeData);
      setPayees(prev => [...prev, { id: docRef.id, ...newPayeeData } as Payee].sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) { console.error("Error adding payee:", error); }
  };

  const updatePayee = useCallback(async (payeeData: PayeeWithId) => {
    if (!db || !currentUser) return;
    const { id, ...dataToUpdate } = payeeData;
    const payeeDocPath = getDocPath(PAYEES_COLLECTION, id);
    if (!payeeDocPath) return;

    const cleanedData: Partial<Payee> = { name: dataToUpdate.name };
    if (dataToUpdate.category?.trim()) cleanedData.category = dataToUpdate.category.trim();
    else cleanedData.category = undefined; // Or deleteField()

    try {
      await updateDoc(doc(db, payeeDocPath), cleanedData );
      setPayees(prev => prev.map(p => p.id === id ? { ...p, ...cleanedData } as Payee : p)
        .sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) { console.error("Error updating payee:", error); }
  }, [currentUser, getDocPath, updateLastModified]);


  const addCategory = async (categoryName: string) => {
    if (!db || !currentUser) return;
    const metadataDocRef = getMetadataDocRef();
    if(!metadataDocRef) return;

    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) return;

    if (!categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
        const newCategories = [...categories, trimmedName].sort((a,b)=>a.localeCompare(b));
        const newOrderedCategories = [...orderedCategories, trimmedName]; 
        try {
            await updateDoc(metadataDocRef, { categories: newCategories, orderedCategories: newOrderedCategories });
            setCategories(newCategories);
            setOrderedCategories(newOrderedCategories);
            await updateLastModified();
        } catch (error) { console.error("Error adding category:", error); }
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!db || !currentUser) return;
    const transactionDocPath = getDocPath(TRANSACTIONS_COLLECTION, transactionId);
    if(!transactionDocPath) return;
    try {
      await deleteDoc(doc(db, transactionDocPath));
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      await updateLastModified();
    } catch (error) { console.error("Error deleting transaction:", error); }
  };

  const deleteEnvelope = useCallback(async (envelopeId: string) => {
    if (!db || !currentUser) return;
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, envelopeId);
    const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
    const metadataDocRef = getMetadataDocRef();

    if (!envelopeDocPath || !transactionsPath || !metadataDocRef) return;

    const envelopeToDelete = envelopes.find(env => env.id === envelopeId);
    if (!envelopeToDelete) return;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, envelopeDocPath));

      const relatedTransactions = transactions.filter(tx => tx.envelopeId === envelopeId);
      relatedTransactions.forEach(tx => {
        const txDocPath = getDocPath(TRANSACTIONS_COLLECTION, tx.id);
        if (txDocPath) batch.update(doc(db, txDocPath), { envelopeId: null }); 
      });
      
      const updatedEnvelopes = envelopes.filter(env => env.id !== envelopeId);
      const remainingCategories = deriveCategoriesFromEnvelopes(updatedEnvelopes);
      let newOrderedCategories = orderedCategories.filter(cat => cat !== envelopeToDelete.category && remainingCategories.includes(cat));
      remainingCategories.forEach(cat => { if(!newOrderedCategories.includes(cat)) newOrderedCategories.push(cat); });

      batch.update(metadataDocRef, { categories: remainingCategories, orderedCategories: newOrderedCategories });
      await batch.commit();

      setEnvelopes(updatedEnvelopes);
      setTransactions(prev => prev.map(tx => tx.envelopeId === envelopeId ? { ...tx, envelopeId: undefined } : tx ));
      setCategories(remainingCategories);
      setOrderedCategories(newOrderedCategories);
      await updateLastModified();
    } catch (error) { console.error("Error deleting envelope:", error); }
  }, [currentUser, envelopes, transactions, categories, orderedCategories, getDocPath, getCollectionPath, getMetadataDocRef, updateLastModified]);

  const transferBetweenEnvelopes = useCallback(async (data: TransferEnvelopeFundsFormData) => {
    if (!currentUser) return;
    const { fromEnvelopeId, toEnvelopeId, amount, accountId, date, description } = data;
    const fromEnvelope = envelopes.find(e => e.id === fromEnvelopeId);
    const toEnvelope = envelopes.find(e => e.id === toEnvelopeId);
    if (!fromEnvelope || !toEnvelope) { console.error("Invalid source/destination envelope for transfer."); return; }

    let internalTransferPayee = payees.find(p => p.name === "Internal Budget Transfer");
    if (!internalTransferPayee) {
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        if(!payeesPath) return;
        const payeeDocRef = doc(collection(db, payeesPath)); 
        const newPayeeData: Omit<Payee, 'id'> = { name: "Internal Budget Transfer", createdAt: formatISO(new Date())};
        await setDoc(payeeDocRef, newPayeeData);
        internalTransferPayee = {id: payeeDocRef.id, ...newPayeeData};
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
    }

    await addTransaction({
      accountId, envelopeId: fromEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'expense',
      description: description || `Transfer to ${toEnvelope.name}`, date, isTransfer: false, 
    });
    await addTransaction({
      accountId, envelopeId: toEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'income',
      description: description || `Transfer from ${fromEnvelope.name}`, date, isTransfer: false, 
    });
  }, [currentUser, addTransaction, envelopes, payees, getCollectionPath, setPayees]);


  const transferBetweenAccounts = useCallback(async (data: TransferAccountFundsFormData) => {
    if(!currentUser) return;
    const { fromAccountId, toAccountId, amount, date, description } = data;
    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    const toAccount = accounts.find(acc => acc.id === toAccountId);
    if (!fromAccount || !toAccount) { console.error("Invalid source/destination account for transfer."); return; }

    let internalTransferPayee = payees.find(p => p.name === "Internal Account Transfer");
    if (!internalTransferPayee) {
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        if(!payeesPath) return;
        const payeeDocRef = doc(collection(db, payeesPath)); 
        const newPayeeData: Omit<Payee, 'id'> = { name: "Internal Account Transfer", createdAt: formatISO(new Date())};
        await setDoc(payeeDocRef, newPayeeData);
        internalTransferPayee = {id: payeeDocRef.id, ...newPayeeData};
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
    }
    await addTransaction({
        accountId: fromAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'expense',
        description: description || `Transfer to ${toAccount.name}`, date, isTransfer: true,
    });
    await addTransaction({
        accountId: toAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'income',
        description: description || `Transfer from ${fromAccount.name}`, date, isTransfer: true,
    });
  }, [currentUser, addTransaction, accounts, payees, getCollectionPath, setPayees]);


  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;
    const balance = transactions.reduce((currentBalance, tx) => {
      if (tx.accountId === accountId) {
        const txAmount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;
        return tx.type === 'income' ? currentBalance + txAmount : currentBalance - txAmount;
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
    
    const monthsActive = differenceInCalendarMonths(currentDate, startOfDay(creationDate)) + 1;
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
