"use client";

import { useState, useEffect, use, useRef } from "react";
import {
  ChevronRight,
  MessageSquare,
  Plus,
  Send,
  MoreVertical,
  CheckCircle2,
  Calendar,
  Zap,
  Tag,
  ArrowLeft,
  Paperclip,
  Trash2,
  Edit3,
  X,
  User,
  Clock,
  AlertCircle,
} from "@/lib/icons";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { useRouter } from "next/navigation";
import { TaskStatus, Priority, TaskResponse, MemberResponse, CommentResponse, AttachmentResponse, adaptTask } from "@/types";
import { tasksApi, BACKEND_STATUS } from "@/lib/api/tasks";
import { projectsApi } from "@/lib/api/projects";
import { commentsApi } from "@/lib/api/comments";
import { attachmentsApi } from "@/lib/api/attachments";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire", in_progress: "En cours", in_review: "En revue",
  done: "Terminé", blocked: "Bloqué",
};
const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Basse", medium: "Moyenne", high: "Haute", critical: "Critique",
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const router = useRouter();
  const { id: projectId, taskId } = use(params);

  const [task, setTask]             = useState<TaskResponse | null>(null);
  const [members, setMembers]       = useState<MemberResponse[]>([]);
  const [comments, setComments]     = useState<CommentResponse[]>([]);
  const [subtasks, setSubtasks]     = useState<TaskResponse[]>([]);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveTimer, setSaveTimer]   = useState<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus]         = useState<TaskStatus>("todo");
  const [priority, setPriority]     = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState<number | undefined>();
  const [dueDate, setDueDate]       = useState("");

  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser] = useState<{ name: string; email: string }>(() => {
    if (typeof window === "undefined") return { name: "Moi", email: "" };
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return { name: u.nom || u.name || "Moi", email: u.email || "" };
    } catch { return { name: "Moi", email: "" }; }
  });

  useEffect(() => {
    Promise.all([
      tasksApi.get(projectId, taskId),
      projectsApi.members.list(projectId),
      commentsApi.list(taskId).catch(() => [] as CommentResponse[]),
      tasksApi.subtasks.list(projectId, taskId).catch(() => [] as TaskResponse[]),
      attachmentsApi.list(taskId).catch(() => [] as AttachmentResponse[]),
    ]).then(([t, m, c, s, a]) => {
      setTask(t);
      const adapted = adaptTask(t);
      setTitle(t.title);
      setDescription(t.description || "");
      setStatus(adapted.status);
      setPriority(adapted.priority);
      setAssigneeId(t.assigneeId ?? undefined);
      setDueDate(t.dueDate ? t.dueDate.substring(0, 10) : "");
      setMembers(m);
      setComments(c);
      setSubtasks(s);
      setAttachments(a);
    }).finally(() => setLoading(false));
  }, [projectId, taskId]);

  const scheduleAutoSave = (patch: Record<string, unknown>) => {
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(async () => {
      setSaving(true);
      try { await tasksApi.update(projectId, taskId, patch as never); }
      finally { setSaving(false); }
    }, 800);
    setSaveTimer(t);
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    scheduleAutoSave({ title: v });
  };
  const handleDescriptionChange = (v: string) => {
    setDescription(v);
    scheduleAutoSave({ description: v });
  };
  const handleStatusChange = async (v: TaskStatus) => {
    setStatus(v);
    await tasksApi.changeStatus(projectId, taskId, v);
  };
  const handlePriorityChange = async (v: Priority) => {
    setPriority(v);
    await tasksApi.update(projectId, taskId, { priority: v.toUpperCase() } as never);
  };
  const handleAssigneeChange = async (uid: number | undefined) => {
    setAssigneeId(uid);
    await tasksApi.update(projectId, taskId, { assigneeId: uid ?? null } as never);
  };
  const handleDueDateChange = async (v: string) => {
    setDueDate(v);
    await tasksApi.update(projectId, taskId, { dueDate: v || null } as never);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      const c = await commentsApi.create(taskId, commentText.trim());
      setComments(prev => [...prev, c]);
      setCommentText("");
    } finally { setSendingComment(false); }
  };

  const handleEditComment = async (id: number) => {
    if (!editCommentText.trim()) return;
    const updated = await commentsApi.update(id, editCommentText.trim());
    setComments(prev => prev.map(c => c.id === id ? updated : c));
    setEditingCommentId(null);
  };

  const handleDeleteComment = async (id: number) => {
    await commentsApi.delete(id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      const st = await tasksApi.subtasks.create(projectId, taskId, newSubtaskTitle.trim());
      setSubtasks(prev => [...prev, st]);
      setNewSubtaskTitle("");
      setShowSubtaskInput(false);
    } finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (st: TaskResponse) => {
    const newStatus = st.status === "DONE" ? "TODO" : "DONE";
    await tasksApi.changeStatus(projectId, String(st.id), newStatus.toLowerCase());
    setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, status: newStatus as TaskResponse["status"] } : s));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const att = await attachmentsApi.upload(taskId, file);
      setAttachments(prev => [...prev, att]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (id: number) => {
    await attachmentsApi.delete(id);
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!task) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-gray-600 dark:text-gray-400">Tâche introuvable.</p>
      <button type="button" onClick={() => router.back()} className="btn-primary px-4 py-2 text-sm">Retour</button>
    </div>
  );

  const assignee = members.find(m => m.userId === assigneeId);
  const doneSubtasks = subtasks.filter(s => s.status === "DONE").length;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-800">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
          <button type="button" onClick={() => router.back()} aria-label="Retour"
            className="hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mr-1 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Link href="/dashboard/projects" className="hover:text-blue-600 transition-colors">Projets</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/dashboard/projects/${projectId}/kanban`} className="hover:text-blue-600 transition-colors">{task.projectName}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-blue-600 font-bold">{task.taskKey}</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-gray-400 animate-pulse">Enregistrement…</span>}
          <button type="button" aria-label="Plus d'options" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-auto">
        {/* Main content */}
        <div className="lg:w-[65%] p-6 lg:p-8 border-r border-gray-100 dark:border-gray-700">
          {/* Status + Priority chips */}
          <div className="flex items-center gap-2 mb-5">
            <Badge variant={status} />
            <Badge variant={priority} />
            <span className="text-xs font-bold text-gray-300 dark:text-gray-600 ml-auto">{task.taskKey}</span>
          </div>

          {/* Title */}
          <input type="text" value={title} onChange={e => handleTitleChange(e.target.value)}
            className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight w-full border-none focus:ring-0 mb-5 p-0 bg-transparent"
            placeholder="Titre de la tâche…" />

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Description</h3>
            <textarea value={description} onChange={e => handleDescriptionChange(e.target.value)}
              className="w-full text-sm text-gray-600 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none p-3 bg-gray-50 dark:bg-gray-700 resize-none min-h-[100px]"
              placeholder="Ajoutez une description détaillée…" />
          </div>

          {/* Subtasks */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Sous-tâches ({doneSubtasks}/{subtasks.length})
              </h3>
              <button type="button" onClick={() => setShowSubtaskInput(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded-lg transition-all flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="mb-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: subtasks.length ? `${(doneSubtasks / subtasks.length) * 100}%` : "0%" }} />
              </div>
            )}

            <div className="space-y-2">
              {subtasks.map(st => (
                <div key={st.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all group cursor-pointer"
                  onClick={() => handleToggleSubtask(st)}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${st.status === "DONE" ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600 group-hover:border-blue-400"}`}>
                    {st.status === "DONE" && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`text-sm font-medium flex-1 ${st.status === "DONE" ? "text-gray-400 dark:text-gray-600 line-through" : "text-gray-800 dark:text-gray-200"}`}>{st.title}</span>
                  {st.assigneeName && <span className="text-xs text-gray-400 dark:text-gray-500">{st.assigneeName}</span>}
                </div>
              ))}
              {showSubtaskInput && (
                <div className="flex items-center gap-2">
                  <input type="text" value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddSubtask(); if (e.key === "Escape") { setShowSubtaskInput(false); setNewSubtaskTitle(""); } }}
                    autoFocus placeholder="Titre de la sous-tâche…"
                    className="flex-1 px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <button type="button" onClick={handleAddSubtask} disabled={addingSubtask}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
                    {addingSubtask ? "…" : "OK"}
                  </button>
                  <button type="button" onClick={() => { setShowSubtaskInput(false); setNewSubtaskTitle(""); }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" /> Pièces jointes ({attachments.length})
              </h3>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-60">
                <Plus className="w-3.5 h-3.5" /> {uploadingFile ? "Upload…" : "Joindre"}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 group hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{att.fileName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(att.fileSize)} · {att.uploadedByName}</p>
                    </div>
                    <button type="button" onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Commentaires ({comments.length})
            </h3>
            <div className="space-y-5 mb-5">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3 group">
                  <Avatar name={c.authorName} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{c.authorName}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatRelative(c.createdAt)}</span>
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteComment(c.id)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {editingCommentId === c.id ? (
                      <div className="flex gap-2">
                        <textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                          className="flex-1 text-sm border border-blue-300 dark:border-blue-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                          rows={2} />
                        <div className="flex flex-col gap-1">
                          <button type="button" onClick={() => handleEditComment(c.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">OK</button>
                          <button type="button" onClick={() => setEditingCommentId(null)}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-3 rounded-xl rounded-tl-none text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {c.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm">
              <Avatar name={currentUser.name} size="sm" />
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                placeholder="Écrivez un commentaire… (Entrée pour envoyer)"
                rows={1}
                className="flex-1 border-none focus:ring-0 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none" />
              <button type="button" onClick={handleSendComment} disabled={sendingComment || !commentText.trim()}
                aria-label="Envoyer"
                className="bg-blue-500 p-2 rounded-lg text-white hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed self-end">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-[35%] bg-gray-50/50 dark:bg-gray-900/30 p-6 lg:p-8 border-t lg:border-t-0 border-gray-100 dark:border-gray-700">
          <div className="space-y-6">
            {/* Status */}
            <div>
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Statut</label>
              <select aria-label="Statut" value={status} onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Priorité</label>
              <select aria-label="Priorité" value={priority} onChange={e => handlePriorityChange(e.target.value as Priority)}
                className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Assigné à</label>
              <div className="space-y-1.5">
                <button type="button" onClick={() => handleAssigneeChange(undefined)}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-sm ${!assigneeId ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-500"}`}>
                  <User className="w-4 h-4" />
                  <span className="font-semibold">Non assigné</span>
                </button>
                {members.map(m => (
                  <button key={m.userId} type="button" onClick={() => handleAssigneeChange(m.userId)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${assigneeId === m.userId ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"}`}>
                    <Avatar name={m.fullName} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{m.fullName}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{m.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm divide-y divide-gray-50 dark:divide-gray-600">
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Échéance</p>
                  <input type="date" value={dueDate} onChange={e => handleDueDateChange(e.target.value)}
                    aria-label="Date d'échéance"
                    className="text-sm font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:ring-0 p-0 w-full" />
                </div>
              </div>
              {task.startDate && (
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Début</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(task.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-500 shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1">Sous-tâches</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{doneSubtasks}/{subtasks.length} terminées</p>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="space-y-1.5 text-xs text-gray-400 dark:text-gray-500 px-1">
              <div className="flex justify-between">
                <span>Créé le</span>
                <span className="font-medium">{new Date(task.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="flex justify-between">
                <span>Modifié le</span>
                <span className="font-medium">{new Date(task.updatedAt).toLocaleDateString("fr-FR")}</span>
              </div>
              {task.assigneeName && (
                <div className="flex justify-between">
                  <span>Assigné à</span>
                  <span className="font-medium">{task.assigneeName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
