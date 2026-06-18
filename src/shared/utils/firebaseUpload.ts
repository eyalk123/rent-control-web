import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/core/auth/firebase';

// Keep these in sync with storage.rules (server-side enforcement is authoritative;
// these client-side checks give faster, friendlier feedback).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Non-image upload types we accept. Mirror these in storage.rules' isAllowedType().
const ALLOWED_DOC_TYPES = new Set([
  'application/pdf',
  'application/msword', // legacy .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

function isAllowedType(type: string): boolean {
  return type.startsWith('image/') || ALLOWED_DOC_TYPES.has(type);
}

export class UploadValidationError extends Error {}

export async function uploadToFirebase(
  file: File,
  entityType: string,
  ownerId: string,
): Promise<string> {
  if (!isAllowedType(file.type)) {
    throw new UploadValidationError(
      `Unsupported file type: ${file.type || 'unknown'}. Only images, PDF, and Word documents are allowed.`,
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    );
  }

  const uuid = crypto.randomUUID();
  const storageRef = ref(storage, `${entityType}/${ownerId}/${uuid}/${file.name}`);
  // Pass an explicit content type so the Storage rules' contentType check is reliable.
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
