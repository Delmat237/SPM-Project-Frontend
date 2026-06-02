"use client";

import { useState, useEffect, use } from "react";
import {
  ChevronRight,
  GanttChartSquare,
  Trello,
  Users,
  Settings,
  Calendar,
  ListChecks,
  BarChart2,
} from "@/lib/icons";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { GanttTask } from "@/types";
import { tasksApi } from "@/lib/api/tasks";
import { projectsApi } from "@/lib/api/projects";

const STATUS_COLOR: Record<string, string> = {
  DONE:        "bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
  IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
  IN_REVIEW:   "bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400",
  BLOCKED:     "bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
  TODO:        "bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400",
};

const STATUS_DOT: Record<string, string> = {
  DONE:        "bg-green-500",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW:   "bg-violet-500",
  BLOCKED:     "bg-red-500",
  TODO:        "bg-gray-300",
};

function buildDays(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    return {
      day: date.getDate(),
      weekday: date.toLocaleDateString("fr-FR", { weekday: "short" }),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

function taskBarStyle(task: GanttTask, days: { day: number }[], year: number, month: number) {
  if (!task.startDate && !task.endDate) return null;
  const start = task.startDate ? new Date(task.startDate) : new Date(task.endDate!);
  const end   = task.endDate   ? new Date(task.endDate)   : new Date(task.startDate!);
  if (start.getFullYear() !== year || start.getMonth() !== month) return null;
  const startIdx = start.getDate() - 1;
  const endIdx   = Math.min(end.getDate() - 1, days.length - 1);
  const duration = Math.max(1, endIdx - startIdx + 1);
  return { left: `${startIdx * 40 + 8}px`, width: `${duration * 40 - 16}px` };
}

export default function GanttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [projectName, setProjectName] = useState("");
  const [tasks, setTasks]             = useState<GanttTask[]>([]);
  const [loading, setLoading]         = useState(true);

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const days  = buildDays(year, month);
  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  useEffect(() => {
    Promise.all([
      tasksApi.gantt(id),
      projectsApi.get(id),
    ]).then(([gantt, project]) => {
      setTasks(gantt.tasks);
      setProjectName(project.name);
    }).finally(() => setLoading(false));
  }, [id]);

  const tabs = [
    { name: "Kanban",     href: `/dashboard/projects/${id}/kanban`,    icon: Trello },
    { name: "Backlog",    href: `/dashboard/projects/${id}/backlog`,   icon: ListChecks },
    { name: "Gantt",      href: `/dashboard/projects/${id}/gantt`,     icon: GanttChartSquare, active: true },
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
          <h1 className="text-base font-black text-gray-900 dark:text-gray-100">Timeline · {projectName || "Chargement…"}</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 font-semibold text-xs border border-gray-200 dark:border-gray-600">
            <Calendar className="w-3.5 h-3.5" />
            {monthLabel}
          </div>
        </div>

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

      {/* Gantt Content */}
      <main className="flex-1 overflow-hidden flex bg-white dark:bg-gray-800">
        {/* Left: Task list */}
        <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
          <div className="h-12 border-b border-gray-100 dark:border-gray-700 flex items-center px-5 shrink-0 bg-gray-50 dark:bg-gray-700/50">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tâches</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 border-b border-gray-100 dark:border-gray-700 flex items-center px-4">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex-1" />
                  </div>
                ))
              : tasks.map((task) => (
                  <div key={task.id} className="h-12 border-b border-gray-100 dark:border-gray-700 flex items-center px-4 gap-2.5 group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className={`w-1 h-6 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.title}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {task.assigneeName ?? "—"}
                      </p>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="min-w-max h-full flex flex-col">
            {/* Timeline header */}
            <div className="h-12 border-b border-gray-100 dark:border-gray-700 flex shrink-0 bg-gray-50 dark:bg-gray-700/50">
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className={`w-10 border-r border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center relative ${day.isToday ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
                >
                  <span className={`text-[9px] font-bold ${day.isToday ? "text-blue-600" : "text-gray-400 dark:text-gray-500"}`}>{day.weekday}</span>
                  <span className={`text-xs font-black ${day.isToday ? "text-blue-600" : "text-gray-700 dark:text-gray-300"}`}>{day.day}</span>
                  {day.isToday && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-[2000px] bg-blue-400 z-10 opacity-40" />}
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="flex-1 overflow-y-auto relative">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 border-b border-gray-100 dark:border-gray-700" />
                  ))
                : tasks.map((task) => {
                    const barStyle = taskBarStyle(task, days, year, month);
                    return (
                      <div key={task.id} className="h-12 border-b border-gray-100 dark:border-gray-700 relative group hover:bg-gray-50/30 dark:hover:bg-gray-700/30 transition-colors">
                        {barStyle && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer hover:brightness-95 transition-all flex items-center px-2.5 gap-1.5 group/bar ${STATUS_COLOR[task.status] ?? STATUS_COLOR.TODO}`}
                            style={barStyle}
                          >
                            {task.assigneeName && <Avatar name={task.assigneeName} size="sm" className="w-4 h-4 text-[8px] shrink-0" />}
                            <span className="text-[10px] font-bold truncate">{task.title}</span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white p-3 rounded-xl shadow-xl text-xs min-w-[180px] opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-all z-20">
                              <p className="font-bold mb-1.5">{task.title}</p>
                              <div className="flex items-center justify-between mb-1.5">
                                <Badge variant={task.status.toLowerCase() as never} />
                                <Badge variant={task.priority.toLowerCase() as never} />
                              </div>
                              {task.startDate && <p className="text-gray-300 text-[10px]">Début : {new Date(task.startDate).toLocaleDateString("fr-FR")}</p>}
                              {task.endDate   && <p className="text-gray-300 text-[10px]">Fin : {new Date(task.endDate).toLocaleDateString("fr-FR")}</p>}
                              {task.assigneeName && (
                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/10 mt-1.5">
                                  <Avatar name={task.assigneeName} size="sm" />
                                  <span className="text-gray-300 text-[10px]">{task.assigneeName}</span>
                                </div>
                              )}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>
      </main>

      {/* Legend */}
      <footer className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-6">
        {[
          { color: "bg-green-500",  label: "Terminé" },
          { color: "bg-blue-500",   label: "En cours" },
          { color: "bg-violet-500", label: "En revue" },
          { color: "bg-red-500",    label: "Bloqué" },
          { color: "bg-gray-300",   label: "À faire" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 ${color} rounded-sm`} />
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{label}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}
