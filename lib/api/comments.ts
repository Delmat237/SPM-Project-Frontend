import { apiClient } from "@/lib/api-client";
import type { CommentResponse } from "@/types";

export const commentsApi = {
  list: (taskId: string | number) =>
    apiClient.get<CommentResponse[]>(`/api/tasks/${taskId}/comments`),

  create: (taskId: string | number, content: string) =>
    apiClient.post<CommentResponse>(`/api/tasks/${taskId}/comments`, { content }),

  update: (commentId: string | number, content: string) =>
    apiClient.patch<CommentResponse>(`/api/comments/${commentId}`, { content }),

  delete: (commentId: string | number) =>
    apiClient.delete<void>(`/api/comments/${commentId}`),
};
