
"use server";

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Saves a Base64 data URI as the profile picture URL in a student's Firestore document.
 *
 * @param studentFirestoreId The Firestore ID of the student.
 * @param base64Url The Base64 data URI of the image to save.
 * @returns A promise that resolves when the update is complete.
 */
export async function saveProfilePictureUrl(studentFirestoreId: string, base64Url: string): Promise<void> {
  if (!studentFirestoreId) {
    throw new Error("Student Firestore ID is required.");
  }
  if (!base64Url) {
    throw new Error("Base64 URL is required.");
  }
  if (!base64Url.startsWith('data:image/')) {
    throw new Error("Invalid Base64 data URI format.");
  }

  const studentDocRef = doc(db, 'students', studentFirestoreId);
  await updateDoc(studentDocRef, {
    profilePictureUrl: base64Url,
  });
}
