"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, MessageSquare, Plus, Send, MoreVertical,
  CheckCircle2, Calendar, Tag, Paperclip, Trash2, Edit3,
} from "@/lib/icons";
import Avatar from "./Avatar";
import Badge from "./Badge";
import { Task, TaskStatus, Priority, CommentResponse, TaskResponse, MemberResponse } from "@/types";
import { tasksApi } from "@/lib/api/tasks";
import { projectsApi } from "@/lib/api/projects";
import { commentsApi } from "@/lib/api/comments";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate?: (updated: Task) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire", in_progress: "En cours", in_review: "En revue", done: "Terminé", blocked: "Bloqué",
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

export default function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const [title, setTitle]           = useState(task.title);
  const [description, setDesc]      = useState(task.description);
  const [status, setStatus]         = useState<TaskStatus>(task.status);
  const [priority, setPriority]     = useState<Priority>(task.priority);

  const [comments, setComments]     = useState<CommentResponse[]>([]);
  const [subtasks, setSubtasks]     = useState<TaskResponse[]>([]);
  const [members, setMembers]       = useState<MemberResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [commentText, setCommentText]   = useState("");
  const [sending, setSending]           = useState(false);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [editText, setEditText]         = useState("");

  const [newSubtask, setNewSubtask]     = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showSubInput, setShowSubInput] = useState(false);

  const [saveTimer, setSaveTimer]       = useState<ReturnType<typeof setTimeout> | null>(null);

  const [currentUser] = useState<{ name: string }>(() => {
    if (typeof window === "undefined") return { name: "Moi" };
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return { name: u.nom || u.name || "Moi" };
    } catch { return { name: "Moi" }; }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  useEffect(() => {
    Promise.all([
      commentsApi.list(task.id).catch(() => [] as CommentResponse[]),
      tasksApi.subtasks.list(task.projectId, task.id).catch(() => [] as TaskResponse[]),
      projectsApi.members.list(task.projectId).catch(() => [] as MemberResponse[]),
    ]).then(([c, s, m]) => {
      setComments(c);
      setSubtasks(s);
      setMembers(m);
    }).finally(() => setLoadingData(false));
  }, [task.id, task.projectId]);

  const scheduleAutoSave = (patch: Record<string, unknown>) => {
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(async () => {
      await tasksApi.update(task.projectId, task.id, patch as never);
      if (onUpdate) onUpdate({ ...task, ...patch } as Task);
    }, 800);
    setSaveTimer(t);
  };

  const handleStatusChange = async (v: TaskStatus) => {
    setStatus(v);
    await tasksApi.changeStatus(task.projectId, task.id, v);
    if (onUpdate) onUpdate({ ...task, status: v });
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const c = await commentsApi.create(task.id, commentText.trim());
      setComments(prev => [...prev, c]);
      setCommentText("");
    } finally { setSending(false); }
  };

  const handleEditComment = async (id: number) => {
    if (!editText.trim()) return;
    const updated = await commentsApi.update(id, editText.trim());
    setComments(prev => prev.map(c => c.id === id ? updated : c));
    setEditingId(null);
  };

  const handleDeleteComment = async (id: number) => {
    await commentsApi.delete(id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      const st = await tasksApi.subtasks.create(task.projectId, task.id, newSubtask.trim());
      setSubtasks(prev => [...prev, st]);
      setNewSubtask("");
      setShowSubInput(false);
    } finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (st: TaskResponse) => {
    const newStatus = st.status === "DONE" ? "TODO" : "DONE";
    await tasksApi.changeStatus(task.projectId, String(st.id), newStatus.toLowerCase());
    setSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, status: newStatus as TaskResponse["status"] } : s));
  };

  const doneSubtasks = subtasks.filter(s => s.status === "DONE").length;
  const assignee = members.find(m => String(m.userId) === task.assigneeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant={status} />
            <Badge variant={priority} />
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Plus d'options" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} aria-label="Fermer"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: main content */}
          <div className="lg:w-[62%] p-6 border-r border-gray-100 dark:border-gray-700 overflow-y-auto">
            <input type="text" value={title} onChange={e => { setTitle(e.target.value); scheduleAutoSave({ title: e.target.value }); }}
              className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight w-full border-none focus:ring-0 mb-5 p-0 bg-transparent"
              placeholder="Titre de la tâche…" />

            <div className="mb-8">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Description</h3>
              <textarea value={description} onChange={e => { setDesc(e.target.value); scheduleAutoSave({ description: e.target.value }); }}
                className="w-full text-sm text-gray-600 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none p-3 bg-gray-50 dark:bg-gray-700 resize-none min-h-[80px]"
                placeholder="Ajoutez une description…" />
            </div>

            {/* Subtasks */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  Sous-tâches ({doneSubtasks}/{subtasks.length})
                </h3>
                <button type="button" onClick={() => setShowSubInput(true)}
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
                {loadingData
                  ? <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  : subtasks.map(st => (
                    <div key={st.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                      onClick={() => handleToggleSubtask(st)}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${st.status === "DONE" ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600"}`}>
                        {st.status === "DONE" && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-sm font-medium flex-1 ${st.status === "DONE" ? "text-gray-400 dark:text-gray-600 line-through" : "text-gray-800 dark:text-gray-200"}`}>{st.title}</span>
                    </div>
                  ))
                }
                {showSubInput && (
                  <div className="flex items-center gap-2">
                    <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddSubtask(); if (e.key === "Escape") { setShowSubInput(false); setNewSubtask(""); } }}
                      autoFocus placeholder="Titre de la sous-tâche…"
                      className="flex-1 px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    <button type="button" onClick={handleAddSubtask} disabled={addingSubtask}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
                      {addingSubtask ? "…" : "OK"}
                    </button>
                    <button type="button" onClick={() => { setShowSubInput(false); setNewSubtask(""); }}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Commentaires ({comments.length})
              </h3>
              <div className="space-y-5 mb-5">
                {loadingData
                  ? <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  : comments.map(c => (
                    <div key={c.id} className="flex gap-3 group">
                      <Avatar name={c.authorName} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{c.authorName}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatRelative(c.createdAt)}</span>
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => { setEditingId(c.id); setEditText(c.content); }}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDeleteComment(c.id)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {editingId === c.id ? (
                          <div className="flex gap-2">
                            <textarea value={editText} onChange={e => setEditText(e.target.value)}
                              className="flex-1 text-sm border border-blue-300 dark:border-blue-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                              rows={2} />
                            <div className="flex flex-col gap-1">
                              <button type="button" onClick={() => handleEditComment(c.id)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">OK</button>
                              <button type="button" onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-lg">Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-3 rounded-xl rounded-tl-none text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {c.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="flex gap-3 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm">
                <Avatar name={currentUser.name} size="sm" />
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder="Écrivez un commentaire… (Entrée pour envoyer)"
                  rows={1}
                  className="flex-1 border-none focus:ring-0 text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none" />
                <button type="button" onClick={handleSendComment} disabled={sending || !commentText.trim()}
                  aria-label="Envoyer"
                  className="bg-blue-500 p-2 rounded-lg text-white hover:bg-blue-600 transition-all disabled:opacity-50 self-end">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: sidebar */}
          <div className="lg:w-[38%] bg-gray-50/50 dark:bg-gray-900/30 p-6 border-t lg:border-t-0 border-gray-100 dark:border-gray-700 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Statut</label>
                <select aria-label="Statut" value={status} onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Priorité</label>
                <select aria-label="Priorité" value={priority} onChange={e => { setPriority(e.target.value as Priority); scheduleAutoSave({ priority: (e.target.value as string).toUpperCase() }); }}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {assignee && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Assigné à</label>
                  <div className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <Avatar name={assignee.fullName} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{assignee.fullName}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{assignee.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm divide-y divide-gray-50 dark:divide-gray-600">
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Échéance</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-500 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1">Étiquettes</p>
                    <div className="flex flex-wrap gap-1">
                      {task.tags?.map(t => (
                        <span key={t} className="bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-semibold">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-400 dark:text-gray-500 px-1">
                <div className="flex justify-between">
                  <span>Créé le</span>
                  <span className="font-medium">{new Date(task.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modifié le</span>
                  <span className="font-medium">{new Date(task.updatedAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
