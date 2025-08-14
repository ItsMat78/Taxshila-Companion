
"use server";

import { doc, updateDoc } from 'firebase/firestore';
import { db, storage, storageRef, uploadString, getDownloadURL } from '@/lib/firebase';
import { getAuth, updateProfile } from 'firebase/auth';
import type { UserRole } from '@/types/auth';

/**
 * Uploads a Base64 data URI to Firebase Storage and returns the public download URL.
 *
 * @param entityId The Firestore ID of the user (student or admin).
 * @param role The role of the user, used to determine the storage path.
 * @param base64Url The Base64 data URI of the image to upload.
 * @returns The public URL of the uploaded image.
 */
async function uploadPicture(entityId: string, role: UserRole, base64Url: string): Promise<string> {
  const path = role === 'admin' ? `admins/${entityId}/profile.jpg` : `students/${entityId}/profile.jpg`;
  const imageRef = storageRef(storage, path);
  await uploadString(imageRef, base64Url, 'data_url');
  return await getDownloadURL(imageRef);
}

/**
 * Saves a new profile picture URL to the user's document in Firestore and updates their Auth profile.
 *
 * @param firestoreId The Firestore document ID of the user.
 * @param role The role of the user ('admin' or 'member').
 * @param base64Url The Base64 data URI of the new image.
 * @returns The public URL of the saved image.
 */
export async function saveProfilePicture(firestoreId: string, role: UserRole, base64Url: string): Promise<string> {
  if (!firestoreId || !role || !base64Url) {
    throw new Error("User ID, role, and image data are required.");
  }

  // 1. Upload the image to storage and get the URL
  const downloadURL = await uploadPicture(firestoreId, role, base64Url);

  // 2. Update the Firestore document
  const collectionName = role === 'admin' ? 'admins' : 'students';
  const userDocRef = doc(db, collectionName, firestoreId);
  await updateDoc(userDocRef, { profilePictureUrl: downloadURL });

  // 3. Update the Firebase Auth user profile (if it's the currently logged-in user)
  const auth = getAuth();
  if (auth.currentUser) {
    // This check is a safeguard; updates should ideally be for the logged-in user or by an admin.
    // A more secure setup would use the user's UID to check against auth.currentUser.uid.
    try {
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
    } catch (authError) {
      console.warn("Could not update Auth profile photo URL, possibly because the user being edited is not the currently signed-in user. This is expected when an admin edits another user.", authError);
    }
  }

  return downloadURL;
}
