"use client";

import { useState, useEffect, use } from "react";
import {
  Plus,
  Search,
  GanttChartSquare,
  Trello,
  Users,
  Settings,
  ChevronRight,
  ListChecks,
  BarChart2,
} from "@/lib/icons";
import TaskCard from "@/components/ui/TaskCard";
import TaskDetailModal from "@/components/ui/TaskDetailModal";
import CreateTaskModal from "@/components/ui/CreateTaskModal";
import Link from "next/link";
import { TaskStatus, Task, MemberResponse, KanbanResponse, adaptTask } from "@/types";
import { tasksApi } from "@/lib/api/tasks";
import { projectsApi } from "@/lib/api/projects";

const COLUMN_COLORS: Record<TaskStatus, string> = {
  todo:        "bg-gray-400",
  in_progress: "bg-blue-500",
  in_review:   "bg-violet-500",
  done:        "bg-green-500",
  blocked:     "bg-red-500",
};

const COLUMNS: { title: string; status: TaskStatus }[] = [
  { title: "À faire",  status: "todo" },
  { title: "En cours", status: "in_progress" },
  { title: "En revue", status: "in_review" },
  { title: "Bloqué",   status: "blocked" },
  { title: "Terminé",  status: "done" },
];

export default function KanbanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey]   = useState("");
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [members, setMembers]         = useState<MemberResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);

  useEffect(() => {
    Promise.all([
      tasksApi.kanban(id),
      projectsApi.get(id),
      projectsApi.members.list(id),
    ])
      .then(([kanban, project, memberList]: [KanbanResponse, { projectKey: string; name: string }, MemberResponse[]]) => {
        const allTasks = kanban.columns.flatMap((col) => col.tasks.map(adaptTask));
        setTasks(allTasks);
        setProjectKey(project.projectKey);
        setProjectName(project.name);
        setMembers(memberList);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const openCreate = (status: TaskStatus = "todo") => setCreateStatus(status);
  const handleCreate = (task: Task) => setTasks(prev => [...prev, task]);

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDrop = async (e: React.DragEvent, status: TaskStatus) => {
    const taskId = e.dataTransfer.getData("taskId");
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      await tasksApi.changeStatus(id, taskId, status);
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t } : t));
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const tabs = [
    { name: "Kanban",     href: `/dashboard/projects/${id}/kanban`,    icon: Trello,          active: true },
    { name: "Backlog",    href: `/dashboard/projects/${id}/backlog`,   icon: ListChecks },
    { name: "Gantt",      href: `/dashboard/projects/${id}/gantt`,     icon: GanttChartSquare },
    { name: "Analytics",  href: `/dashboard/projects/${id}/analytics`, icon: BarChart2 },
    { name: "Membres",    href: `/dashboard/projects/${id}/members`,   icon: Users },
    { name: "Paramètres", href: `/dashboard/projects/${id}/settings`,  icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Project Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 pt-5 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 mb-4">
          <Link href="/dashboard/projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Projets</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 dark:text-gray-300">{projectName || id}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">
              {projectKey ? projectKey[0] : "P"}
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-gray-100">{projectName || "Chargement…"}</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{projectKey}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" aria-label="Rechercher" className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all">
              <Search className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => openCreate("todo")} className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Nouvelle tâche
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                tab.active
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </Link>
          ))}
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-x-auto bg-[#f4f5f7] dark:bg-gray-900 p-6">
        {loading ? (
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <div key={col.status} className="w-72 flex-shrink-0">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-lg mb-2.5 animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map((column) => {
              const columnTasks = tasks.filter(t => t.status === column.status);
              return (
                <div
                  key={column.status}
                  className="w-72 flex flex-col"
                  onDrop={(e) => onDrop(e, column.status)}
                  onDragOver={onDragOver}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${COLUMN_COLORS[column.status]}`} />
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{column.title}</span>
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>
                    <button type="button" aria-label="Ajouter une tâche" onClick={() => openCreate(column.status)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Column body */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 pb-4">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={onDragStart}
                        onClick={setSelectedTask}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => openCreate(column.status)}
                      className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 text-xs font-semibold hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une tâche
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {createStatus !== null && (
        <CreateTaskModal
          projectId={id}
          projectKey={projectKey}
          defaultStatus={createStatus}
          members={members}
          onClose={() => setCreateStatus(null)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
