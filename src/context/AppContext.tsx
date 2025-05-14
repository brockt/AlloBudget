
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

  useEffect(() => {
    if (db && db.app && db.app.options) {
      console.log("AppContext: Firebase App Initialized. Attempting to connect to Project ID:", db.app.options.projectId);
    } else {
      console.error("AppContext: Firebase db instance or db.app.options is not available. Firebase might not be initialized correctly.");
    }
  }, []);

  const updateLastModified = async () => {
    console.log("AppContext: Attempting to update lastModified timestamp...");
    if (!db) {
      console.error("AppContext: Firestore db instance is not available for updateLastModified.");
      return;
    }
    try {
      const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
      // Using setDoc with merge:true will create the document if it doesn't exist,
      // or update the specified fields if it does.
      await setDoc(metadataDocRef, { lastModified: serverTimestamp() }, { merge: true });
      console.log("AppContext: Successfully updated lastModified timestamp.");
    } catch (error) {
      console.error("AppContext: Error updating lastModified timestamp in Firestore:", error);
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
      console.log("AppContext: Starting data fetch from Firestore...");
      if (!db) {
        console.error("AppContext: Firestore db instance is not available for fetchData.");
        setIsLoading(false);
        setAccounts([]); setEnvelopes([]); setTransactions([]); setPayees([]);
        setCategories([]); setOrderedCategories([]); setLastModified(null);
        return;
      }
      try {
        // Fetch Accounts
        const accountsSnapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
        const fetchedAccounts = accountsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account))
         .sort((a,b) => a.name.localeCompare(b.name));
        setAccounts(fetchedAccounts);
        console.log(`AppContext: Fetched ${fetchedAccounts.length} accounts.`);

        // Fetch Envelopes
        const envelopesSnapshot = await getDocs(collection(db, ENVELOPES_COLLECTION));
        const fetchedEnvelopes = envelopesSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            estimatedAmount: d.data().estimatedAmount === null ? undefined : d.data().estimatedAmount,
            dueDate: d.data().dueDate === null ? undefined : d.data().dueDate,
        } as Envelope));
        setEnvelopes(fetchedEnvelopes);
        console.log(`AppContext: Fetched ${fetchedEnvelopes.length} envelopes.`);


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
        console.log(`AppContext: Fetched ${fetchedTransactions.length} transactions.`);

        // Fetch Payees (ordered by name ascending)
        const payeesQuery = query(collection(db, PAYEES_COLLECTION), orderBy("name", "asc"));
        const payeesSnapshot = await getDocs(payeesQuery);
        const fetchedPayees = payeesSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            category: d.data().category === null ? undefined : d.data().category,
        } as Payee));
        setPayees(fetchedPayees);
        console.log(`AppContext: Fetched ${fetchedPayees.length} payees.`);

        // Fetch App Metadata (Categories, OrderedCategories, LastModified)
        const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
        console.log("AppContext: Attempting to fetch app metadata...");
        const metadataDocSnap = await getDoc(metadataDocRef);
        
        if (metadataDocSnap.exists()) {
          console.log("AppContext: App metadata document found.");
          const metadata = metadataDocSnap.data();
          setCategories(Array.isArray(metadata.categories) ? metadata.categories : deriveCategoriesFromEnvelopes(fetchedEnvelopes));
          setOrderedCategories(Array.isArray(metadata.orderedCategories) ? metadata.orderedCategories : (Array.isArray(metadata.categories) ? metadata.categories : deriveCategoriesFromEnvelopes(fetchedEnvelopes)));
          
          const lm = metadata.lastModified;
          if (lm && lm instanceof Timestamp) {
            setLastModified(formatISO(lm.toDate()));
            console.log("AppContext: LastModified (Timestamp):", formatISO(lm.toDate()));
          } else if (typeof lm === 'string') { 
            setLastModified(lm);
            console.log("AppContext: LastModified (string):", lm);
          } else {
             setLastModified(null);
             console.log("AppContext: LastModified not found or invalid format.");
          }
        } else {
          console.log("AppContext: App metadata document not found. Initializing...");
          const initialCategories = deriveCategoriesFromEnvelopes(fetchedEnvelopes);
          setCategories(initialCategories);
          setOrderedCategories(initialCategories);
          setLastModified(null); 
          await setDoc(metadataDocRef, {
            categories: initialCategories,
            orderedCategories: initialCategories,
            lastModified: serverTimestamp()
          });
          console.log("AppContext: Initialized app metadata in Firestore.");
        }
        console.log("AppContext: Data fetching successful.");
      } catch (error) {
        console.error("AppContext: CRITICAL ERROR during fetchData from Firestore:", error);
        if (error instanceof Error) {
          console.error("AppContext: Error name:", error.name);
          console.error("AppContext: Error message:", error.message);
          if (typeof error === 'object' && error !== null && 'code' in error) { 
              console.error("AppContext: Firestore error code:", (error as {code: string}).code);
          }
        }
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
        console.log("AppContext: Data fetching process complete. isLoading set to false.");
      }
    };

    fetchData();
  }, []);


  const addAccount = async (accountData: AccountFormData) => {
    console.log("AppContext: Attempting to add account:", accountData.name);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for addAccount. Account not saved.");
      return;
    }
    const newAccount: Omit<Account, 'id'> = {
      ...accountData,
      createdAt: formatISO(new Date()),
    };
    try {
      const docRef = doc(collection(db, ACCOUNTS_COLLECTION));
      await setDoc(docRef, newAccount);
      console.log("AppContext: Successfully added account to Firestore:", docRef.id);
      setAccounts(prev => [...prev, { id: docRef.id, ...newAccount }].sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error adding account to Firestore. Details:", error, "Data attempted:", newAccount);
    }
  };

  const updateAccount = async (accountData: AccountWithId) => {
    console.log("AppContext: Attempting to update account:", accountData.id);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for updateAccount. Account not updated.");
      return;
    }
    const { id, ...dataToUpdate } = accountData;
    try {
      const accountDocRef = doc(db, ACCOUNTS_COLLECTION, id);
      await updateDoc(accountDocRef, dataToUpdate);
      console.log("AppContext: Successfully updated account in Firestore:", id);
      setAccounts(prevAccounts =>
        prevAccounts.map(acc =>
          acc.id === id ? { ...acc, ...dataToUpdate } : acc
        ).sort((a,b)=>a.name.localeCompare(b.name))
      );
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error updating account in Firestore. Details:", error, "Data attempted:", dataToUpdate);
    }
  };

  const addEnvelope = async (envelopeData: EnvelopeFormData) => {
    console.log("AppContext: Attempting to add envelope:", envelopeData.name);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for addEnvelope. Envelope not saved.");
      return;
    }
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
      console.log("AppContext: Successfully added envelope to Firestore:", docRef.id);
      setEnvelopes(prev => [...prev, newEnvelopeWithId]); 

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
      });
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error adding envelope to Firestore. Details:", error, "Data attempted:", newEnvelopeData);
    }
  };

  const updateEnvelope = async (envelopeData: Partial<Envelope> & { id: string }) => {
    console.log("AppContext: Attempting to update envelope:", envelopeData.id);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for updateEnvelope. Envelope not updated.");
      return;
    }
    const { id, ...dataToUpdate } = envelopeData;
     const cleanDataToUpdate = {
        ...dataToUpdate,
        estimatedAmount: (typeof dataToUpdate.estimatedAmount === 'number' && !isNaN(dataToUpdate.estimatedAmount)) ? dataToUpdate.estimatedAmount : undefined,
        dueDate: (typeof dataToUpdate.dueDate === 'number' && !isNaN(dataToUpdate.dueDate) && dataToUpdate.dueDate >=1 && dataToUpdate.dueDate <=31) ? dataToUpdate.dueDate : undefined,
    };

    try {
      const envelopeDocRef = doc(db, ENVELOPES_COLLECTION, id);
      await updateDoc(envelopeDocRef, cleanDataToUpdate);
      console.log("AppContext: Successfully updated envelope in Firestore:", id);
      
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
            const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
            console.log("AppContext: Attempting to update categories/orderedCategories in metadata for envelope update.");
            updateDoc(metadataDocRef, { categories: currentDerivedCategories, orderedCategories: newOrdered })
                .then(() => console.log("AppContext: Successfully updated categories/orderedCategories in metadata."))
                .catch(err => console.error("AppContext: Error updating categories/orderedCategories in Firestore after envelope update. Details:", err));
            return newOrdered;
        });
        return updatedEnvelopes;
      });
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error updating envelope in Firestore. Details:", error, "Data attempted:", cleanDataToUpdate);
    }
  };

  const updateEnvelopeOrder = async (reorderedEnvelopes: Envelope[]) => {
    console.log("AppContext: Updating local envelope order.");
    setEnvelopes(reorderedEnvelopes); 
    // For now, this is a local-only sort. Persisting order would require
    // updating an 'orderIndex' on each envelope in Firestore, which is more complex.
    // await updateLastModified(); // Not calling this as it's a local UI concern for now.
  };

  const updateCategoryOrder = async (newOrder: string[]) => {
    console.log("AppContext: Attempting to update category order to:", newOrder);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for updateCategoryOrder. Order not saved.");
      return;
    }
    const currentCategorySet = new Set(categories);
    const newOrderSet = new Set(newOrder);

    if (currentCategorySet.size !== newOrderSet.size || ![...currentCategorySet].every(cat => newOrderSet.has(cat))) {
        console.error("AppContext: Category order update failed: Mismatched categories. Current:", categories, "New:", newOrder);
        return;
    }
    try {
      const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
      await updateDoc(metadataDocRef, { orderedCategories: newOrder });
      console.log("AppContext: Successfully updated category order in Firestore.");
      setOrderedCategories(newOrder);
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error updating category order in Firestore. Details:", error);
    }
  };

  const addTransaction = useCallback(async (transactionData: TransactionFormData) => {
    console.log("AppContext: Attempting to add transaction for amount:", transactionData.amount);
    if (!db) {
      console.error("AppContext: Firestore db instance is not available for addTransaction. Transaction not saved.");
      return;
    }
    if (!transactionData.payeeId) {
      console.error("AppContext: Cannot add transaction without a payee ID.");
      return;
    }
    const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
        console.error("AppContext: Invalid date provided for transaction:", transactionData.date);
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
      console.log("AppContext: Successfully added transaction to Firestore:", docRef.id);
      setTransactions(prev => [...prev, {id: docRef.id, ...newTransactionData}].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error adding transaction to Firestore. Details:", error, "Data attempted:", newTransactionData);
    }
  }, [setTransactions, updateLastModified]); // Added dependencies


  const updateTransaction = useCallback(async (transactionData: TransactionWithId) => {
    console.log("AppContext: Attempting to update transaction:", transactionData.id);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for updateTransaction. Transaction not updated.");
      return;
    }
    const { id, ...dataToUpdate } = transactionData;
    if (!id) {
        console.error("AppContext: Cannot update transaction without an ID.");
        return;
    }
    if (!dataToUpdate.payeeId) {
        console.error("AppContext: Cannot update transaction without a payee ID.");
        return;
    }
    const parsedDate = dataToUpdate.date ? parseISO(dataToUpdate.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
        console.error("AppContext: Invalid date provided for transaction update:", dataToUpdate.date);
        return;
    }

    const cleanedData: Partial<Omit<Transaction, 'id'>> = {
        ...dataToUpdate,
        amount: dataToUpdate.amount !== undefined ? Number(dataToUpdate.amount) : undefined,
        envelopeId: dataToUpdate.envelopeId === null ? undefined : dataToUpdate.envelopeId,
        description: dataToUpdate.description === null ? undefined : dataToUpdate.description,
        date: formatISO(parsedDate), 
        isTransfer: dataToUpdate.isTransfer !== undefined ? dataToUpdate.isTransfer : undefined,
    };
    
    Object.keys(cleanedData).forEach(key => cleanedData[key as keyof typeof cleanedData] === undefined && delete cleanedData[key as keyof typeof cleanedData]);

    try {
      const transactionDocRef = doc(db, TRANSACTIONS_COLLECTION, id);
      await updateDoc(transactionDocRef, cleanedData);
      console.log("AppContext: Successfully updated transaction in Firestore:", id);
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === id ? { ...tx, ...cleanedData } : tx
        ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      );
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error updating transaction in Firestore. Details:", error, "Data attempted:", cleanedData);
    }
  }, [setTransactions, updateLastModified]); // Added dependencies

  const addPayee = async (payeeData: PayeeFormData) => {
    console.log("AppContext: Attempting to add payee:", payeeData.name);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for addPayee. Payee not saved.");
      return;
    }
    const newPayeeData: Omit<Payee, 'id'> = {
      name: payeeData.name,
      category: payeeData.category?.trim() ? payeeData.category.trim() : undefined,
      createdAt: formatISO(new Date()),
    };
    try {
      const docRef = doc(collection(db, PAYEES_COLLECTION));
      await setDoc(docRef, newPayeeData);
      console.log("AppContext: Successfully added payee to Firestore:", docRef.id);
      setPayees(prev => [...prev, { id: docRef.id, ...newPayeeData }].sort((a,b)=>a.name.localeCompare(b.name)));
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error adding payee to Firestore. Details:", error, "Data attempted:", newPayeeData);
    }
  };

  const updatePayee = useCallback(async (payeeData: PayeeWithId) => {
    console.log("AppContext: Attempting to update payee:", payeeData.id);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for updatePayee. Payee not updated.");
      return;
    }
    const { id, ...dataToUpdate } = payeeData;
     const cleanedData = {
        name: dataToUpdate.name,
        category: dataToUpdate.category?.trim() ? dataToUpdate.category.trim() : undefined,
    };
    try {
      const payeeDocRef = doc(db, PAYEES_COLLECTION, id);
      await updateDoc(payeeDocRef, cleanedData);
      console.log("AppContext: Successfully updated payee in Firestore:", id);
      setPayees(prevPayees =>
        prevPayees.map(payee =>
          payee.id === id ? { ...payee, ...cleanedData } : payee
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error updating payee in Firestore. Details:", error, "Data attempted:", cleanedData);
    }
  }, [setPayees, updateLastModified]); // Added dependencies

  const addCategory = async (categoryName: string) => {
    console.log("AppContext: Attempting to add category:", categoryName);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for addCategory. Category not saved.");
      return;
    }
    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) {
      console.warn("AppContext: Attempted to add empty category name.");
      return;
    }

    if (!categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
        const newCategories = [...categories, trimmedName].sort((a,b)=>a.localeCompare(b));
        const newOrderedCategories = [...orderedCategories, trimmedName]; 

        try {
            const metadataDocRef = doc(db, APP_METADATA_COLLECTION, APP_METADATA_DOC_ID);
            await updateDoc(metadataDocRef, {
                categories: newCategories,
                orderedCategories: newOrderedCategories,
            });
            console.log("AppContext: Successfully added category to Firestore and metadata.");
            setCategories(newCategories);
            setOrderedCategories(newOrderedCategories);
            await updateLastModified();
        } catch (error) {
            console.error("AppContext: Error adding category to Firestore metadata. Details:", error);
        }
    } else {
        console.warn(`AppContext: Category "${trimmedName}" already exists.`);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    console.log("AppContext: Attempting to delete transaction:", transactionId);
     if (!db) {
      console.error("AppContext: Firestore db instance is not available for deleteTransaction. Transaction not deleted.");
      return;
    }
    try {
      await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, transactionId));
      console.log("AppContext: Successfully deleted transaction from Firestore:", transactionId);
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error deleting transaction from Firestore. Details:", error);
    }
  };

  const deleteEnvelope = useCallback(async (envelopeId: string) => {
    console.log("AppContext: Attempting to delete envelope:", envelopeId);
    if (!db) {
      console.error("AppContext: Firestore db instance is not available for deleteEnvelope. Envelope not deleted.");
      return;
    }
    const envelopeToDelete = envelopes.find(env => env.id === envelopeId);
    if (!envelopeToDelete) {
      console.warn("AppContext: Envelope to delete not found:", envelopeId);
      return;
    }

    try {
      const batch = writeBatch(db);
      const envelopeDocRef = doc(db, ENVELOPES_COLLECTION, envelopeId);
      batch.delete(envelopeDocRef);
      console.log("AppContext: Envelope added to batch for deletion:", envelopeId);

      const relatedTransactions = transactions.filter(tx => tx.envelopeId === envelopeId);
      relatedTransactions.forEach(tx => {
        const txDocRef = doc(db, TRANSACTIONS_COLLECTION, tx.id);
        batch.update(txDocRef, { envelopeId: null }); 
        console.log("AppContext: Transaction updated in batch (envelopeId set to null):", tx.id);
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
      });
      console.log("AppContext: Metadata update added to batch (categories, orderedCategories).");

      await batch.commit();
      console.log("AppContext: Batch commit successful for envelope deletion.");

      setEnvelopes(updatedEnvelopes);
      setTransactions(prev => prev.map(tx => tx.envelopeId === envelopeId ? { ...tx, envelopeId: undefined } : tx ));
      setCategories(remainingCategories);
      setOrderedCategories(newOrderedCategories);
      await updateLastModified();
    } catch (error) {
      console.error("AppContext: Error deleting envelope and updating transactions in Firestore. Details:", error);
    }
  }, [envelopes, transactions, categories, orderedCategories, setEnvelopes, setTransactions, setCategories, setOrderedCategories, updateLastModified]); // Added dependencies


  const transferBetweenEnvelopes = useCallback(async (data: TransferEnvelopeFundsFormData) => {
    console.log("AppContext: Attempting to transfer funds between envelopes:", data.fromEnvelopeId, "->", data.toEnvelopeId);
    if (!db) {
      console.error("AppContext: Firestore db instance is not available for transferBetweenEnvelopes. Transfer failed.");
      return;
    }
    const { fromEnvelopeId, toEnvelopeId, amount, accountId, date, description } = data;
    const fromEnvelope = envelopes.find(e => e.id === fromEnvelopeId);
    const toEnvelope = envelopes.find(e => e.id === toEnvelopeId);

    if (!fromEnvelope || !toEnvelope) {
      console.error("AppContext: Invalid source or destination envelope for transfer.");
      return;
    }

    let internalTransferPayee = payees.find(p => p.name === "Internal Budget Transfer");
    if (!internalTransferPayee) {
        console.log("AppContext: 'Internal Budget Transfer' payee not found, creating...");
        const payeeDocRef = doc(collection(db, PAYEES_COLLECTION)); 
        const newPayeeData: Omit<Payee, 'id'> = {
            name: "Internal Budget Transfer",
            createdAt: formatISO(new Date()),
        };
        await setDoc(payeeDocRef, newPayeeData);
        internalTransferPayee = {id: payeeDocRef.id, ...newPayeeData};
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
        console.log("AppContext: 'Internal Budget Transfer' payee created:", internalTransferPayee.id);
    }

    const expenseTxData: TransactionFormData = {
      accountId, envelopeId: fromEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'expense',
      description: description || `Transfer to ${toEnvelope.name}`, date, isTransfer: false, 
    };
    const incomeTxData: TransactionFormData = {
      accountId, envelopeId: toEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'income',
      description: description || `Transfer from ${fromEnvelope.name}`, date, isTransfer: false, 
    };
    
    console.log("AppContext: Adding expense transaction for envelope transfer...");
    await addTransaction(expenseTxData);
    console.log("AppContext: Adding income transaction for envelope transfer...");
    await addTransaction(incomeTxData);
    console.log("AppContext: Envelope transfer transactions successfully added.");
  }, [addTransaction, envelopes, payees, setPayees]); // Added dependencies


  const transferBetweenAccounts = useCallback(async (data: TransferAccountFundsFormData) => {
    console.log("AppContext: Attempting to transfer funds between accounts:", data.fromAccountId, "->", data.toAccountId);
    if (!db) {
      console.error("AppContext: Firestore db instance is not available for transferBetweenAccounts. Transfer failed.");
      return;
    }
    const { fromAccountId, toAccountId, amount, date, description } = data;
    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    const toAccount = accounts.find(acc => acc.id === toAccountId);

    if (!fromAccount || !toAccount) {
        console.error("AppContext: Invalid source or destination account for transfer.");
        return;
    }

    let internalTransferPayee = payees.find(p => p.name === "Internal Account Transfer");
     if (!internalTransferPayee) {
        console.log("AppContext: 'Internal Account Transfer' payee not found, creating...");
        const payeeDocRef = doc(collection(db, PAYEES_COLLECTION)); 
        const newPayeeData: Omit<Payee, 'id'> = {
            name: "Internal Account Transfer",
            createdAt: formatISO(new Date()),
        };
        await setDoc(payeeDocRef, newPayeeData);
        internalTransferPayee = {id: payeeDocRef.id, ...newPayeeData};
        setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
        console.log("AppContext: 'Internal Account Transfer' payee created:", internalTransferPayee.id);
    }

    const expenseTxData: TransactionFormData = {
        accountId: fromAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'expense',
        description: description || `Transfer to ${toAccount.name}`, date, isTransfer: true,
    };
    const incomeTxData: TransactionFormData = {
        accountId: toAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'income',
        description: description || `Transfer from ${fromAccount.name}`, date, isTransfer: true,
    };

    console.log("AppContext: Adding expense transaction for account transfer...");
    await addTransaction(expenseTxData);
    console.log("AppContext: Adding income transaction for account transfer...");
    await addTransaction(incomeTxData);
    console.log("AppContext: Account transfer transactions successfully added.");
  }, [addTransaction, accounts, payees, setPayees]); // Added dependencies


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


    