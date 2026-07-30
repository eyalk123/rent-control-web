import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteConversation,
  getAgentStatus,
  getConversation,
  listConversations,
} from './api/agentApi';

export const agentKeys = {
  status: ['agent', 'status'] as const,
  conversations: ['agent', 'conversations'] as const,
  conversation: (id: number) => ['agent', 'conversation', id] as const,
};

/** Whether the agent is configured on the backend — drives whether the launcher shows. */
export function useAgentStatus() {
  return useQuery({ queryKey: agentKeys.status, queryFn: getAgentStatus, staleTime: Infinity });
}

export function useConversations(enabled = true) {
  return useQuery({ queryKey: agentKeys.conversations, queryFn: listConversations, enabled });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: agentKeys.conversation(id ?? -1),
    queryFn: () => getConversation(id as number),
    enabled: id != null,
  });
}

export function useInvalidateConversations() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: agentKeys.conversations });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.conversations }),
  });
}
