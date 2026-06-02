import { apiClient } from "@/lib/api-client";
import type { AttachmentResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8082";

export const attachmentsApi = {
  list: (taskId: string | number) =>
    apiClient.get<AttachmentResponse[]>(`/api/tasks/${taskId}/attachments`),

  upload: (taskId: string | number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<AttachmentResponse>(`/api/tasks/${taskId}/attachments`, form);
  },

  getDownloadUrl: (attachmentId: number) =>
    apiClient.get<{ url: string }>(`/api/attachments/${attachmentId}/download`),

  delete: (attachmentId: number) =>
    apiClient.delete<void>(`/api/attachments/${attachmentId}`),
};
