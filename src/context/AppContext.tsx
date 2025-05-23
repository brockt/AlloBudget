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
  WriteBatch,
  FieldValue,
} from 'firebase/firestore';

const AppContext = createContext<AppContextType | undefined>(undefined);

const ACCOUNTS_COLLECTION = 'accounts';
const ENVELOPES_COLLECTION = 'envelopes';
const TRANSACTIONS_COLLECTION = 'transactions';
const PAYEES_COLLECTION = 'payees';
const APP_METADATA_COLLECTION = 'app_metadata';
const MONTHLY_BUDGETS_COLLECTION = 'monthlyBudgets';
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

  const updateLastModified = useCallback(async (batch?: WriteBatch) => {
    if (!db || !currentUser) return;
    const metadataDocRef = getMetadataDocRef();
    if (!metadataDocRef) return;
    const updateData = { lastModified: serverTimestamp() };
    if (batch) {
      batch.set(metadataDocRef, updateData, { merge: true });
    } else {
      await setDoc(metadataDocRef, updateData, { merge: true });
    }
  }, [currentUser, getMetadataDocRef]);

  const persistCategoryChanges = useCallback(async (
    newCategories: string[],
    newOrderedCategories: string[],
    batchToUse?: WriteBatch
  ): Promise<void> => {
    if (!currentUser) return Promise.reject(new Error("User not authenticated for persisting category changes."));
    const metadataDocRef = getMetadataDocRef();
    if (!metadataDocRef) {
      console.warn("AppContext (persistCategoryChanges): metadataDocRef is null.");
      return Promise.reject(new Error("Metadata document reference is not available."));
    }
    const dataToPersist = {
      categories: Array.isArray(newCategories) ? newCategories : [],
      orderedCategories: Array.isArray(newOrderedCategories) ? newOrderedCategories : [],
    };

    const batch = batchToUse || writeBatch(db);
    try {
      batch.set(metadataDocRef, dataToPersist, { merge: true });
      await updateLastModified(batch);
      if (!batchToUse) {
        await batch.commit();
      }
      // No return needed for void promise on success
    } catch (error) {
      console.error("AppContext: Error persisting category changes to Firestore:", error);
      throw error; // Re-throw the error
    }
  }, [currentUser, getMetadataDocRef, updateLastModified]);


  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !db) {
        setAccounts([]); setEnvelopes([]); setTransactions([]); setPayees([]);
        setCategories([]); setOrderedCategories([]); setLastModified(null);
        setMonthlyEnvelopeBudgets([]); setCurrentViewMonthState(startOfMonth(new Date()));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      console.log(`AppContext: Starting data fetch for user ${currentUser.uid}...`);
      try {
        const accountsPath = getCollectionPath(ACCOUNTS_COLLECTION);
        const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
        const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        const monthlyBudgetsPath = getCollectionPath(MONTHLY_BUDGETS_COLLECTION);

        if (!accountsPath || !envelopesPath || !transactionsPath || !payeesPath || !monthlyBudgetsPath) {
            setIsLoading(false); return;
        }

        const accountsSnapshot = await getDocs(collection(db, accountsPath));
        const fetchedAccounts = accountsSnapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            initialBalance: (typeof data.initialBalance === 'number' && !isNaN(data.initialBalance)) ? data.initialBalance : 0,
            createdAt: (data.createdAt && typeof data.createdAt === 'string' && isValid(parseISO(data.createdAt))) ? data.createdAt :
                       (data.createdAt && data.createdAt.toDate && typeof data.createdAt.toDate === 'function' && isValid(data.createdAt.toDate())) ? formatISO(data.createdAt.toDate()) :
                       formatISO(startOfDay(new Date())),
          } as Account;
        }).sort((a,b) => a.name.localeCompare(b.name));
        setAccounts(fetchedAccounts);
        // console.log("AppContext: Fetched Accounts from Firestore:", fetchedAccounts);

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
        setEnvelopes(processedEnvelopes);
        // console.log("AppContext: Processed Envelopes from Firestore:", processedEnvelopes);


        const transactionsQuery = query(collection(db, transactionsPath), orderBy("date", "desc"));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const fetchedTransactions = transactionsSnapshot.docs.map(d => ({
            id: d.id, ...d.data(),
            description: d.data().description === null || d.data().description === undefined ? undefined : d.data().description,
            envelopeId: d.data().envelopeId === null || d.data().envelopeId === undefined ? undefined : d.data().envelopeId,
            isTransfer: !!d.data().isTransfer,
            isActualIncome: !!d.data().isActualIncome,
            amount: (typeof d.data().amount === 'number' && !isNaN(d.data().amount)) ? d.data().amount : 0,
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

        // --- Category and Metadata Initialization ---
        let lmDate: string | null = null;
        const metadataDocRef = getMetadataDocRef();

        const actualDerivedCategories = [...new Set(processedEnvelopes.map(env => env.category || "Uncategorized"))].sort((a, b) => {
            if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
        });
        // console.log("AppContext: Actual Derived Categories from envelopes:", actualDerivedCategories);

        let finalOrderedCategories: string[] = [];
        if (metadataDocRef) {
            const metadataDocSnap = await getDoc(metadataDocRef);
            if (metadataDocSnap.exists()) {
                const metadata = metadataDocSnap.data();
                const storedOrdered = Array.isArray(metadata.orderedCategories) ? metadata.orderedCategories : [];
                // console.log("AppContext: Stored ordered categories from metadata:", storedOrdered);

                // Filter storedOrdered to keep only categories that actually exist
                finalOrderedCategories = storedOrdered.filter(cat => actualDerivedCategories.includes(cat));
                // Add any actual categories that weren't in the stored order
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

        // If, after all that, finalOrderedCategories is empty but we do have envelopes, initialize it
        if (finalOrderedCategories.length === 0 && actualDerivedCategories.length > 0) {
            // console.log("AppContext: No valid ordered categories from metadata, initializing from derived categories.");
            finalOrderedCategories = [...actualDerivedCategories]; // Default to derived order
        }

        // Ensure "Uncategorized" is last if it exists and there are other categories
        if (finalOrderedCategories.includes("Uncategorized") && finalOrderedCategories.length > 1) {
            finalOrderedCategories = finalOrderedCategories.filter(c => c !== "Uncategorized");
            finalOrderedCategories.push("Uncategorized");
        }
        // console.log("AppContext: Final reconciled ordered categories:", finalOrderedCategories);

        setCategories(actualDerivedCategories);
        setOrderedCategories(finalOrderedCategories);
        setLastModified(lmDate);

        // Persist the potentially reconciled/healed categories back to Firestore metadata
        await persistCategoryChanges(actualDerivedCategories, finalOrderedCategories);
        // console.log("AppContext: Data fetching successful for user", currentUser.uid);

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

        const batch = writeBatch(db);
        if (docIdToUpdate) {
            const docRef = doc(db, monthlyBudgetsPath, docIdToUpdate);
            batch.update(docRef, dataToSave);
        } else {
            const docRef = doc(collection(db, monthlyBudgetsPath));
            docIdToUpdate = docRef.id;
            batch.set(docRef, dataToSave);
        }
        await updateLastModified(batch);
        await batch.commit();

        if (existingData && docIdToUpdate) {
             setMonthlyEnvelopeBudgets(prev =>
                prev.map(b => b.id === docIdToUpdate ? { id: docIdToUpdate, ...dataToSave } : b)
            );
        } else if (docIdToUpdate) {
            setMonthlyEnvelopeBudgets(prev => [...prev, { id: docIdToUpdate!, ...dataToSave }]);
        }

    } catch (error) {
        console.error("Error setting monthly allocation:", error);
        throw error;
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

  const addEnvelope = async (envelopeData: EnvelopeFormData): Promise<void> => {
    if (!db || !currentUser) return Promise.reject(new Error("User not authenticated"));
    const envelopesPath = getCollectionPath(ENVELOPES_COLLECTION);
    if (!envelopesPath) return Promise.reject(new Error("Envelopes path not available"));

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
      const newEnvelopeWithId = {id: docRef.id, ...newEnvelopeServerData};

      let newLocalCategories = [...categories];
      let newLocalOrderedCategories = [...orderedCategories];

      if (!newLocalCategories.includes(category)) {
          newLocalCategories = [...newLocalCategories, category].sort((a,b)=>{
            if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
          });
           if (!newLocalOrderedCategories.includes(category)) {
                if (newLocalOrderedCategories.includes("Uncategorized") && newLocalOrderedCategories.length > 0) {
                    const uncatIndex = newLocalOrderedCategories.indexOf("Uncategorized");
                    newLocalOrderedCategories.splice(uncatIndex, 0, category);
                } else {
                    newLocalOrderedCategories.push(category);
                }
            }
      }

      const batch = writeBatch(db);
      batch.set(docRef, newEnvelopeServerData);
      await persistCategoryChanges(newLocalCategories, newLocalOrderedCategories, batch);
      await batch.commit();

      setCategories(newLocalCategories);
      setOrderedCategories(newLocalOrderedCategories);
      setEnvelopes(prev => [...prev, newEnvelopeWithId].sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity)));
      return Promise.resolve();
    } catch (error) {
      console.error("Error adding envelope:", error);
      return Promise.reject(error);
    }
  };

  const updateEnvelope = async (envelopeData: Partial<Envelope> & { id: string }): Promise<void> => {
    if (!db || !currentUser) return Promise.reject(new Error("User not authenticated"));
    const { id, ...dataFromForm } = envelopeData;
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, id);
    if (!envelopeDocPath) return Promise.reject(new Error("Envelope path not available"));

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
        if (firestoreUpdateData.hasOwnProperty(formKey)){
            (newLocalEnvelopeData as any)[formKey] = firestoreUpdateData[formKey] === deleteField() ? undefined : firestoreUpdateData[formKey];
        } else if (dataFromForm.hasOwnProperty(formKey)) {
             (newLocalEnvelopeData as any)[formKey] = (dataFromForm as any)[formKey];
        }
      });

      const updatedEnvelopesList = envelopes.map(env =>
          env.id === id ? { ...env, ...newLocalEnvelopeData } : env
      ).sort((a, b) => (a.orderIndex ?? Infinity) - (b.orderIndex ?? Infinity));

      const newCategoryFromForm = newLocalEnvelopeData.category;
      let finalLocalCategories = [...categories];
      let finalLocalOrderedCategories = [...orderedCategories];

      if (newCategoryFromForm && originalCategory !== newCategoryFromForm) {
          if (!finalLocalCategories.includes(newCategoryFromForm)) {
              finalLocalCategories = [...finalLocalCategories, newCategoryFromForm].sort((a,b)=>{
                  if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
              });
              if (!finalLocalOrderedCategories.includes(newCategoryFromForm)) {
                if (finalLocalOrderedCategories.includes("Uncategorized") && finalLocalOrderedCategories.length > 0) {
                    const uncatIndex = finalLocalOrderedCategories.indexOf("Uncategorized");
                    finalLocalOrderedCategories.splice(uncatIndex, 0, newCategoryFromForm);
                } else {
                    finalLocalOrderedCategories.push(newCategoryFromForm);
                }
              }
          }
      }

      if (originalCategory && (!newCategoryFromForm || originalCategory !== newCategoryFromForm)) {
          if (!updatedEnvelopesList.some(env => env.category === originalCategory)) {
              finalLocalCategories = finalLocalCategories.filter(cat => cat !== originalCategory);
              finalLocalOrderedCategories = finalLocalOrderedCategories.filter(cat => cat !== originalCategory);
          }
      }

      await persistCategoryChanges(finalLocalCategories, finalLocalOrderedCategories, batch);
      await batch.commit();

      setCategories(finalLocalCategories);
      setOrderedCategories(finalLocalOrderedCategories);
      setEnvelopes(updatedEnvelopesList);
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating envelope:", error);
      return Promise.reject(error);
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
    if (validatedNewOrder.includes("Uncategorized") && validatedNewOrder.length > 1) {
        validatedNewOrder = validatedNewOrder.filter(c => c !== "Uncategorized");
        validatedNewOrder.push("Uncategorized");
    }

    if (JSON.stringify(validatedNewOrder) === JSON.stringify(orderedCategories)) {
        await updateLastModified();
        return;
    }
    setOrderedCategories(validatedNewOrder);
    await persistCategoryChanges(currentDerivedCategories, validatedNewOrder);
  };

  const addTransaction = useCallback(async (transactionData: TransactionFormData): Promise<void> => {
    if (!db || !currentUser) return Promise.reject(new Error("User not authenticated"));
    const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
    if (!transactionsPath) return Promise.reject(new Error("Transactions path not available"));

    if (!transactionData.payeeId) {
      return Promise.reject(new Error("Payee is required"));
    }
    const parsedDate = transactionData.date ? parseISO(transactionData.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
      return Promise.reject(new Error("Invalid date"));
    }

    const dataToSave: { [key: string]: any } = {
        userId: currentUser.uid,
        accountId: transactionData.accountId,
        payeeId: transactionData.payeeId,
        amount: Number(transactionData.amount),
        type: transactionData.type,
        date: formatISO(parsedDate),
        createdAt: formatISO(new Date()),
        isTransfer: transactionData.isTransfer || false,
        isActualIncome: transactionData.type === 'inflow' ? (transactionData.isActualIncome || false) : false,
    };

    // Conditionally add description
    if (transactionData.description && transactionData.description.trim() !== "") {
        dataToSave.description = transactionData.description;
    }
    // Conditionally add envelopeId (handle null and empty string as "no envelope")
    if (transactionData.envelopeId && transactionData.envelopeId.trim() !== "") {
        dataToSave.envelopeId = transactionData.envelopeId;
    }


    try {
      const docRef = doc(collection(db, transactionsPath));
      const batch = writeBatch(db);
      batch.set(docRef, dataToSave);
      await updateLastModified(batch);
      await batch.commit();

      const newTxForState: Partial<Transaction> = { ...transactionData, id: docRef.id, userId: currentUser.uid, createdAt: dataToSave.createdAt, date: dataToSave.date };
      // Ensure optional fields are correctly set for local state
      newTxForState.description = dataToSave.description; // Will be undefined if not set
      newTxForState.envelopeId = dataToSave.envelopeId;   // Will be undefined if not set


      setTransactions(prev => [...prev, newTxForState as Transaction].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      return Promise.resolve();
    } catch (error) {
      console.error("Error adding transaction:", error);
      return Promise.reject(error);
    }
  }, [currentUser, getCollectionPath, updateLastModified]);

  const updateTransaction = useCallback(async (transactionData: TransactionWithId): Promise<void> => {
    if (!db || !currentUser) return Promise.reject(new Error("User not authenticated"));
    const { id, ...dataToUpdate } = transactionData;
    const transactionDocPath = getDocPath(TRANSACTIONS_COLLECTION, id);
    if (!transactionDocPath) return Promise.reject(new Error("Transaction path not available"));

    if (!dataToUpdate.payeeId) {
      return Promise.reject(new Error("Payee is required"));
    }
    const parsedDate = dataToUpdate.date ? parseISO(dataToUpdate.date) : null;
    if (!parsedDate || !isValid(parsedDate)) {
      return Promise.reject(new Error("Invalid date"));
    }

    const firestoreUpdateData: { [key: string]: any } = {
        accountId: dataToUpdate.accountId,
        payeeId: dataToUpdate.payeeId,
        amount: dataToUpdate.amount !== undefined ? Number(dataToUpdate.amount) : undefined,
        type: dataToUpdate.type,
        date: formatISO(parsedDate),
        isTransfer: !!dataToUpdate.isTransfer,
        isActualIncome: dataToUpdate.type === 'inflow' ? (dataToUpdate.isActualIncome || false) : false,
        updatedAt: serverTimestamp()
    };

    if (dataToUpdate.hasOwnProperty('description')) {
      firestoreUpdateData.description = (dataToUpdate.description && dataToUpdate.description.trim() !== "") ? dataToUpdate.description : deleteField();
    }
    if (dataToUpdate.hasOwnProperty('envelopeId')) {
      firestoreUpdateData.envelopeId = (dataToUpdate.envelopeId && dataToUpdate.envelopeId.trim() !== "" && dataToUpdate.envelopeId !== null) ? dataToUpdate.envelopeId : deleteField();
    }

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, transactionDocPath), firestoreUpdateData);
      await updateLastModified(batch);
      await batch.commit();

      const localUpdateData = { ...dataToUpdate, id, userId: currentUser.uid, date: firestoreUpdateData.date };
      if (firestoreUpdateData.description === deleteField()) localUpdateData.description = undefined;
      if (firestoreUpdateData.envelopeId === deleteField()) localUpdateData.envelopeId = undefined;
      if (firestoreUpdateData.updatedAt) (localUpdateData as any).updatedAt = formatISO(new Date());

      setTransactions(prev => prev.map(tx => tx.id === id ? localUpdateData as Transaction : tx)
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating transaction:", error);
      return Promise.reject(error);
    }
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

  const addCategory = async (categoryName: string): Promise<void> => {
    if (!db || !currentUser) return Promise.reject(new Error("User not authenticated"));
    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) return Promise.reject(new Error("Category name cannot be empty"));

    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      return Promise.resolve();
    }

    let newLocalCategories = [...categories, trimmedName].sort((a,b)=>{
         if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
    });
    let newLocalOrderedCategories = [...orderedCategories];
    if (newLocalOrderedCategories.includes("Uncategorized") && newLocalOrderedCategories.length > 0) {
        const uncatIndex = newLocalOrderedCategories.indexOf("Uncategorized");
        newLocalOrderedCategories.splice(uncatIndex, 0, trimmedName);
    } else {
        newLocalOrderedCategories.push(trimmedName);
    }

    try {
        await persistCategoryChanges(newLocalCategories, newLocalOrderedCategories);
        setCategories(newLocalCategories);
        setOrderedCategories(newLocalOrderedCategories);
        return Promise.resolve();
    } catch (error) {
        console.error("AppContext (addCategory): Failed to persist category changes:", error);
        return Promise.reject(error);
    }
  };

  const deleteTransaction = async (transactionId: string): Promise<void> => {
    if (!db || !currentUser) return Promise.reject(new Error("User not authenticated"));
    const transactionDocPath = getDocPath(TRANSACTIONS_COLLECTION, transactionId);
    if(!transactionDocPath) return Promise.reject(new Error("Transaction path not available"));
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, transactionDocPath));
      await updateLastModified(batch);
      await batch.commit();
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      return Promise.resolve();
    } catch (error) {
        console.error("Error deleting transaction:", error);
        throw error;
    }
  };

 const deleteEnvelope = useCallback(async (envelopeId: string): Promise<void> => {
    if (!db || !currentUser) throw new Error("User or DB not available");
    const envelopeDocPath = getDocPath(ENVELOPES_COLLECTION, envelopeId);
    const transactionsPath = getCollectionPath(TRANSACTIONS_COLLECTION);
    const monthlyBudgetsPath = getCollectionPath(MONTHLY_BUDGETS_COLLECTION);

    if (!envelopeDocPath || !transactionsPath || !monthlyBudgetsPath) {
      throw new Error("Critical paths are null for deleteEnvelope.");
    }

    const batch = writeBatch(db);
    try {
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

      const updatedEnvelopesListForState = envelopes.filter(env => env.id !== envelopeId);
      const updatedTransactionsListForState = transactions.map(tx => tx.envelopeId === envelopeId ? { ...tx, envelopeId: undefined } : tx );
      const updatedMonthlyBudgetsListForState = monthlyEnvelopeBudgets.filter(mb => mb.envelopeId !== envelopeId);

      const actualCategoriesAfterDelete = [...new Set(updatedEnvelopesListForState.map(env => env.category || "Uncategorized"))].sort((a,b)=>{
        if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1; return a.localeCompare(b);
      });
      let finalOrderedCategoriesAfterDelete = orderedCategories.filter(cat => actualCategoriesAfterDelete.includes(cat));
       if (finalOrderedCategoriesAfterDelete.length === 0 && actualCategoriesAfterDelete.length > 0) {
            finalOrderedCategoriesAfterDelete = [...actualCategoriesAfterDelete];
        }
      if (finalOrderedCategoriesAfterDelete.includes("Uncategorized") && finalOrderedCategoriesAfterDelete.length > 1) {
        finalOrderedCategoriesAfterDelete = finalOrderedCategoriesAfterDelete.filter(c => c !== "Uncategorized");
        finalOrderedCategoriesAfterDelete.push("Uncategorized");
      }

      await persistCategoryChanges(actualCategoriesAfterDelete, finalOrderedCategoriesAfterDelete, batch);
      await batch.commit();

      setEnvelopes(updatedEnvelopesListForState);
      setTransactions(updatedTransactionsListForState);
      setMonthlyEnvelopeBudgets(updatedMonthlyBudgetsListForState);
      setCategories(actualCategoriesAfterDelete);
      setOrderedCategories(finalOrderedCategoriesAfterDelete);
      // Promise resolves implicitly
    } catch (error) {
        console.error(`AppContext (deleteEnvelope): Error deleting envelope ${envelopeId}:`, error);
        throw error; // Re-throw the error to be caught by the calling component
    }
  }, [currentUser, envelopes, transactions, categories, orderedCategories, monthlyEnvelopeBudgets, getDocPath, getCollectionPath, persistCategoryChanges, updateLastModified, db]);


  const transferBetweenEnvelopes = useCallback(async (data: TransferEnvelopeFundsFormData): Promise<void> => {
    if (!currentUser) return Promise.reject(new Error("User not authenticated"));
    const { fromEnvelopeId, toEnvelopeId, amount, accountId, date, description } = data;
    const fromEnvelope = envelopes.find(e => e.id === fromEnvelopeId);
    const toEnvelope = envelopes.find(e => e.id === toEnvelopeId);
    if (!fromEnvelope || !toEnvelope) {
        console.error("Invalid source/destination envelope.");
        return Promise.reject(new Error("Invalid source or destination envelope."));
    }
    let internalTransferPayee = payees.find(p => p.name === "Internal Budget Transfer");
    if (!internalTransferPayee) {
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        if(!payeesPath) return Promise.reject(new Error("Payees path not available."));
        const payeeDocRef = doc(collection(db, payeesPath));
        const newPayeeData: Omit<Payee, 'id'> = { name: "Internal Budget Transfer",userId: currentUser.uid, createdAt: formatISO(new Date())};
        try {
            const batch = writeBatch(db);
            batch.set(payeeDocRef, newPayeeData);
            await updateLastModified(batch);
            await batch.commit();
            internalTransferPayee = {id: payeeDocRef.id, ...newPayeeData};
            setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Error creating internal budget transfer payee:", error);
            return Promise.reject(error);
        }
    }

    try {
      await addTransaction({
        accountId, envelopeId: fromEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'outflow',
        description: description || `Transfer to ${toEnvelope.name}`, date, isTransfer: false, isActualIncome: false,
      });
      await addTransaction({
        accountId, envelopeId: toEnvelopeId, payeeId: internalTransferPayee.id, amount, type: 'inflow',
        description: description || `Transfer from ${fromEnvelope.name}`, date, isTransfer: false, isActualIncome: false,
      });
      return Promise.resolve();
    } catch (error) {
      console.error("Error during envelope fund transfer transactions:", error);
      throw error; // Re-throw error
    }
  }, [currentUser, addTransaction, envelopes, payees, getCollectionPath, updateLastModified]);

  const transferBetweenAccounts = useCallback(async (data: TransferAccountFundsFormData): Promise<void> => {
    if(!currentUser) return Promise.reject(new Error("User not authenticated"));
    const { fromAccountId, toAccountId, amount, date, description } = data;
    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    const toAccount = accounts.find(acc => acc.id === toAccountId);
    if (!fromAccount || !toAccount) {
        console.error("Invalid source/destination account.");
        return Promise.reject(new Error("Invalid source or destination account."));
    }
    let internalTransferPayee = payees.find(p => p.name === "Internal Account Transfer");
    if (!internalTransferPayee) {
        const payeesPath = getCollectionPath(PAYEES_COLLECTION);
        if(!payeesPath) return Promise.reject(new Error("Payees path not available."));
        const payeeDocRef = doc(collection(db, payeesPath));
        const newPayeeData: Omit<Payee, 'id'> = { name: "Internal Account Transfer", userId: currentUser.uid, createdAt: formatISO(new Date())};
        try {
            const batch = writeBatch(db);
            batch.set(payeeDocRef, newPayeeData);
            await updateLastModified(batch);
            await batch.commit();
            internalTransferPayee = {id: payeeDocRef.id, ...newPayeeData};
            setPayees(prev => [...prev, internalTransferPayee!].sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error("Error creating internal account transfer payee:", error);
            return Promise.reject(error);
        }
    }
    try {
      await addTransaction({
          accountId: fromAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'outflow',
          description: description || `Transfer to ${toAccount.name}`, date, isTransfer: true, isActualIncome: false,
      });
      await addTransaction({
          accountId: toAccountId, envelopeId: null, payeeId: internalTransferPayee.id, amount, type: 'inflow',
          description: description || `Transfer from ${fromAccount.name}`, date, isTransfer: true, isActualIncome: false,
      });
      return Promise.resolve();
    } catch (error) {
        console.error("Error during account fund transfer transactions:", error);
        throw error; // Re-throw error
    }
  }, [currentUser, addTransaction, accounts, payees, getCollectionPath, updateLastModified]);

  const getAccountBalance = useCallback((accountId: string): number => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return 0;

    const validInitialBalance = (typeof account.initialBalance === 'number' && !isNaN(account.initialBalance))
      ? account.initialBalance
      : 0;

    const balance = transactions.reduce((currentBalance, tx) => {
      if (tx.accountId === accountId) {
        const txAmount = (typeof tx.amount === 'number' && !isNaN(tx.amount)) ? tx.amount : 0;
        return tx.type === 'inflow' ? currentBalance + txAmount : currentBalance - txAmount;
      }
      return currentBalance;
    }, validInitialBalance);

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
          if (tx.envelopeId !== envelopeId || tx.type !== 'outflow') return false;
          const txDate = parseISO(tx.date);
          return isValid(txDate) && isWithinInterval(txDate, {start: monthStart, end: monthEnd});
      })
      .reduce((sum, tx) => (sum + ((typeof tx.amount === 'number' && !isNaN(tx.amount)) ? tx.amount : 0)), 0);
      return isNaN(spending) ? 0 : spending;
  }, [transactions]);

  // New function to get envelope inflows
  const getEnvelopeInflows = useCallback((envelopeId: string, forMonth: Date): number => {
    const monthStart = startOfMonth(forMonth);
    const monthEnd = endOfMonth(forMonth);
    const inflows = transactions
      .filter(tx => {
          if (tx.envelopeId !== envelopeId || tx.type !== 'inflow') return false;
          const txDate = parseISO(tx.date);
          return isValid(txDate) && isWithinInterval(txDate, {start: monthStart, end: monthEnd});
      })
      .reduce((sum, tx) => (sum + ((typeof tx.amount === 'number' && !isNaN(tx.amount)) ? tx.amount : 0)), 0);
      return isNaN(inflows) ? 0 : inflows;
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
        const inflowsThisMonth = getEnvelopeInflows(envelopeId, monthToProcess);

        currentBalance += allocatedThisMonth;
        currentBalance += inflowsThisMonth; // Add inflows to the envelope balance
        currentBalance -= spentThisMonth;

        monthToProcess = addMonths(monthToProcess, 1);
    }
    return isNaN(currentBalance) ? 0 : currentBalance;
  }, [envelopes, getMonthlyAllocation, getEnvelopeSpending, getEnvelopeInflows]);

  const getEffectiveMonthlyBudgetWithRollover = useCallback((envelopeId: string, forMonth: Date): number => {
    const previousMonth = subMonths(startOfMonth(forMonth), 1);
    const balanceAtEndOfPreviousMonth = getEnvelopeBalanceAsOfEOM(envelopeId, previousMonth);
    const currentMonthAllocation = getMonthlyAllocation(envelopeId, forMonth);

    const rolloverAmount = Math.max(0, balanceAtEndOfPreviousMonth);

    return currentMonthAllocation + rolloverAmount;
  }, [getEnvelopeBalanceAsOfEOM, getMonthlyAllocation]);


  const getPayeeTransactions = useCallback((payeeId: string): Transaction[] => {
    return transactions
        .filter(tx => tx.payeeId === payeeId)
        .sort((a, b) => {
            const dateA = parseISO(a.date); const dateB = parseISO(b.date);
            if (!isValid(dateA)) return 1; if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
  }, [transactions]);

  const getMonthlyActualIncomeTotal = useCallback((forMonth: Date): number => {
    const monthStart = startOfMonth(forMonth); const monthEnd = endOfMonth(forMonth);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'inflow' && tx.isActualIncome && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        return total + ((typeof tx.amount === 'number' && !isNaN(tx.amount)) ? tx.amount : 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  const getMonthlyOutflowTotal = useCallback((forMonth: Date): number => {
    const monthStart = startOfMonth(forMonth); const monthEnd = endOfMonth(forMonth);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'outflow' && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
        return total + ((typeof tx.amount === 'number' && !isNaN(tx.amount)) ? tx.amount : 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  const getTotalMonthlyBudgeted = useCallback((forMonth: Date): number => {
    return envelopes.reduce((total, env) => {
        const amountToAdd = getMonthlyAllocation(env.id, forMonth);
        return total + ((typeof amountToAdd === 'number' && !isNaN(amountToAdd)) ? amountToAdd : 0);
    }, 0);
  }, [envelopes, getMonthlyAllocation]);

  const getYtdActualIncomeTotal = useCallback((): number => {
    const now = new Date(); const yearStart = startOfYear(now); const todayEnd = endOfDay(now);
    return transactions.reduce((total, tx) => {
      const txDate = parseISO(tx.date);
      if (tx.type === 'inflow' && tx.isActualIncome && !tx.isTransfer && isValid(txDate) && isWithinInterval(txDate, { start: yearStart, end: todayEnd })) {
        return total + ((typeof tx.amount === 'number' && !isNaN(tx.amount)) ? tx.amount : 0);
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
      getEnvelopeSpending, getEnvelopeBalanceAsOfEOM, getMonthlyAllocation, getEffectiveMonthlyBudgetWithRollover,
      getMonthlyActualIncomeTotal, getMonthlyOutflowTotal, getTotalMonthlyBudgeted, getYtdActualIncomeTotal,
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
