import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const dbId = (firebaseConfig as any).firestoreDatabaseId || "ai-studio-f37c289b-aa59-4c44-bb8c-93208cbac09b";
let firestoreDb: any = null;
try {
  if (dbId && dbId !== '(default)') {
    try {
      firestoreDb = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      }, dbId);
    } catch {
      try {
        firestoreDb = getFirestore(app, dbId);
      } catch {
        firestoreDb = getFirestore(app);
      }
    }
  } else {
    firestoreDb = getFirestore(app);
  }
} catch (err) {
  console.warn("Aviso ao inicializar Firestore:", err);
  try {
    firestoreDb = getFirestore(app);
  } catch (finalErr) {
    console.error("Firestore não disponível:", finalErr);
    firestoreDb = null;
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);

// In the AI Studio iframe environment, third-party cookies/IndexedDB might be restricted.
// Using localStorage (browserLocalPersistence) improves session stability.
setPersistence(auth, browserLocalPersistence).catch(console.error);

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
