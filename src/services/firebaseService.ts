import { 
  collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clause, SampleTemplate, FolderNode, ContractDocument } from '../types';
import { INITIAL_CLAUSES, SAMPLE_TEMPLATES, INITIAL_FOLDERS } from '../data/initialData';

const CLAUSES_COLLECTION = 'clauses';
const TEMPLATES_COLLECTION = 'templates';
const FOLDERS_COLLECTION = 'folders';
const CONTRACTS_COLLECTION = 'contracts';

/**
 * Recursively strips undefined values from objects and arrays for Firestore compatibility.
 * Firestore setDoc/updateDoc throws an error if any field is undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as T;
}

/**
 * Seeds initial clauses, templates, and folders into Firestore if collections are empty.
 */
export async function seedFirestoreIfEmpty() {
  try {
    const clausesSnap = await getDocs(collection(db, CLAUSES_COLLECTION));
    const templatesSnap = await getDocs(collection(db, TEMPLATES_COLLECTION));
    const foldersSnap = await getDocs(collection(db, FOLDERS_COLLECTION));

    // Only seed initial sample data if the entire database is empty/uninitialized
    if (clausesSnap.empty && templatesSnap.empty && foldersSnap.empty) {
      console.log('Database is completely empty. Seeding initial sample data to Firestore...');
      
      for (const clause of INITIAL_CLAUSES) {
        await setDoc(doc(db, CLAUSES_COLLECTION, clause.id), sanitizeForFirestore(clause));
      }
      
      for (const tpl of SAMPLE_TEMPLATES) {
        await setDoc(doc(db, TEMPLATES_COLLECTION, tpl.id), sanitizeForFirestore(tpl));
      }
      
      for (const folder of INITIAL_FOLDERS) {
        await setDoc(doc(db, FOLDERS_COLLECTION, folder.id), sanitizeForFirestore(folder));
      }
    }
  } catch (error) {
    console.error('Error seeding Firestore:', error);
  }
}

/**
 * Subscribe to real-time clauses updates
 */
export function subscribeToClauses(callback: (clauses: Clause[]) => void) {
  const q = query(collection(db, CLAUSES_COLLECTION));
  let isFirst = true;
  return onSnapshot(q, (snapshot) => {
    const items: Clause[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ ...(docSnap.data() as Clause), id: docSnap.id });
    });
    if (items.length > 0 || !isFirst) {
      callback(items);
    }
    isFirst = false;
  }, (err) => {
    console.warn('Firestore clauses subscription warning:', err);
  });
}

/**
 * Subscribe to real-time templates updates
 */
export function subscribeToTemplates(callback: (templates: SampleTemplate[]) => void) {
  const q = query(collection(db, TEMPLATES_COLLECTION));
  let isFirst = true;
  return onSnapshot(q, (snapshot) => {
    const items: SampleTemplate[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ ...(docSnap.data() as SampleTemplate), id: docSnap.id });
    });
    if (items.length > 0 || !isFirst) {
      callback(items);
    }
    isFirst = false;
  }, (err) => {
    console.warn('Firestore templates subscription warning:', err);
  });
}

/**
 * Subscribe to real-time folders updates
 */
export function subscribeToFolders(callback: (folders: FolderNode[]) => void) {
  const q = query(collection(db, FOLDERS_COLLECTION));
  let isFirst = true;
  return onSnapshot(q, (snapshot) => {
    const items: FolderNode[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ ...(docSnap.data() as FolderNode), id: docSnap.id });
    });
    if (items.length > 0 || !isFirst) {
      callback(items);
    }
    isFirst = false;
  }, (err) => {
    console.warn('Firestore folders subscription warning:', err);
  });
}

/**
 * Save or update a clause in Firestore
 */
export async function saveClauseToDb(clause: Clause) {
  try {
    const cleanData = sanitizeForFirestore(clause);
    await setDoc(doc(db, CLAUSES_COLLECTION, clause.id), cleanData, { merge: true });
  } catch (error) {
    console.error('Error saving clause to Firestore:', error);
  }
}

/**
 * Delete a clause from Firestore
 */
export async function deleteClauseFromDb(clauseId: string) {
  try {
    await deleteDoc(doc(db, CLAUSES_COLLECTION, clauseId));
  } catch (error) {
    console.error('Error deleting clause from Firestore:', error);
  }
}

/**
 * Save or update a template in Firestore
 */
export async function saveTemplateToDb(template: SampleTemplate) {
  try {
    const cleanData = sanitizeForFirestore(template);
    await setDoc(doc(db, TEMPLATES_COLLECTION, template.id), cleanData, { merge: true });
  } catch (error) {
    console.error('Error saving template to Firestore:', error);
  }
}

/**
 * Delete a template from Firestore
 */
export async function deleteTemplateFromDb(templateId: string) {
  try {
    await deleteDoc(doc(db, TEMPLATES_COLLECTION, templateId));
  } catch (error) {
    console.error('Error deleting template from Firestore:', error);
  }
}

/**
 * Save or update a contract document in Firestore
 */
export async function saveContractToDb(contract: ContractDocument) {
  try {
    const cleanData = sanitizeForFirestore(contract);
    await setDoc(doc(db, CONTRACTS_COLLECTION, contract.id), cleanData, { merge: true });
  } catch (error) {
    console.error('Error saving contract to Firestore:', error);
  }
}
