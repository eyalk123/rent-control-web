import apiClient from '@/core/api/client';
import { USE_MOCK_API, mockAgentApi } from '@/core/api/mock';
import type { AgentStatus, ConversationDetail, ConversationSummary } from '../types';
import { streamAgentChatHttp, type StreamChatArgs } from './agentStream';

export async function getAgentStatus(): Promise<AgentStatus> {
  if (USE_MOCK_API) return mockAgentApi.getStatus();
  const { data } = await apiClient.get<AgentStatus>('/agent/status');
  return data;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  if (USE_MOCK_API) return mockAgentApi.listConversations();
  const { data } = await apiClient.get<ConversationSummary[]>('/agent/conversations');
  return data;
}

export async function getConversation(id: number): Promise<ConversationDetail> {
  if (USE_MOCK_API) return mockAgentApi.getConversation(id);
  const { data } = await apiClient.get<ConversationDetail>(`/agent/conversations/${id}`);
  return data;
}

export async function deleteConversation(id: number): Promise<void> {
  if (USE_MOCK_API) return mockAgentApi.deleteConversation(id);
  await apiClient.delete(`/agent/conversations/${id}`);
}

/** Stream a chat turn. Returns when the stream ends (a `done` or `error` event has fired). */
export function streamAgentChat(args: StreamChatArgs): Promise<void> {
  if (USE_MOCK_API) return mockAgentApi.stream(args);
  return streamAgentChatHttp(args);
}
