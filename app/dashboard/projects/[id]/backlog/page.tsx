"use client";

import { useState, useEffect, use } from "react";
import {
  ChevronRight, GanttChartSquare, Trello, Users, Settings,
  Plus, Search, Filter, ArrowUpDown, ListChecks, BarChart2,
  ChevronDown, AlertCircle, Clock, CheckCircle2,
} from "@/lib/icons";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import CreateTaskModal from "@/components/ui/CreateTaskModal";
import TaskDetailModal from "@/components/ui/TaskDetailModal";
import { Task, TaskStatus, Priority, TaskResponse, MemberResponse, adaptTask } from "@/types";
import { tasksApi } from "@/lib/api/tasks";
import { projectsApi } from "@/lib/api/projects";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire", in_progress: "En cours", in_review: "En revue", done: "Terminé", blocked: "Bloqué",
};
const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

type SortField = "priority" | "status" | "dueDate" | "title" | "createdAt";
type GroupBy = "none" | "status" | "priority";

function isOverdue(task: Task) {
  return task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
}

export default function BacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey]   = useState("");
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [members, setMembers]         = useState<MemberResponse[]>([]);
  const [loading, setLoading]         = useState(true);

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [sortField, setSortField]     = useState<SortField>("priority");
  const [sortAsc, setSortAsc]         = useState(true);
  const [groupBy, setGroupBy]         = useState<GroupBy>("status");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [showFilters, setShowFilters]   = useState(false);

  useEffect(() => {
    Promise.all([
      tasksApi.list(id, 0, 200),
      projectsApi.get(id),
      projectsApi.members.list(id),
    ]).then(([page, project, memberList]) => {
      setTasks(page.content.map((t: TaskResponse) => adaptTask(t)));
      setProjectKey(project.projectKey);
      setProjectName(project.name);
      setMembers(memberList);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleCreate = (task: Task) => setTasks(prev => [...prev, task]);
  const handleUpdate = (updated: Task) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await tasksApi.changeStatus(id, taskId, newStatus);
  };

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    else if (sortField === "status") cmp = a.status.localeCompare(b.status);
    else if (sortField === "title") cmp = a.title.localeCompare(b.title);
    else if (sortField === "dueDate") {
      if (!a.dueDate && !b.dueDate) cmp = 0;
      else if (!a.dueDate) cmp = 1;
      else if (!b.dueDate) cmp = -1;
      else cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    else if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const getGroups = () => {
    if (groupBy === "none") return [{ label: "Toutes les tâches", tasks: sorted }];
    if (groupBy === "status") {
      const statuses: TaskStatus[] = ["todo", "in_progress", "in_review", "blocked", "done"];
      return statuses.map(s => ({ label: STATUS_LABELS[s], tasks: sorted.filter(t => t.status === s), status: s }))
        .filter(g => g.tasks.length > 0);
    }
    const priorities: Priority[] = ["critical", "high", "medium", "low"];
    return priorities.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), tasks: sorted.filter(t => t.priority === p), priority: p }))
      .filter(g => g.tasks.length > 0);
  };

  const tabs = [
    { name: "Kanban",     href: `/dashboard/projects/${id}/kanban`,   icon: Trello },
    { name: "Backlog",    href: `/dashboard/projects/${id}/backlog`,  icon: ListChecks, active: true },
    { name: "Gantt",      href: `/dashboard/projects/${id}/gantt`,    icon: GanttChartSquare },
    { name: "Analytics",  href: `/dashboard/projects/${id}/analytics`, icon: BarChart2 },
    { name: "Membres",    href: `/dashboard/projects/${id}/members`,  icon: Users },
    { name: "Paramètres", href: `/dashboard/projects/${id}/settings`, icon: Settings },
  ];

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={`w-3 h-3 inline ml-1 transition-opacity ${sortField === field ? "opacity-100 text-blue-500" : "opacity-30"}`} />
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 pt-5 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 mb-4">
          <Link href="/dashboard/projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Projets</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 dark:text-gray-300">{projectName || id}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">
              {projectKey?.[0] ?? "P"}
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-gray-100">{projectName || "Chargement…"}</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{projectKey}</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nouvelle tâche
          </button>
        </div>

        <div className="flex items-center gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <Link key={tab.name} href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${tab.active ? "text-blue-600 border-blue-600" : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"}`}>
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col bg-[#f4f5f7] dark:bg-gray-900">
        {/* Toolbar */}
        <div className="px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer les tâches…"
              className="pl-8 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none w-52 placeholder:text-gray-400" />
          </div>

          {/* Status filter */}
          <select aria-label="Filtrer par statut" value={statusFilter} onChange={e => setStatusFilter(e.target.value as TaskStatus | "all")}
            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="all">Tous les statuts</option>
            {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select aria-label="Filtrer par priorité" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | "all")}
            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="all">Toutes les priorités</option>
            <option value="critical">Critique</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>

          {/* Group by */}
          <select aria-label="Grouper par" value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}
            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="status">Grouper par statut</option>
            <option value="priority">Grouper par priorité</option>
            <option value="none">Sans groupe</option>
          </select>

          <span className="ml-auto text-xs font-semibold text-gray-400 dark:text-gray-500">
            {filtered.length} tâche{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 bg-white dark:bg-gray-800 rounded-lg animate-pulse border border-gray-200 dark:border-gray-700" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ListChecks className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Aucune tâche trouvée</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ajustez vos filtres ou créez une première tâche.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header row */}
              <div className="grid grid-cols-[minmax(0,1fr)_120px_100px_120px_32px] gap-3 px-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                <button type="button" onClick={() => toggleSort("title")} className="text-left hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  Tâche <SortIcon field="title" />
                </button>
                <button type="button" onClick={() => toggleSort("status")} className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  Statut <SortIcon field="status" />
                </button>
                <button type="button" onClick={() => toggleSort("priority")} className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  Priorité <SortIcon field="priority" />
                </button>
                <button type="button" onClick={() => toggleSort("dueDate")} className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  Échéance <SortIcon field="dueDate" />
                </button>
                <span />
              </div>

              {getGroups().map(group => (
                <div key={group.label}>
                  {groupBy !== "none" && (
                    <div className="flex items-center gap-2 mb-2">
                      {groupBy === "status" && "status" in group && (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          group.status === "todo" ? "bg-gray-400" :
                          group.status === "in_progress" ? "bg-blue-500" :
                          group.status === "in_review" ? "bg-violet-500" :
                          group.status === "done" ? "bg-green-500" : "bg-red-500"
                        }`} />
                      )}
                      {groupBy === "priority" && "priority" in group && (
                        <Badge variant={group.priority as Priority} />
                      )}
                      {groupBy === "status" && !("priority" in group) && (
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{group.label}</span>
                      )}
                      {groupBy !== "status" && (
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{group.label}</span>
                      )}
                      {groupBy === "status" && (
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider ml-1">{group.label}</span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                        {group.tasks.length}
                      </span>
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {group.tasks.map((task, idx) => {
                      const overdue = isOverdue(task);
                      return (
                        <div key={task.id}
                          className={`grid grid-cols-[minmax(0,1fr)_120px_100px_120px_32px] gap-3 items-center px-4 py-3 hover:bg-gray-50/70 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${idx > 0 ? "border-t border-gray-50 dark:border-gray-700" : ""}`}
                          onClick={() => setSelectedTask(task)}>
                          {/* Title */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${task.status === "done" ? "bg-green-500 border-green-500" : "border-gray-300 dark:border-gray-600 group-hover:border-blue-400"}`}>
                              {task.status === "done" && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-semibold truncate ${task.status === "done" ? "text-gray-400 dark:text-gray-600 line-through" : "text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"} transition-colors`}>
                              {task.title}
                            </span>
                            {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          </div>

                          {/* Status */}
                          <div onClick={e => e.stopPropagation()}>
                            <select
                              aria-label="Changer le statut"
                              value={task.status}
                              onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                              className="text-xs bg-transparent border-none focus:ring-0 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer p-0 w-full">
                              {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                          </div>

                          {/* Priority */}
                          <div>
                            <Badge variant={task.priority} />
                          </div>

                          {/* Due date */}
                          <div className="flex items-center gap-1">
                            {task.dueDate ? (
                              <>
                                <Clock className={`w-3.5 h-3.5 shrink-0 ${overdue ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`} />
                                <span className={`text-xs font-medium ${overdue ? "text-red-500 font-bold" : "text-gray-500 dark:text-gray-400"}`}>
                                  {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </div>

                          {/* Assignee avatar */}
                          <div className="flex justify-end">
                            {task.assigneeId ? (
                              (() => {
                                const m = members.find(m => String(m.userId) === task.assigneeId);
                                return m ? <Avatar name={m.fullName} size="sm" className="w-6 h-6 text-[9px]" /> : null;
                              })()
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleUpdate} />
      )}
      {showCreate && (
        <CreateTaskModal projectId={id} projectKey={projectKey} members={members}
          onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
