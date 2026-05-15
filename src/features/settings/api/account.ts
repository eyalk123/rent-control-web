import apiClient from '@/core/api/client';

export async function deleteMyAccount(): Promise<void> {
  await apiClient.delete('/users/me');
}
