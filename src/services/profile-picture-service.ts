
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

/**
 * Uploads a profile picture for a student to Firebase Storage and updates the student's profile picture URL.
 *
 * @param studentFirestoreId The Firestore ID of the student.
 * @param file The image file to upload.
 * @returns A promise that resolves with the download URL of the uploaded picture.
 */
export async function uploadProfilePicture(studentFirestoreId: string, file: File): Promise<string> {
  if (!studentFirestoreId) {
    throw new Error("Student Firestore ID is required.");
  }
  if (!file) {
    throw new Error("File is required.");
  }

  const fileExtension = file.name.split('.').pop();
  const fileName = `profilePicture.${fileExtension}`;
  const imageRef = storageRef(storage, `profilePictures/${studentFirestoreId}/${fileName}`);

  const uploadTask = await uploadBytesResumable(imageRef, file);
  const downloadURL = await getDownloadURL(uploadTask.ref);

  const studentDocRef = doc(db, 'students', studentFirestoreId);
  await updateDoc(studentDocRef, {
    profilePictureUrl: downloadURL,
  });

  return downloadURL;
}
