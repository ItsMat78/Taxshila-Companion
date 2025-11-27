
"use server";

import {
  db,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  query
} from '@/lib/firebase';
import { formatISO } from 'date-fns';

const NOTES_COLLECTION = "adminNotes";

export interface AdminNote {
  id: string;
  content: string;
  date: string; // ISO string format
}

const noteFromDoc = (docSnapshot: any): AdminNote => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    content: data.content,
    date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date,
  };
};

export async function getAllAdminNotes(): Promise<AdminNote[]> {
  const q = query(collection(db, NOTES_COLLECTION), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(noteFromDoc);
}

export async function addAdminNote(content: string): Promise<AdminNote> {
  const newNoteData = {
    content,
    date: Timestamp.fromDate(new Date()),
  };
  const docRef = await addDoc(collection(db, NOTES_COLLECTION), newNoteData);
  return {
    id: docRef.id,
    content,
    date: newNoteData.date.toDate().toISOString(),
  };
}

export async function updateAdminNote(noteId: string, content: string): Promise<void> {
  const noteDocRef = doc(db, NOTES_COLLECTION, noteId);
  await updateDoc(noteDocRef, {
    content,
    date: Timestamp.fromDate(new Date()), // Also update the date on edit
  });
}

export async function deleteAdminNote(noteId: string): Promise<void> {
  const noteDocRef = doc(db, NOTES_COLLECTION, noteId);
  await deleteDoc(noteDocRef);
}
