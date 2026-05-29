import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/core/auth/firebase';

export async function uploadToFirebase(
  file: File,
  entityType: string,
  ownerId: string,
): Promise<string> {
  const uuid = crypto.randomUUID();
  const storageRef = ref(storage, `${entityType}/${ownerId}/${uuid}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
