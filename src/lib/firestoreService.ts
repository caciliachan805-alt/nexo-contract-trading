import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { User, Transaction, Trade, AuditLog, KYCDocument } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getUserProfile = async (uid: string) => {
  const path = `users/${uid}`;
  console.log(`[Firestore] Attempting to fetch profile for UID: ${uid} at path: ${path}`);
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`[Firestore] Profile found for UID: ${uid}`);
      return docSnap.data();
    }
    console.log(`[Firestore] No profile found for UID: ${uid}`);
    return null;
  } catch (error) {
    console.error(`[Firestore] Error fetching profile for UID: ${uid}`, error);
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const createUserProfile = async (uid: string, data: any) => {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToUserProfile = (uid: string, callback: (data: any) => void) => {
  const path = `users/${uid}`;
  return onSnapshot(doc(db, 'users', uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const subscribeToTransactions = (uid: string, callback: (data: any[]) => void) => {
  const path = 'transactions';
  const q = query(collection(db, 'transactions'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(transactions);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const subscribeToDeposits = (uid: string, callback: (data: Transaction[]) => void) => {
  const path = 'transactions';
  const q = query(
    collection(db, 'transactions'), 
    where('userId', '==', uid), 
    where('type', '==', 'deposit')
  );
  return onSnapshot(q, (snapshot) => {
    const deposits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    callback(deposits);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const subscribeToActivePlans = (uid: string, callback: (data: any[]) => void) => {
  const path = 'activeMiningPlans';
  const q = query(collection(db, 'activeMiningPlans'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(plans);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const placeTrade = async (trade: any) => {
  const path = `trades/${trade.id}`;
  try {
    await setDoc(doc(db, 'trades', trade.id), trade);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToUserTrades = (uid: string, callback: (data: any[]) => void) => {
  const path = 'trades';
  const q = query(collection(db, 'trades'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(trades);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const createTransaction = async (transaction: any) => {
  const path = `transactions/${transaction.id}`;
  try {
    await setDoc(doc(db, 'transactions', transaction.id), transaction);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Admin Services
export const getAllUsers = async () => {
  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getAllTransactions = async () => {
  const path = 'transactions';
  try {
    const snapshot = await getDocs(collection(db, 'transactions'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getAllTrades = async () => {
  const path = 'trades';
  try {
    const snapshot = await getDocs(collection(db, 'trades'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const updateTransactionStatus = async (id: string, status: 'approved' | 'rejected', amount?: number) => {
  const txRef = doc(db, 'transactions', id);
  try {
    const txSnap = await getDoc(txRef);
    
    if (txSnap.exists()) {
      const txData = txSnap.data() as Transaction;
      const finalAmount = amount !== undefined ? amount : txData.amountTo;
      
      await updateDoc(txRef, { 
        status, 
        amountTo: finalAmount,
        updatedAt: new Date().toISOString()
      });

      if (status === 'approved') {
        const userRef = doc(db, 'users', txData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (txData.type === 'deposit') {
            await updateDoc(userRef, { 
              availableBalance: (userData.availableBalance || 0) + finalAmount 
            });
          } else if (txData.type === 'withdrawal') {
            await updateDoc(userRef, { 
              availableBalance: (userData.availableBalance || 0) - finalAmount 
            });
          }
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
  }
};

export const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateUserDetails = async (userId: string, data: any) => {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Audit Log Service
export const createAuditLog = async (log: Omit<AuditLog, 'id'>) => {
  const auditRef = doc(collection(db, 'auditLogs'));
  const logWithId = { ...log, id: auditRef.id };
  try {
    await setDoc(auditRef, logWithId);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `auditLogs/${auditRef.id}`);
  }
};

export const getAuditLogs = async (userId?: string) => {
  const path = 'auditLogs';
  try {
    let q = query(collection(db, 'auditLogs'));
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as AuditLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

// KYC Service
export const submitKYCDocument = async (docData: Omit<KYCDocument, 'id'>) => {
  const kycRef = doc(collection(db, 'kycDocuments'));
  const dataWithId = { ...docData, id: kycRef.id };
  try {
    await setDoc(kycRef, dataWithId);
    // Update user pending status
    const userRef = doc(db, 'users', docData.userId);
    await updateDoc(userRef, { kycVerified: false }); // Ensure it's not verified yet
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `kycDocuments/${kycRef.id}`);
  }
};

export const getKYCDocuments = async (userId?: string) => {
  const path = 'kycDocuments';
  try {
    let q = query(collection(db, 'kycDocuments'));
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as KYCDocument);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const reviewKYCDocument = async (docId: string, status: 'approved' | 'rejected', reason?: string) => {
  const path = `kycDocuments/${docId}`;
  try {
    const kycRef = doc(db, 'kycDocuments', docId);
    const kycSnap = await getDoc(kycRef);
    if (kycSnap.exists()) {
      const kycData = kycSnap.data() as KYCDocument;
      await updateDoc(kycRef, { 
        status, 
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason 
      });

      if (status === 'approved') {
        const userRef = doc(db, 'users', kycData.userId);
        await updateDoc(userRef, { kycVerified: true });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Alert Service
export const createAlert = async (alert: any) => {
  const path = `alerts/${alert.id}`;
  try {
    await setDoc(doc(db, 'alerts', alert.id), alert);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteAlert = async (alertId: string) => {
  const path = `alerts/${alertId}`;
  try {
    const alertRef = doc(db, 'alerts', alertId);
    await deleteDoc(alertRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateAlertStatus = async (alertId: string, status: 'active' | 'triggered') => {
  const path = `alerts/${alertId}`;
  try {
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateAlertThreshold = async (alertId: string, threshold: number) => {
  const path = `alerts/${alertId}`;
  try {
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, { threshold });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToUserAlerts = (uid: string, callback: (data: any[]) => void) => {
  const path = 'alerts';
  const q = query(collection(db, 'alerts'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(alerts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};
