
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account, Envelope, Transaction, Payee, AccountFormData, EnvelopeFormData, TransactionFormData, PayeeFormData, PayeeWithId, TransferEnvelopeFundsFormData, AccountWithId, TransferAccountFundsFormData, AppContextType, TransactionWithId, MonthlyEnvelopeBudget } from '@/types';
import { formatISO, startOfMonth, endOfMonth, isWithinInterval, parseISO, isValid, differenceInCalendarMonths, startOfDay, startOfYear, endOfDay, format, addMonths, subMonths, getMonth, getYear, isBefore, isEqual } from 'date-fns';
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
} from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

const ACCOUNTS_COLLECTION = 'accounts';
const ENVELOPES_COLLECTION = 'envelopes';
const TRANSACTIONS_COLLECTION = 'transactions';
const PAYEES_COLLECTION = 'payees';
const APP_METADATA_COLLECTION = 'app_metadata';
const MONTHLY_BUDGETS_COLLECTION = 'monthlyBudgets'; // New collection
const APP_METADATA_DOC_ID = 'main';

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

  // New state for monthly budgeting
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
    return doc(db, `users/${currentUser.uid}/${APP_METADATA_COLLECTION}`, APP_METADATA_DOC_ID);
  }, [currentUser]);

  const updateLastModified = useCallback(async () => {
    if (!db || !currentUser) return;
    try {
      const metadataDocRef = getMetadataDocRef();
      if (!metadataDocRef) return;
      await setDoc(metadataDocRef, { lastModified: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error("AppContext: Error updating lastModified timestamp:", error);
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
        setAccounts([]); setEnvelopes([]); setTransactions([]); setPayees([]);
        setCategories([]); setOrderedCategories([]); setLastModified(null);
        setMonthlyEnvelopeBudgets([]); setCurrentViewMonthState(startOfMonth(new Date()));
        setIsLoading(false);
        return;
      }

      console.log(`AppContext: Starting data fetch for user ${currentUser.uid}...`);
      setIsLoading(true);
      if (!db) {
        console.error("AppContext: Firestore db instance is not available.");
        setIsLoading(false);
        return;
      }
      try {
        const accountsPath = getCollectionPath(ACCOUNTS_COLLECTION);
        const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
        const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        const monthlyBudgetsPath = getCollectionPath(MONTHLY_BUDGETS_COLLECTION);

        if (!accountsPath || !envelopesPath || !transactionsPath || !payeesPath || !monthlyBudgetsPath) {
            console.error("AppContext: One or more collection paths are null, aborting fetch.");
            setIsLoading(false);
            return;
        }

        const accountsSnapshot = await getDocs(collection(db, accountsPath));
        const fetchedAccounts = accountsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account))
         .sort((a,b) => a.name.localeCompare(b.name));
        setAccounts(fetchedAccounts);

        const envelopesSnapshot = await getDocs(collection(db, envelopesPath));
        // console.log(`AppContext (fetchData): Fetched ${envelopesSnapshot.docs.length} envelope documents from Firestore.`);
        
        const processedEnvelopes = envelopesSnapshot.docs.map((d) => {
          const data = d.data();
          // console.log(`AppContext (fetchData Debug): Processing raw envelope doc (ID: ${d.id}):`, JSON.stringify(data));
          
          const name = (typeof data.name === 'string' && data.name.trim() !== '') ? data.name.trim() : "Unnamed Envelope";
          const budgetAmount = (typeof data.budgetAmount === 'number' && !isNaN(data.budgetAmount)) ? data.budgetAmount : 0;
          const category = (typeof data.category === 'string' && data.category.trim() !== '') ? data.category.trim() : "Uncategorized";
          const estimatedAmount = (data.estimatedAmount === null || data.estimatedAmount === undefined || isNaN(Number(data.estimatedAmount))) ? undefined : Number(data.estimatedAmount);
          const dueDate = (data.dueDate === null || data.dueDate === undefined || isNaN(Number(data.dueDate))) ? undefined : Number(data.dueDate);
          const orderIndex = (typeof data.orderIndex === 'number' && !isNaN(data.orderIndex)) ? data.orderIndex : Infinity;
          let createdAt = formatISO(new Date()); 
          if (typeof data.createdAt === 'string' && isValid(parseISO(data.createdAt))) {
            createdAt = data.createdAt;
          } else if (data.createdAt && data.createdAt.toDate && typeof data.createdAt.toDate === 'function' && isValid(data.createdAt.toDate())) {
            createdAt = formatISO(data.createdAt.toDate());
          }
          const userId = (typeof data.userId === 'string' && data.userId.trim() !== '') ? data.userId : currentUser.uid;

          const anEnvelope = {
            id: d.id, userId, name, budgetAmount, category, estimatedAmount, dueDate, orderIndex, createdAt,
          } as Envelope;
          // console.log(`AppContext (fetchData Debug): Processed envelope (ID: ${d.id}):`, JSON.stringify(anEnvelope));
          return anEnvelope;
        })
        .sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));
        
        // console.log("[AppContext] Fetched Envelopes from Firestore (after defaults & sort):", JSON.stringify(processedEnvelopes, null, 2));
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
        
        // --- Category and OrderedCategories Reconciliation ---
        const currentDerivedCategories = deriveCategoriesFromEnvelopes(processedEnvelopes);
        // console.log("AppContext (fetchData): Categories derived from ALL fetched envelopes:", currentDerivedCategories);
        
        let newOrderedCategories: string[] = [];
        const metadataDocRef = getMetadataDocRef();

        if (metadataDocRef) {
            const metadataDocSnap = await getDoc(metadataDocRef);

            if (metadataDocSnap.exists()) {
                const metadata = metadataDocSnap.data();
                const storedOrderedCategories = Array.isArray(metadata.orderedCategories) ? metadata.orderedCategories : [];
                // console.log("AppContext (fetchData): Stored orderedCategories from metadata:", storedOrderedCategories);

                newOrderedCategories = storedOrderedCategories.filter(cat => currentDerivedCategories.includes(cat));
                currentDerivedCategories.forEach(derivedCat => {
                    if (!newOrderedCategories.includes(derivedCat)) {
                        newOrderedCategories.push(derivedCat); 
                    }
                });
                
                const lm = metadata.lastModified;
                if (lm && lm instanceof Timestamp) setLastModified(formatISO(lm.toDate()));
                else if (typeof lm === 'string') setLastModified(lm);
                else setLastModified(null);
            } else {
                // console.log("AppContext (fetchData): No metadata document found. Initializing orderedCategories from derived.");
                newOrderedCategories = [...currentDerivedCategories].sort((a,b) => {
                    if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
                });
                setLastModified(null); 
            }
            
            // console.log("AppContext (fetchData): Updating Firestore metadata with derivedCategories and newOrderedCategories.");
            await setDoc(metadataDocRef, { 
                categories: currentDerivedCategories, 
                orderedCategories: newOrderedCategories, 
                lastModified: serverTimestamp() 
            }, { merge: true });
        } else {
            // console.warn("AppContext (fetchData): metadataDocRef is null. Cannot manage category order or lastModified.");
            newOrderedCategories = [...currentDerivedCategories].sort((a,b) => {
                if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
            });
            setLastModified(null);
        }
        
        setCategories(currentDerivedCategories);
        setOrderedCategories(newOrderedCategories);
        // console.log("AppContext (fetchData): Final categories state:", currentDerivedCategories);
        // console.log("AppContext (fetchData): Final orderedCategories state:", newOrderedCategories);
        // --- End Category Reconciliation ---
        
        console.log(`AppContext: Data fetching successful for user ${currentUser.uid}.`);
      } catch (error) {
        console.error(`AppContext: CRITICAL ERROR during fetchData for user ${currentUser.uid}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, getCollectionPath, getMetadataDocRef]);

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

        if (docIdToUpdate) {
            const docRef = doc(db, monthlyBudgetsPath, docIdToUpdate);
            await updateDoc(docRef, dataToSave);
            setMonthlyEnvelopeBudgets(prev => 
                prev.map(b => b.id === docIdToUpdate ? { id: docIdToUpdate, ...dataToSave } : b)
            );
        } else {
            const docRef = doc(collection(db, monthlyBudgetsPath));
            await setDoc(docRef, dataToSave);
            setMonthlyEnvelopeBudgets(prev => [...prev, { id: docRef.id, ...dataToSave }]);
        }
        await updateLastModified();
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
      await setDoc(docRef, newEnvelopeServerData); 
      const newEnvelopeWithId = {id: docRef.id, ...newEnvelopeServerData};
      
      const updatedEnvelopesList = [...envelopes, newEnvelopeWithId].sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));
      setEnvelopes(updatedEnvelopesList);
      
      let newCategoriesState = [...categories];
      let newOrderedCategoriesState = [...orderedCategories];
      let metadataNeedsUpdate = false;

      if (!newCategoriesState.includes(category)) {
          newCategoriesState = [...newCategoriesState, category].sort((a,b) => a.localeCompare(b));
          metadataNeedsUpdate = true;
      }
      if (!newOrderedCategoriesState.includes(category)) {
          newOrderedCategoriesState.push(category);
          metadataNeedsUpdate = true;
      }

      if (metadataNeedsUpdate) {
          setCategories(newCategoriesState);
          setOrderedCategories(newOrderedCategoriesState);
          // console.log("AppContext (addEnvelope): Updating metadata for categories/orderedCategories.");
          await updateDoc(metadataDocRef, { 
              categories: newCategoriesState, 
              orderedCategories: newOrderedCategoriesState,
              lastModified: serverTimestamp() 
          });
      } else {
          await updateLastModified();
      }

    } catch (error) { console.error("Error adding envelope:", error); }
  };

  const updateEnvelope = async (envelopeData: Partial<Envelope> & { id: string }) => {
    if (!db || !currentUser) return;
    const { id, ...dataFromForm } = envelopeData;
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, id);
    const metadataDocRef = getMetadataDocRef();
    if (!envelopeDocPath || !metadataDocRef) return;

    const originalEnvelope = envelopes.find(e => e.id === id);
    const originalCategory = originalEnvelope?.category;

    const firestoreUpdateData: { [key: string]: any } = {};
    if (dataFromForm.name !== undefined) firestoreUpdateData.name = dataFromForm.name;
    if (dataFromForm.budgetAmount !== undefined) firestoreUpdateData.budgetAmount = Number(dataFromForm.budgetAmount);
    if (dataFromForm.category !== undefined) firestoreUpdateData.category = dataFromForm.category;
    if (dataFromForm.orderIndex !== undefined) firestoreUpdateData.orderIndex = Number(dataFromForm.orderIndex);
    
    if (dataFromForm.hasOwnProperty('estimatedAmount')) {
        firestoreUpdateData.estimatedAmount = (dataFromForm.estimatedAmount === undefined || dataFromForm.estimatedAmount === null || isNaN(Number(dataFromForm.estimatedAmount))) 
                                              ? deleteField() : Number(dataFromForm.estimatedAmount);
    }
    if (dataFromForm.hasOwnProperty('dueDate')) {
        firestoreUpdateData.dueDate = (dataFromForm.dueDate === undefined || dataFromForm.dueDate === null || isNaN(Number(dataFromForm.dueDate))) 
                                      ? deleteField() : Number(dataFromForm.dueDate);
    }
    
    try {
        await updateDoc(doc(db, envelopeDocPath), firestoreUpdateData);

        const newLocalEnvelopeData: Partial<Envelope> = {};
        if (firestoreUpdateData.name !== undefined) newLocalEnvelopeData.name = firestoreUpdateData.name;
        if (firestoreUpdateData.budgetAmount !== undefined) newLocalEnvelopeData.budgetAmount = firestoreUpdateData.budgetAmount;
        if (firestoreUpdateData.category !== undefined) newLocalEnvelopeData.category = firestoreUpdateData.category;
        if (firestoreUpdateData.orderIndex !== undefined) newLocalEnvelopeData.orderIndex = firestoreUpdateData.orderIndex;
        
        if (dataFromForm.hasOwnProperty('estimatedAmount')) {
            newLocalEnvelopeData.estimatedAmount = firestoreUpdateData.estimatedAmount === deleteField() ? undefined : firestoreUpdateData.estimatedAmount;
        }
        if (dataFromForm.hasOwnProperty('dueDate')) {
            newLocalEnvelopeData.dueDate = firestoreUpdateData.dueDate === deleteField() ? undefined : firestoreUpdateData.dueDate;
        }

        const updatedEnvelopesList = envelopes.map(env => {
            if (env.id === id) { return { ...env, ...newLocalEnvelopeData }; }
            return env;
        }).sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));
        
        setEnvelopes(updatedEnvelopesList);
        
        let newCategoriesState = [...categories];
        let newOrderedCategoriesState = [...orderedCategories];
        let metadataNeedsUpdate = false;
        const newCategoryFromForm = newLocalEnvelopeData.category;

        if (newCategoryFromForm && originalCategory !== newCategoryFromForm) {
            if (!newCategoriesState.includes(newCategoryFromForm)) {
                newCategoriesState = [...newCategoriesState, newCategoryFromForm].sort((a,b) => a.localeCompare(b));
                metadataNeedsUpdate = true;
            }
            if (!newOrderedCategoriesState.includes(newCategoryFromForm)) {
                newOrderedCategoriesState.push(newCategoryFromForm);
                metadataNeedsUpdate = true;
            }
        }

        if (originalCategory && originalCategory !== newCategoryFromForm) {
            const oldCategoryStillInUse = updatedEnvelopesList.some(env => env.category === originalCategory);
            if (!oldCategoryStillInUse) {
                newCategoriesState = newCategoriesState.filter(cat => cat !== originalCategory);
                newOrderedCategoriesState = newOrderedCategoriesState.filter(cat => cat !== originalCategory);
                metadataNeedsUpdate = true;
            }
        }
        
        if(metadataNeedsUpdate) {
            setCategories(newCategoriesState);
            setOrderedCategories(newOrderedCategoriesState);
            // console.log("AppContext (updateEnvelope): Updating metadata for categories/orderedCategories.");
            await updateDoc(metadataDocRef, { 
                categories: newCategoriesState, 
                orderedCategories: newOrderedCategoriesState,
                lastModified: serverTimestamp()
            });
        } else {
            await updateLastModified();
        }

    } catch (error) { 
      console.error("Error updating envelope:", error); 
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
      await batch.commit();
      setEnvelopes(updatedEnvelopesForState.sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity)));
      await updateLastModified();
    } catch (error) {
      console.error("Error updating envelope order:", error);
      const originalOrder = envelopes.sort((a,b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));
      setEnvelopes(originalOrder);
    }
  };

  const updateCategoryOrder = async (newOrder: string[]) => {
    if (!db || !currentUser) return;
    const metadataDocRef = getMetadataDocRef();
    if (!metadataDocRef) return;
    
    const currentDerivedCategories = deriveCategoriesFromEnvelopes(envelopes);
    const validatedNewOrder = newOrder.filter(cat => currentDerivedCategories.includes(cat));
    currentDerivedCategories.forEach(cat => {
      if (!validatedNewOrder.includes(cat)) {
        validatedNewOrder.push(cat);
      }
    });

    if (JSON.stringify(validatedNewOrder) === JSON.stringify(orderedCategories)) {
        // console.log("AppContext: Category order is already up-to-date.");
        return;
    }

    try {
      await updateDoc(metadataDocRef, { orderedCategories: validatedNewOrder, lastModified: serverTimestamp() });
      setOrderedCategories(validatedNewOrder);
    } catch (error) {
      console.error("AppContext: Error updating category order in Firestore. Details:", error);
    }
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
        ...dataToUpdate, amount: dataToUpdate.amount !== undefined ? Number(dataToUpdate.amount) : undefined,
        envelopeId: dataToUpdate.envelopeId === null ? undefined : dataToUpdate.envelopeId,
        description: dataToUpdate.description === null || dataToUpdate.description === "" ? undefined : dataToUpdate.description,
        date: formatISO(parsedDate), isTransfer: !!dataToUpdate.isTransfer,
    };
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
        userId: currentUser.uid, name: payeeData.name, createdAt: formatISO(new Date()),
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
    else cleanedData.category = undefined; 
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
    if (!metadataDocRef) return;
    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) return;

    let newCategoriesState = [...categories];
    let newOrderedCategoriesState = [...orderedCategories];
    let metadataNeedsUpdate = false;

    if (!newCategoriesState.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
        newCategoriesState = [...newCategoriesState, trimmedName].sort((a,b)=>a.localeCompare(b));
        newOrderedCategoriesState.push(trimmedName); // Add to end
        metadataNeedsUpdate = true;
    }
    
    if (metadataNeedsUpdate) {
        try {
            await updateDoc(metadataDocRef, { 
                categories: newCategoriesState, 
                orderedCategories: newOrderedCategoriesState,
                lastModified: serverTimestamp()
            });
            setCategories(newCategoriesState);
            setOrderedCategories(newOrderedCategoriesState);
        } catch (error) { console.error("Error adding category:", error); }
    } else {
        // console.log(`AppContext: Category "${trimmedName}" already effectively exists.`);
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

  const deleteEnvelope = useCallback(async (envelopeId: string): Promise<void> => {
    if (!db || !currentUser) throw new Error("User or DB not available");
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, envelopeId);
    const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
    const monthlyBudgetsPath = getCollectionPath(MONTHLY_BUDGETS_COLLECTION);
    const metadataDocRef = getMetadataDocRef();

    if (!envelopeDocPath || !transactionsPath || !metadataDocRef || !monthlyBudgetsPath) {
      throw new Error("One or more critical paths are null for deleteEnvelope.");
    }

    const envelopeToDelete = envelopes.find(env => env.id === envelopeId);
    if (!envelopeToDelete) throw new Error("Envelope to delete not found in local state.");

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, envelopeDocPath));

      const relatedTransactions = transactions.filter(tx => tx.envelopeId === envelopeId);
      relatedTransactions.forEach(tx => {
        const txDocPath = getDocPath(TRANSACTIONS_COLLECTION, tx.id);
        if (txDocPath) batch.update(doc(db, txDocPath), { envelopeId: deleteField() }); 
      });

      const monthlyBudgetQuery = query(collection(db, monthlyBudgetsPath), where("envelopeId", "==", envelopeId));
      const monthlyBudgetDocs = await getDocs(monthlyBudgetQuery);
      monthlyBudgetDocs.forEach(docSnap => batch.delete(docSnap.ref));
      
      await batch.commit(); 

      const updatedEnvelopesAfterDeletion = envelopes.filter(env => env.id !== envelopeId);
      setEnvelopes(updatedEnvelopesAfterDeletion);
      setTransactions(prev => prev.map(tx => tx.envelopeId === envelopeId ? { ...tx, envelopeId: undefined } : tx ));
      setMonthlyEnvelopeBudgets(prev => prev.filter(mb => mb.envelopeId !== envelopeId));
      
      const newDerivedCategories = deriveCategoriesFromEnvelopes(updatedEnvelopesAfterDeletion);
      let newOrderedCategoriesState = orderedCategories.filter(cat => newDerivedCategories.includes(cat));
      newDerivedCategories.forEach(derivedCat => {
          if (!newOrderedCategoriesState.includes(derivedCat)) {
              newOrderedCategoriesState.push(derivedCat);
          }
      });
      
      setCategories(newDerivedCategories);
      setOrderedCategories(newOrderedCategoriesState);

      await updateDoc(metadataDocRef, { 
          categories: newDerivedCategories, 
          orderedCategories: newOrderedCategoriesState,
          lastModified: serverTimestamp()
      });
    } catch (error) { 
        console.error("Error deleting envelope:", error); 
        throw error; 
    }
  }, [currentUser, envelopes, transactions, orderedCategories, monthlyEnvelopeBudgets, getDocPath, getCollectionPath, getMetadataDocRef, deriveCategoriesFromEnvelopes]);


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
  }, [currentUser, addTransaction, envelopes, payees, getCollectionPath]);

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
  }, [currentUser, addTransaction, accounts, payees, getCollectionPath]);

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

