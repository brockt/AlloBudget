
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, PayeeWithId, TransferEnvelopeFundsFormData, AccountWithId, TransferAccountFundsFormData, AppContextType, TransactionWithId, MonthlyEnvelopeBudget } from '@/types';
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid, startOfDay, startOfYear, endOfDay, format, addMonths, subMonths, isBefore, isEqual } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
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
  deleteField,
  where,
  WriteBatch, // Import WriteBatch type
  FieldValue,
} from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

const ACCOUNTS_COLLECTION = 'accounts';
const ENVELOPES_COLLECTION = 'envelopes';
const TRANSACTIONS_COLLECTION = 'transactions';
const PAYEES_COLLECTION = 'payees';
const APP_METADATA_COLLECTION = 'app_metadata';
const MONTHLY_BUDGETS_COLLECTION = 'monthlyBudgets';
const APP_METADATA_DOC_ID = 'main'; // User-specific metadata document ID

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastModified, setLastModified] = useState<string | null>(null);

  const [currentViewMonth, setCurrentViewMonthState] = useState<Date>(startOfMonth(new Date()));
  const [monthlyEnvelopeBudgets, setMonthlyEnvelopeBudgets] = useState<MonthlyEnvelopeBudget[]>([]);

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
    // This path points to a user-specific metadata document
    return doc(db, `users/${currentUser.uid}/${APP_METADATA_COLLECTION}`, APP_METADATA_DOC_ID);
  }, [currentUser]);

  const updateLastModified = useCallback(async (batch?: WriteBatch) => {
    if (!db || !currentUser) return;
    try {
      const metadataDocRef = getMetadataDocRef();
      if (!metadataDocRef) return;
      const updateData = { lastModified: serverTimestamp() };
      if (batch) {
        // If app_metadata/main doesn't exist yet, this batch operation might fail
        // if it's part of a larger transaction that assumes its existence.
        // Consider setDoc with merge if creating the doc in the same batch.
        batch.set(metadataDocRef, updateData, { merge: true });
      } else {
        await setDoc(metadataDocRef, updateData, { merge: true });
      }
    } catch (error) {
      console.error("AppContext: Error updating lastModified timestamp:", error);
    }
  }, [currentUser, getMetadataDocRef]);

  const persistCategoryChanges = useCallback(async (
    newCategoriesToPersist: string[],
    newOrderedCategoriesToPersist: string[],
    batchToUse?: WriteBatch
  ) => {
    if (!currentUser) return;
    const metadataDocRef = getMetadataDocRef();
    if (!metadataDocRef) {
      console.warn("AppContext (persistCategoryChanges): metadataDocRef is null.");
      return;
    }
    // Ensure categories and orderedCategories are always arrays, even if empty
    const dataToPersist = {
      categories: Array.isArray(newCategoriesToPersist) ? newCategoriesToPersist : [],
      orderedCategories: Array.isArray(newOrderedCategoriesToPersist) ? newOrderedCategoriesToPersist : [],
      lastModified: serverTimestamp(), // Also update lastModified here
    };

    try {
      if (batchToUse) {
        batchToUse.set(metadataDocRef, dataToPersist, { merge: true });
      } else {
        await setDoc(metadataDocRef, dataToPersist, { merge: true });
      }
      console.log("AppContext: Persisted category changes:", dataToPersist);
    } catch (error) {
      console.error("AppContext: Error persisting category changes:", error);
      throw error; // Re-throw to indicate failure
    }
  }, [currentUser, getMetadataDocRef]);


  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !db) {
        setAccounts([]); setEnvelopes([]); setTransactions([]); setPayees([]);
        setCategories([]); setOrderedCategories([]); setLastModified(null);
        setMonthlyEnvelopeBudgets([]); setCurrentViewMonthState(startOfMonth(new Date()));
        setIsLoading(false);
        return;
      }
      console.log(`AppContext: Starting data fetch for user ${currentUser.uid}...`);
      setIsLoading(true);
      try {
        const accountsPath = getCollectionPath(ACCOUNTS_COLLECTION);
        const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
        const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        const monthlyBudgetsPath = getCollectionPath(MONTHLY_BUDGETS_COLLECTION);

        if (!accountsPath || !envelopesPath || !transactionsPath || !payeesPath || !monthlyBudgetsPath) {
            console.error("AppContext: One or more collection paths are null. Aborting fetch.");
            setIsLoading(false); return;
        }
        
        const accountsSnapshot = await getDocs(collection(db, accountsPath));
        const fetchedAccounts = accountsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account))
         .sort((a,b) => a.name.localeCompare(b.name));
        setAccounts(fetchedAccounts);

        const envelopesSnapshot = await getDocs(collection(db, envelopesPath));
        const processedEnvelopes = envelopesSnapshot.docs.map((d) => {
          const data = d.data();
          return { 
            id: d.id,
            userId: data.userId || currentUser.uid,
            name: (typeof data.name === 'string' && data.name.trim() !== '') ? data.name.trim() : "Unnamed Envelope",
            budgetAmount: (typeof data.budgetAmount === 'number' && !isNaN(data.budgetAmount)) ? data.budgetAmount : 0,
            category: (typeof data.category === 'string' && data.category.trim() !== '') ? data.category.trim() : "Uncategorized",
            estimatedAmount: (data.estimatedAmount === null || data.estimatedAmount === undefined || isNaN(Number(data.estimatedAmount))) ? undefined : Number(data.estimatedAmount),
            dueDate: (data.dueDate === null || data.dueDate === undefined || isNaN(Number(data.dueDate))) ? undefined : Number(data.dueDate),
            orderIndex: (typeof data.orderIndex === 'number' && !isNaN(data.orderIndex)) ? data.orderIndex : Infinity,
            createdAt: (data.createdAt && typeof data.createdAt === 'string' && isValid(parseISO(data.createdAt))) ? data.createdAt : 
                       (data.createdAt && data.createdAt.toDate && typeof data.createdAt.toDate === 'function' && isValid(data.createdAt.toDate())) ? formatISO(data.createdAt.toDate()) :
                       formatISO(startOfDay(new Date())),
          } as Envelope;
        }).sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));
        console.log("AppContext: Fetched Envelopes from Firestore:", JSON.stringify(processedEnvelopes.map(e => ({id: e.id, name: e.name, category: e.category, orderIndex: e.orderIndex}))));
        setEnvelopes(processedEnvelopes);

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

        const monthlyBudgetsSnapshot = await getDocs(collection(db, monthlyBudgetsPath));
        const fetchedMonthlyBudgets = monthlyBudgetsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyEnvelopeBudget));
        setMonthlyEnvelopeBudgets(fetchedMonthlyBudgets);
        
        // --- Robust Category and OrderedCategories Initialization ---
        const actualDerivedCategories = [...new Set(processedEnvelopes.map(env => env.category || "Uncategorized"))].sort((a, b) => {
            if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
        });
        console.log("AppContext: Actual derived categories from envelopes:", actualDerivedCategories);

        let finalOrderedCategories: string[] = [];
        let storedCategories: string[] = [];
        const metadataDocRef = getMetadataDocRef();
        let lmDate: string | null = null;

        if (metadataDocRef) {
            const metadataDocSnap = await getDoc(metadataDocRef);
            if (metadataDocSnap.exists()) {
                const metadata = metadataDocSnap.data();
                storedCategories = Array.isArray(metadata.categories) ? metadata.categories : [];
                const storedOrdered = Array.isArray(metadata.orderedCategories) ? metadata.orderedCategories : [];
                
                // Filter storedOrdered to keep only categories that actually exist in actualDerivedCategories
                finalOrderedCategories = storedOrdered.filter(cat => actualDerivedCategories.includes(cat));
                
                // Add any derived categories that weren't in the (filtered) stored order
                actualDerivedCategories.forEach(derivedCat => {
                    if (!finalOrderedCategories.includes(derivedCat)) {
                        finalOrderedCategories.push(derivedCat);
                    }
                });

                const lm = metadata.lastModified;
                if (lm && lm instanceof Timestamp) lmDate = formatISO(lm.toDate());
                else if (typeof lm === 'string') lmDate = lm;

            }
        }
        
        // If finalOrderedCategories is still empty (e.g., metadata didn't exist or was empty/invalid)
        // but we have derived categories, use a default sort for derived.
        if (finalOrderedCategories.length === 0 && actualDerivedCategories.length > 0) {
            finalOrderedCategories = [...actualDerivedCategories]; // Already sorted
        }
        // Ensure Uncategorized is last if present
        if (finalOrderedCategories.includes("Uncategorized")) {
            finalOrderedCategories = finalOrderedCategories.filter(c => c !== "Uncategorized");
            finalOrderedCategories.push("Uncategorized");
        }
            
        console.log("AppContext: Setting local categories to:", actualDerivedCategories);
        console.log("AppContext: Setting local orderedCategories to:", finalOrderedCategories);
        setCategories(actualDerivedCategories); 
        setOrderedCategories(finalOrderedCategories);
        setLastModified(lmDate);

        // Always persist the reconciled/derived state back to Firestore to self-heal/initialize metadata
        if (metadataDocRef) {
            try {
                console.log("AppContext: Persisting reconciled category metadata to Firestore during fetch.");
                // Use persistCategoryChanges which now also includes lastModified
                await persistCategoryChanges(actualDerivedCategories, finalOrderedCategories);
            } catch (e) {
                console.error("AppContext (fetchData): Failed to persist reconciled category changes during fetch.", e);
            }
        }
        console.log(`AppContext: Data fetching successful for user ${currentUser.uid}.`);
      } catch (error) {
        console.error(`AppContext: CRITICAL ERROR during fetchData for user ${currentUser.uid}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser, getCollectionPath, getMetadataDocRef, persistCategoryChanges]); // Added persistCategoryChanges

  const setCurrentViewMonth = useCallback((updater: (date: Date) => Date) => {
    setCurrentViewMonthState(prevDate => startOfMonth(updater(prevDate)));
  }, []);

  const setMonthlyAllocation = useCallback(async (envelopeId: string, month: string, amount: number) => {
    if (!db || !currentUser) return;
    const monthlyBudgetsPath = getCollectionPath(MONTHLY_BUDGETS_COLLECTION);
    if (!monthlyBudgetsPath) return;

    const monthYear = format(parseISO(month + "-01"), "yyyy-MM"); 

    const q = query(collection(db, monthlyBudgetsPath), 
                  where("userId", "==", currentUser.uid),
                  where("envelopeId", "==", envelopeId),
                  where("month", "==", monthYear));
    
    const nowISO = formatISO(new Date());
    let docIdToUpdate: string | null = null;
    let existingData: MonthlyEnvelopeBudget | null = null;

    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            docIdToUpdate = docSnap.id;
            existingData = docSnap.data() as MonthlyEnvelopeBudget;
        }

        const dataToSave: Omit<MonthlyEnvelopeBudget, 'id'> = {
            userId: currentUser.uid,
            envelopeId,
            month: monthYear,
            allocatedAmount: Number(amount),
            createdAt: existingData ? existingData.createdAt : nowISO,
            updatedAt: nowISO,
        };

        const batch = writeBatch(db);
        if (docIdToUpdate) {
            const docRef = doc(db, monthlyBudgetsPath, docIdToUpdate);
            batch.update(docRef, dataToSave);
        } else {
            const docRef = doc(collection(db, monthlyBudgetsPath));
            docIdToUpdate = docRef.id; // Get the new doc ID for local state update
            batch.set(docRef, dataToSave);
        }
        await updateLastModified(batch);
        await batch.commit();

        // Update local state
        if (existingData && docIdToUpdate) { // existingData means it was an update
             setMonthlyEnvelopeBudgets(prev => 
                prev.map(b => b.id === docIdToUpdate ? { id: docIdToUpdate, ...dataToSave } : b)
            );
        } else if (docIdToUpdate) { // Was a new entry
            setMonthlyEnvelopeBudgets(prev => [...prev, { id: docIdToUpdate!, ...dataToSave }]);
        }

    } catch (error) {
        console.error("Error setting monthly allocation:", error);
    }
  }, [currentUser, getCollectionPath, updateLastModified]);


  const addAccount = async (accountData: AccountFormData) => {
    if (!db || !currentUser) return;
    const accountsPath = getCollectionPath(ACCOUNTS_COLLECTION);
    if (!accountsPath) return;
    const newAccount: Omit<Account, 'id'> = {
      userId: currentUser.uid, ...accountData, createdAt: formatISO(new Date())
    };
    try {
      const docRef = doc(collection(db, accountsPath));
      const batch = writeBatch(db);
      batch.set(docRef, newAccount);
      await updateLastModified(batch);
      await batch.commit();
      setAccounts(prev => [...prev, { id: docRef.id, ...newAccount }].sort((a,b)=>a.name.localeCompare(b.name)));
    } catch (error) { console.error("Error adding account:", error); }
  };

  const updateAccount = async (accountData: AccountWithId) => {
    if (!db || !currentUser) return;
    const { id, ...dataToUpdate } = accountData;
    const accountDocPath = getDocPath(ACCOUNTS_COLLECTION, id);
    if (!accountDocPath) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, accountDocPath), dataToUpdate);
      await updateLastModified(batch);
      await batch.commit();
      setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, ...dataToUpdate } : acc).sort((a,b)=>a.name.localeCompare(b.name)));
    } catch (error) { console.error("Error updating account:", error); }
  };

  const addEnvelope = async (envelopeData: EnvelopeFormData) => {
    if (!db || !currentUser) return;
    const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
    if (!envelopesPath) return;
    
    const { name, budgetAmount, category, estimatedAmount, dueDate } = envelopeData;
    const newEnvelopeServerData: Omit<Envelope, 'id'> = {
      userId: currentUser.uid, name, budgetAmount: Number(budgetAmount), category,
      createdAt: formatISO(startOfDay(new Date())), 
      orderIndex: envelopes.reduce((max, env) => Math.max(max, env.orderIndex === Infinity ? -1 : env.orderIndex), -1) + 1,
      ...(estimatedAmount !== undefined && { estimatedAmount: Number(estimatedAmount) }),
      ...(dueDate !== undefined && { dueDate: Number(dueDate) }),
    };

    try {
      const docRef = doc(collection(db, envelopesPath));
      const batch = writeBatch(db);
      batch.set(docRef, newEnvelopeServerData);
      
      const newEnvelopeWithId = {id: docRef.id, ...newEnvelopeServerData};
      
      let newLocalCategories = [...categories];
      let newLocalOrderedCategories = [...orderedCategories];
      let metadataNeedsUpdate = false;

      if (!newLocalCategories.includes(category)) {
          newLocalCategories = [...newLocalCategories, category].sort((a,b)=>{
            if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
          });
          metadataNeedsUpdate = true;
      }
      if (!newLocalOrderedCategories.includes(category)) {
          // Add to ordered, maintaining Uncategorized at the end if present
          if (newLocalOrderedCategories.includes("Uncategorized")) {
            const uncatIndex = newLocalOrderedCategories.indexOf("Uncategorized");
            newLocalOrderedCategories.splice(uncatIndex, 0, category);
          } else {
            newLocalOrderedCategories.push(category);
          }
          metadataNeedsUpdate = true;
      }

      if (metadataNeedsUpdate) {
          setCategories(newLocalCategories); 
          setOrderedCategories(newLocalOrderedCategories);
          await persistCategoryChanges(newLocalCategories, newLocalOrderedCategories, batch);
      } else {
          await updateLastModified(batch);
      }
      await batch.commit();
      setEnvelopes(prev => [...prev, newEnvelopeWithId].sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity)));

    } catch (error) { console.error("Error adding envelope:", error); }
  };

  const updateEnvelope = async (envelopeData: Partial<Envelope> & { id: string }) => {
    if (!db || !currentUser) return;
    const { id, ...dataFromForm } = envelopeData;
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, id);
    if (!envelopeDocPath) return;

    const originalEnvelope = envelopes.find(e => e.id === id);
    const originalCategory = originalEnvelope?.category;

    const firestoreUpdateData: { [key: string]: any } = {};
    if (dataFromForm.name !== undefined) firestoreUpdateData.name = dataFromForm.name;
    if (dataFromForm.budgetAmount !== undefined) firestoreUpdateData.budgetAmount = Number(dataFromForm.budgetAmount);
    if (dataFromForm.category !== undefined) firestoreUpdateData.category = dataFromForm.category;
    if (dataFromForm.orderIndex !== undefined) firestoreUpdateData.orderIndex = Number(dataFromForm.orderIndex);
    
    if (dataFromForm.hasOwnProperty('estimatedAmount')) {
      firestoreUpdateData.estimatedAmount = (dataFromForm.estimatedAmount === undefined || dataFromForm.estimatedAmount === null || isNaN(Number(dataFromForm.estimatedAmount))) 
                                            ? deleteField() 
                                            : Number(dataFromForm.estimatedAmount);
    }
    if (dataFromForm.hasOwnProperty('dueDate')) {
      firestoreUpdateData.dueDate = (dataFromForm.dueDate === undefined || dataFromForm.dueDate === null || isNaN(Number(dataFromForm.dueDate))) 
                                    ? deleteField() 
                                    : Number(dataFromForm.dueDate);
    }
    
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, envelopeDocPath), firestoreUpdateData);

      const newLocalEnvelopeData: Partial<Envelope> = {};
      Object.keys(dataFromForm).forEach(key => {
        const formKey = key as keyof typeof dataFromForm;
        if (formKey === 'id') return;
        if (firestoreUpdateData.hasOwnProperty(formKey)){ // only include fields that were prepared for firestore
            (newLocalEnvelopeData as any)[formKey] = firestoreUpdateData[formKey] === deleteField() ? undefined : firestoreUpdateData[formKey];
        }
      });
        
      const updatedEnvelopesList = envelopes.map(env => 
          env.id === id ? { ...env, ...newLocalEnvelopeData } : env
      ).sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));
        
      const newCategoryFromForm = newLocalEnvelopeData.category;
      let finalLocalCategories = [...categories];
      let finalLocalOrderedCategories = [...orderedCategories];
      let metadataNeedsUpdate = false;

      if (newCategoryFromForm && originalCategory !== newCategoryFromForm) { 
          if (!finalLocalCategories.includes(newCategoryFromForm)) { 
              finalLocalCategories = [...finalLocalCategories, newCategoryFromForm].sort((a,b)=>{
                  if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
              });
              if (finalLocalOrderedCategories.includes("Uncategorized")) {
                const uncatIndex = finalLocalOrderedCategories.indexOf("Uncategorized");
                finalLocalOrderedCategories.splice(uncatIndex, 0, newCategoryFromForm);
              } else {
                finalLocalOrderedCategories.push(newCategoryFromForm);
              }
              metadataNeedsUpdate = true;
          }
      }
      
      if (originalCategory && (!newCategoryFromForm || originalCategory !== newCategoryFromForm)) {
          if (!updatedEnvelopesList.some(env => env.category === originalCategory)) { 
              finalLocalCategories = finalLocalCategories.filter(cat => cat !== originalCategory);
              finalLocalOrderedCategories = finalLocalOrderedCategories.filter(cat => cat !== originalCategory);
              metadataNeedsUpdate = true;
          }
      }
        
      if(metadataNeedsUpdate) {
          setCategories(finalLocalCategories); 
          setOrderedCategories(finalLocalOrderedCategories);
          await persistCategoryChanges(finalLocalCategories, finalLocalOrderedCategories, batch);
      } else {
          await updateLastModified(batch);
      }
      await batch.commit();
      setEnvelopes(updatedEnvelopesList); 

    } catch (error) { 
      console.error("Error updating envelope:", error); 
      throw error;
    }
  };
  
  const updateEnvelopeOrder = async (reorderedEnvelopes: Envelope[]) => {
    if (!db || !currentUser) return;
    const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
    if (!envelopesPath) return;
    const batch = writeBatch(db);
    const updatedEnvelopesForState: Envelope[] = [];
    reorderedEnvelopes.forEach((envelope, index) => {
      const updatedEnvelope = { ...envelope, orderIndex: index };
      updatedEnvelopesForState.push(updatedEnvelope);
      batch.update(doc(db, envelopesPath, envelope.id), { orderIndex: index });
    });
    try {
      await updateLastModified(batch); 
      await batch.commit();
      setEnvelopes(updatedEnvelopesForState.sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity)));
    } catch (error) {
      console.error("Error updating envelope order:", error);
      const originalOrder = envelopes.sort((a,b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));
      setEnvelopes(originalOrder);
    }
  };

  const updateCategoryOrder = async (newOrder: string[]) => {
    if (!db || !currentUser) return;
    
    const currentDerivedCategories = [...new Set(envelopes.map(env => env.category || "Uncategorized"))];
    const validatedNewOrder = newOrder.filter(cat => currentDerivedCategories.includes(cat));
    currentDerivedCategories.forEach(cat => {
      if (!validatedNewOrder.includes(cat)) {
        validatedNewOrder.push(cat); 
      }
    });
     // Ensure Uncategorized is last if present
    if (validatedNewOrder.includes("Uncategorized")) {
        validatedNewOrder = validatedNewOrder.filter(c => c !== "Uncategorized");
        validatedNewOrder.push("Uncategorized");
    }


    if (JSON.stringify(validatedNewOrder) === JSON.stringify(orderedCategories)) {
        await updateLastModified(); 
        return; 
    }
    setOrderedCategories(validatedNewOrder); 
    await persistCategoryChanges(categories, validatedNewOrder); 
  };

  const addTransaction = useCallback(async (transactionData: TransactionFormData) => {
    if (!db || !currentUser) return;
    const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
    if (!transactionsPath) return;
    if (!transactionData.payeeId) { console.error("Cannot add transaction without payeeId."); return; }
    const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
    if (!parsedDate || !isValid(parsedDate)) { console.error("Invalid date for transaction."); return; }
    const newTransactionData: Omit<Transaction, 'id'> = {
      userId: currentUser.uid, ...transactionData, amount: Number(transactionData.amount),
      envelopeId: transactionData.envelopeId || undefined,
      description: transactionData.description || undefined,
      date: formatISO(parsedDate), createdAt: formatISO(new Date()), isTransfer: !!transactionData.isTransfer,
    };
    try {
      const docRef = doc(collection(db, transactionsPath));
      const batch = writeBatch(db);
      batch.set(docRef, newTransactionData);
      await updateLastModified(batch);
      await batch.commit();
      setTransactions(prev => [...prev, {id: docRef.id, ...newTransactionData}].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
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
    
    const cleanedData: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>> & { updatedAt?: FieldValue } = {
        ...dataToUpdate,
        amount: dataToUpdate.amount !== undefined ? Number(dataToUpdate.amount) : undefined,
        envelopeId: dataToUpdate.envelopeId === null ? undefined : dataToUpdate.envelopeId,
        description: dataToUpdate.description === null || dataToUpdate.description === "" ? undefined : dataToUpdate.description,
        date: formatISO(parsedDate),
        isTransfer: !!dataToUpdate.isTransfer,
        updatedAt: serverTimestamp() 
    };
    // Remove undefined fields to avoid issues with Firestore update
    Object.keys(cleanedData).forEach(key => (cleanedData as any)[key] === undefined && delete (cleanedData as any)[key]);

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, transactionDocPath), cleanedData);
      await updateLastModified(batch); 
      await batch.commit();
      
      setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...cleanedData, updatedAt: formatISO(new Date()) } as Transaction : tx)
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
    } catch (error) { console.error("Error updating transaction:", error); }
  }, [currentUser, getDocPath, updateLastModified]);

  const addPayee = async (payeeData: PayeeFormData) => {
    if (!db || !currentUser) return;
    const payeesPath = getCollectionPath(PAYEES_COLLECTION);
    if(!payeesPath) return;
    const newPayeeData: Omit<Payee, 'id'> = {
        userId: currentUser.uid, name: payeeData.name, createdAt: formatISO(new Date()),
        ...(payeeData.category?.trim() && { category: payeeData.category.trim() }),
    };
    try {
      const docRef = doc(collection(db, payeesPath));
      const batch = writeBatch(db);
      batch.set(docRef, newPayeeData);
      await updateLastModified(batch);
      await batch.commit();
      setPayees(prev => [...prev, { id: docRef.id, ...newPayeeData } as Payee].sort((a,b)=>a.name.localeCompare(b.name)));
    } catch (error) { console.error("Error adding payee:", error); }
  };

  const updatePayee = useCallback(async (payeeData: PayeeWithId) => {
    if (!db || !currentUser) return;
    const { id, ...dataToUpdate } = payeeData;
    const payeeDocPath = getDocPath(PAYEES_COLLECTION, id);
    if (!payeeDocPath) return;
    const cleanedData: {name: string; category?: string | FieldValue; updatedAt?: FieldValue} = { 
        name: dataToUpdate.name,
        updatedAt: serverTimestamp()
    };
    if (dataToUpdate.category?.trim()) {
        cleanedData.category = dataToUpdate.category.trim();
    } else {
        cleanedData.category = deleteField();
    }
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, payeeDocPath), cleanedData );
      await updateLastModified(batch);
      await batch.commit();
      setPayees(prev => prev.map(p => p.id === id ? { ...p, name: cleanedData.name as string, category: typeof cleanedData.category === 'string' ? cleanedData.category : undefined, updatedAt: formatISO(new Date()) } as Payee : p)
        .sort((a,b)=>a.name.localeCompare(b.name)));
    } catch (error) { console.error("Error updating payee:", error); }
  }, [currentUser, getDocPath, updateLastModified]);

  const addCategory = async (categoryName: string) => {
    if (!db || !currentUser) return;
    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) return;

    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      console.log(`AppContext: Category "${trimmedName}" already exists.`);
      return;
    }
    
    let newLocalCategories = [...categories, trimmedName].sort((a,b)=>{
         if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
    });
    let newLocalOrderedCategories = [...orderedCategories];
    if (newLocalOrderedCategories.includes("Uncategorized")) {
        const uncatIndex = newLocalOrderedCategories.indexOf("Uncategorized");
        newLocalOrderedCategories.splice(uncatIndex, 0, trimmedName);
    } else {
        newLocalOrderedCategories.push(trimmedName);
    }
    
    setCategories(newLocalCategories); 
    setOrderedCategories(newLocalOrderedCategories);
    try {
        await persistCategoryChanges(newLocalCategories, newLocalOrderedCategories);
    } catch (error) {
        console.error("AppContext (addCategory): Failed to persist category changes:", error);
        setCategories(categories); // Revert local state on error
        setOrderedCategories(orderedCategories);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!db || !currentUser) return;
    const transactionDocPath = getDocPath(TRANSACTIONS_COLLECTION, transactionId);
    if(!transactionDocPath) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, transactionDocPath));
      await updateLastModified(batch);
      await batch.commit();
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    } catch (error) { console.error("Error deleting transaction:", error); }
  };

  const deleteEnvelope = useCallback(async (envelopeId: string): Promise<void> => {
    if (!db || !currentUser) throw new Error("User or DB not available");
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, envelopeId);
    const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
    const monthlyBudgetsPath = getCollectionPath(MONTHLY_BUDGETS_COLLECTION);

    if (!envelopeDocPath || !transactionsPath || !monthlyBudgetsPath) {
      console.error("AppContext (deleteEnvelope): One or more critical paths are null.");
      throw new Error("Critical paths are null for deleteEnvelope.");
    }
    
    const originalEnvelope = envelopes.find(e => e.id === envelopeId);
    if (!originalEnvelope) {
        console.warn(`AppContext (deleteEnvelope): Envelope with ID ${envelopeId} not found locally.`);
        throw new Error(`Envelope with ID ${envelopeId} not found locally.`);
    }

    const batch = writeBatch(db);
    try {
      console.log(`AppContext (deleteEnvelope): Attempting to delete envelope ${envelopeId}`);
      batch.delete(doc(db, envelopeDocPath));

      const relatedTransactions = transactions.filter(tx => tx.envelopeId === envelopeId);
      relatedTransactions.forEach(tx => {
        const txDocPath = getDocPath(TRANSACTIONS_COLLECTION, tx.id);
        if (txDocPath) {
            batch.update(doc(db, txDocPath), { envelopeId: deleteField() }); 
        }
      });

      const monthlyBudgetQuery = query(collection(db, monthlyBudgetsPath), where("envelopeId", "==", envelopeId), where("userId", "==", currentUser.uid));
      const monthlyBudgetDocs = await getDocs(monthlyBudgetQuery);
      monthlyBudgetDocs.forEach(docSnap => {
          batch.delete(docSnap.ref);
      });
      
      // Prepare local state changes, but apply them *after* successful batch commit
      const updatedEnvelopesListForState = envelopes.filter(env => env.id !== envelopeId);
      const updatedTransactionsListForState = transactions.map(tx => tx.envelopeId === envelopeId ? { ...tx, envelopeId: undefined } : tx );
      const updatedMonthlyBudgetsListForState = monthlyEnvelopeBudgets.filter(mb => mb.envelopeId !== envelopeId);
      
      const categoryOfDeletedEnvelope = originalEnvelope.category;
      const isCategoryStillInUse = updatedEnvelopesListForState.some(env => env.category === categoryOfDeletedEnvelope);
      
      let newLocalCategories = [...categories];
      let newLocalOrderedCategories = [...orderedCategories];
      let metadataNeedsUpdate = false;

      if (!isCategoryStillInUse && categoryOfDeletedEnvelope) { 
          newLocalCategories = categories.filter(cat => cat !== categoryOfDeletedEnvelope);
          newLocalOrderedCategories = orderedCategories.filter(cat => cat !== categoryOfDeletedEnvelope);
          metadataNeedsUpdate = true;
      }
      
      if (updatedEnvelopesListForState.length === 0 && (newLocalCategories.length > 0 || newLocalOrderedCategories.length > 0)) {
        newLocalCategories = [];
        newLocalOrderedCategories = [];
        metadataNeedsUpdate = true;
      }

      if (metadataNeedsUpdate) {
        await persistCategoryChanges(newLocalCategories, newLocalOrderedCategories, batch);
      } else {
        await updateLastModified(batch);
      }
      
      await batch.commit(); 
      console.log(`AppContext (deleteEnvelope): Batch commit successful for envelope ${envelopeId}.`);

      // Apply local state changes now that Firestore is updated
      setEnvelopes(updatedEnvelopesListForState);
      setTransactions(updatedTransactionsListForState);
      setMonthlyEnvelopeBudgets(updatedMonthlyBudgetsListForState);
      if (metadataNeedsUpdate) {
        setCategories(newLocalCategories);
        setOrderedCategories(newLocalOrderedCategories);
      }

    } catch (error) { 
        console.error(`AppContext (deleteEnvelope): Error deleting envelope ${envelopeId}:`, error); 
        throw error; 
    }
  }, [currentUser, envelopes, transactions, categories, orderedCategories, monthlyEnvelopeBudgets, getDocPath, getCollectionPath, updateLastModified, persistCategoryChanges]);


  const transferBetweenEnvelopes = useCallback(async (data: TransferEnvelopeFundsFormData) => {
    if (!currentUser) return;
    const { fromEnvelopeId, toEnvelopeId, amount, accountId, date, description } = data;
    const fromEnvelope = envelopes.find(e => e.id === fromEnvelopeId);
    const toEnvelope = envelopes.find(e => e.id === toEnvelopeId);
    if (!fromEnvelope || !toEnvelope) { console.error("Invalid source/destination envelope."); return; }
    let internalTransferPayee = payees.find(p => p.name === "Internal Budget Transfer");
    if (!internalTransferPayee) {
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        if(!payeesPath) return;
        const payeeDocRef = doc(collection(db, payeesPath)); 
        const newPayeeData: Omit<Payee, 'id'> = { name: "Internal Budget Transfer",userId: currentUser.uid, createdAt: formatISO(new Date())};
        const batch = writeBatch(db); 
        batch.set(payeeDocRef, newPayeeData);
        await updateLastModified(batch); 
        await batch.commit(); 
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
  }, [currentUser, addTransaction, envelopes, payees, getCollectionPath, updateLastModified]);

  const transferBetweenAccounts = useCallback(async (data: TransferAccountFundsFormData) => {
    if(!currentUser) return;
    const { fromAccountId, toAccountId, amount, date, description } = data;
    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    const toAccount = accounts.find(acc => acc.id === toAccountId);
    if (!fromAccount || !toAccount) { console.error("Invalid source/destination account."); return; }
    let internalTransferPayee = payees.find(p => p.name === "Internal Account Transfer");
    if (!internalTransferPayee) {
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        if(!payeesPath) return;
        const payeeDocRef = doc(collection(db, payeesPath)); 
        const newPayeeData: Omit<Payee, 'id'> = { name: "Internal Account Transfer", userId: currentUser.uid, createdAt: formatISO(new Date())};
        const batch = writeBatch(db);
        batch.set(payeeDocRef, newPayeeData);
        await updateLastModified(batch);
        await batch.commit();
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
  }, [currentUser, addTransaction, accounts, payees, getCollectionPath, updateLastModified]);

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

  const getEnvelopeSpending = useCallback((envelopeId: string, forMonth: Date): number => {
    const monthStart = startOfMonth(forMonth);
    const monthEnd = endOfMonth(forMonth);
    const spending = transactions
      .filter(tx => {
          if (tx.envelopeId !== envelopeId || tx.type !== 'expense') return false;
          const txDate = parseISO(tx.date);
          return isValid(txDate) && isWithinInterval(txDate, {start: monthStart, end: monthEnd});
      })
      .reduce((sum, tx) => (sum + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0)), 0);
      return isNaN(spending) ? 0 : spending;
  }, [transactions]);

  const getMonthlyAllocation = useCallback((envelopeId: string, forMonth: Date): number => {
    const monthStr = format(forMonth, "yyyy-MM");
    const monthlyBudget = monthlyEnvelopeBudgets.find(
      b => b.envelopeId === envelopeId && b.month === monthStr
    );
    if (monthlyBudget) {
      return monthlyBudget.allocatedAmount;
    }
    const envelope = envelopes.find(e => e.id === envelopeId);
    return envelope?.budgetAmount || 0;
  }, [monthlyEnvelopeBudgets, envelopes]);

  const getEnvelopeBalanceAsOfEOM = useCallback((envelopeId: string, asOfEOMDate: Date): number => {
    const envelope = envelopes.find(env => env.id === envelopeId);
    if (!envelope || !envelope.createdAt || !isValid(parseISO(envelope.createdAt))) return 0;

    const creationMonth = startOfMonth(parseISO(envelope.createdAt));
    let currentBalance = 0;
    let monthToProcess = creationMonth;

    while (isBefore(monthToProcess, addMonths(startOfMonth(asOfEOMDate),1)) || isEqual(monthToProcess, startOfMonth(asOfEOMDate))) {
        const allocatedThisMonth = getMonthlyAllocation(envelopeId, monthToProcess);
        const spentThisMonth = getEnvelopeSpending(envelopeId, monthToProcess);
        
        currentBalance += allocatedThisMonth;
        currentBalance -= spentThisMonth;
        
        monthToProcess = addMonths(monthToProcess, 1);
    }
    return isNaN(currentBalance) ? 0 : currentBalance;
  }, [envelopes, getMonthlyAllocation, getEnvelopeSpending]);


  const getPayeeTransactions = useCallback((payeeId: string): Transaction[] => {
    return transactions
        .filter(tx => tx.payeeId === payeeId)
        .sort((a, b) => {
            const dateA = parseISO(a.date); const dateB = parseISO(b.date);
            if (!isValid(dateA)) return 1; if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
  }, [transactions]);

  const getMonthlyIncomeTotal = useCallback((forMonth: Date): number => {
    const monthStart = startOfMonth(forMonth); const monthEnd = endOfMonth(forMonth);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'income' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        return total + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  const getMonthlySpendingTotal = useCallback((forMonth: Date): number => {
    const monthStart = startOfMonth(forMonth); const monthEnd = endOfMonth(forMonth);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'expense' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        return total + (typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  const getTotalMonthlyBudgeted = useCallback((forMonth: Date): number => {
    const monthStr = format(forMonth, "yyyy-MM");
    return envelopes.reduce((total, env) => {
        const monthlyBudget = monthlyEnvelopeBudgets.find(
            b => b.envelopeId === env.id && b.month === monthStr
        );
        const amountToAdd = monthlyBudget ? monthlyBudget.allocatedAmount : env.budgetAmount;
        return total + (typeof amountToAdd === 'number' && !isNaN(amountToAdd) ? amountToAdd : 0);
    }, 0);
  }, [envelopes, monthlyEnvelopeBudgets]);

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
      monthlyEnvelopeBudgets, currentViewMonth, setCurrentViewMonth, setMonthlyAllocation,
      addAccount, updateAccount, addEnvelope, addTransaction, updateTransaction, addPayee, updatePayee,
      addCategory, updateCategoryOrder, updateEnvelope, updateEnvelopeOrder, deleteTransaction, deleteEnvelope,
      transferBetweenEnvelopes, transferBetweenAccounts,
      getAccountBalance, getAccountById, getEnvelopeById, 
      getEnvelopeSpending, getEnvelopeBalanceAsOfEOM, getMonthlyAllocation,
      getMonthlyIncomeTotal, getMonthlySpendingTotal, getTotalMonthlyBudgeted, getYtdIncomeTotal,
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
