import { apiClient } from "@/lib/api-client";
import type { TaskResponse, KanbanResponse, GanttResponse, PageResponse } from "@/types";

export const BACKEND_STATUS: Record<string, string> = {
  todo: "TODO",
  in_progress: "IN_PROGRESS",
  in_review: "IN_REVIEW",
  done: "DONE",
  blocked: "BLOCKED",
};

interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: number;
  startDate?: string;
  dueDate?: string;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: string;
  assigneeId?: number;
  startDate?: string;
  dueDate?: string;
  orderIndex?: number;
}

export const tasksApi = {
  kanban: (projectId: string | number) =>
    apiClient.get<KanbanResponse>(`/api/projects/${projectId}/tasks`, {
      params: { view: "kanban" },
    }),

  gantt: (projectId: string | number) =>
    apiClient.get<GanttResponse>(`/api/projects/${projectId}/tasks`, {
      params: { view: "gantt" },
    }),

  list: (projectId: string | number, page = 0, size = 50) =>
    apiClient.get<PageResponse<TaskResponse>>(`/api/projects/${projectId}/tasks`, {
      params: { page: String(page), size: String(size) },
    }),

  get: (projectId: string | number, taskId: string | number) =>
    apiClient.get<TaskResponse>(`/api/projects/${projectId}/tasks/${taskId}`),

  create: (projectId: string | number, data: CreateTaskInput) =>
    apiClient.post<TaskResponse>(`/api/projects/${projectId}/tasks`, {
      ...data,
      priority: data.priority ? data.priority.toUpperCase() : "MEDIUM",
    }),

  update: (projectId: string | number, taskId: string | number, data: UpdateTaskInput) =>
    apiClient.patch<TaskResponse>(`/api/projects/${projectId}/tasks/${taskId}`, data),

  changeStatus: (projectId: string | number, taskId: string | number, status: string) =>
    apiClient.patch<TaskResponse>(`/api/projects/${projectId}/tasks/${taskId}/status`, {
      status: BACKEND_STATUS[status] ?? status.toUpperCase(),
    }),

  delete: (projectId: string | number, taskId: string | number) =>
    apiClient.delete<void>(`/api/projects/${projectId}/tasks/${taskId}`),

  restore: (projectId: string | number, taskId: string | number) =>
    apiClient.patch<TaskResponse>(`/api/projects/${projectId}/tasks/${taskId}/restore`),

  subtasks: {
    list: (projectId: string | number, taskId: string | number) =>
      apiClient.get<TaskResponse[]>(`/api/projects/${projectId}/tasks/${taskId}/subtasks`),

    create: (projectId: string | number, taskId: string | number, title: string) =>
      apiClient.post<TaskResponse>(`/api/projects/${projectId}/tasks/${taskId}/subtasks`, { title }),
  },
};
