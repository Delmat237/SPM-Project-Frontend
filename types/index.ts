export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "blocked";
export type Priority = "critical" | "high" | "medium" | "low";
export type ProjectStatus = "draft" | "active" | "archived";
export type ProjectRole = "owner" | "admin" | "write" | "read";
export type WorkspaceRole = "owner" | "admin" | "member";
export type NotificationType = "comment" | "mention" | "invite" | "status" | "system";

// ─── Backend API response types ───────────────────────────────────────────────

export interface ProjectResponse {
  id: number;
  name: string;
  description: string;
  projectKey: string;
  visibility: "PUBLIC" | "PRIVATE";
  archived: boolean;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  myRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskResponse {
  id: number;
  taskKey: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  orderIndex: number;
  assigneeId?: number;
  assigneeName?: string;
  assigneeEmail?: string;
  projectId: number;
  projectName: string;
  parentId?: number;
  subtaskCount: number;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberResponse {
  userId: number;
  email: string;
  fullName: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "READER";
  joinedAt: string;
}

export interface NotificationResponse {
  id: number;
  type: "COMMENT" | "MENTION" | "INVITE" | "STATUS" | "SYSTEM";
  title: string;
  message: string;
  read: boolean;
  relatedProjectId?: number;
  relatedTaskId?: number;
  relatedCommentId?: number;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  tasks: TaskResponse[];
}

export interface KanbanResponse {
  columns: KanbanColumn[];
}

export interface GanttTask {
  id: number;
  taskKey: string;
  title: string;
  status: string;
  priority: string;
  assigneeId?: number;
  assigneeName?: string;
  startDate?: string;
  endDate?: string;
  parentId?: number;
}

export interface GanttResponse {
  tasks: GanttTask[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Adapters: API response → legacy frontend types ───────────────────────────

const STATUS_FROM_API: Record<string, TaskStatus> = {
  TODO: "todo", IN_PROGRESS: "in_progress", IN_REVIEW: "in_review", DONE: "done", BLOCKED: "blocked",
};
const PRIORITY_FROM_API: Record<string, Priority> = {
  LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical",
};

export function adaptTask(t: TaskResponse): Task {
  return {
    id: String(t.id),
    title: t.title,
    description: t.description ?? "",
    status: STATUS_FROM_API[t.status] ?? "todo",
    priority: PRIORITY_FROM_API[t.priority] ?? "medium",
    projectId: String(t.projectId),
    assigneeId: t.assigneeId ? String(t.assigneeId) : undefined,
    parentId: t.parentId ? String(t.parentId) : undefined,
    dueDate: t.dueDate ?? undefined,
    tags: [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// ─── Analytics & Export types ─────────────────────────────────────────────────

export interface ProjectSummaryResponse {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  blockedTasks: number;
  inReviewTasks: number;
  overdueCount: number;
  completionRate: number;
  memberCount: number;
}

export interface BurndownDataPoint {
  date: string;
  remaining: number;
}

export interface BurndownResponse {
  sprintStart: string;
  sprintEnd: string;
  totalTasks: number;
  dataPoints: BurndownDataPoint[];
}

export interface VelocitySprint {
  label: string;
  startDate: string;
  endDate: string;
  completedTasks: number;
}

export interface VelocityResponse {
  sprints: VelocitySprint[];
  averageVelocity: number;
}

export type ExportStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
export type ExportFormat = "CSV" | "JSON";

export interface ExportJobResponse {
  jobId: number;
  status: ExportStatus;
  format: ExportFormat;
  projectId: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

// ─── WebSocket event types ─────────────────────────────────────────────────────

export interface WsProjectEvent {
  type: "task.created" | "task.updated" | "task.deleted" | "task.moved" | "member.removed";
  payload: Record<string, unknown>;
}

export interface CommentResponse {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  authorEmail: string;
  taskId: number;
  taskKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentResponse {
  id: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  taskId: number;
  uploadedById: number;
  uploadedByName: string;
  createdAt: string;
}

export function adaptProject(p: ProjectResponse): Project {
  return {
    id: String(p.id),
    workspaceId: "",
    name: p.name,
    description: p.description ?? "",
    key: p.projectKey,
    status: p.archived ? "archived" : "active",
    visibility: p.visibility === "PUBLIC" ? "public" : "private",
    ownerId: String(p.ownerId),
    members: [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  domain: string;
  plan: "free" | "team" | "enterprise";
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  joinedAt: string;
  status: "active" | "pending";
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  key: string;
  status: ProjectStatus;
  visibility: "public" | "private";
  ownerId: string;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  projectId: string;
  role: ProjectRole;
  joinedAt: string;
  status: "active" | "pending";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assigneeId?: string;
  parentId?: string;
  storyPoints?: number;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}
