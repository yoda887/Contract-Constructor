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
 * Seeds initial clauses, templates, and folders into Firestore if collections are empty.
 */
export async function seedFirestoreIfEmpty() {
  try {
    // Clauses
    const clausesSnap = await getDocs(collection(db, CLAUSES_COLLECTION));
    if (clausesSnap.empty) {
      console.log('Seeding initial clauses to Firestore...');
      for (const clause of INITIAL_CLAUSES) {
        await setDoc(doc(db, CLAUSES_COLLECTION, clause.id), clause);
      }
    }

    // Templates
    const templatesSnap = await getDocs(collection(db, TEMPLATES_COLLECTION));
    if (templatesSnap.empty) {
      console.log('Seeding initial templates to Firestore...');
      for (const tpl of SAMPLE_TEMPLATES) {
        await setDoc(doc(db, TEMPLATES_COLLECTION, tpl.id), tpl);
      }
    }

    // Folders
    const foldersSnap = await getDocs(collection(db, FOLDERS_COLLECTION));
    if (foldersSnap.empty) {
      console.log('Seeding initial folders to Firestore...');
      for (const folder of INITIAL_FOLDERS) {
        await setDoc(doc(db, FOLDERS_COLLECTION, folder.id), folder);
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
    await setDoc(doc(db, CLAUSES_COLLECTION, clause.id), clause, { merge: true });
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
    await setDoc(doc(db, TEMPLATES_COLLECTION, template.id), template, { merge: true });
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
    await setDoc(doc(db, CONTRACTS_COLLECTION, contract.id), contract, { merge: true });
  } catch (error) {
    console.error('Error saving contract to Firestore:', error);
  }
}
