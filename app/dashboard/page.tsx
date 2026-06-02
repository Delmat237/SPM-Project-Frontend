"use client";

import { useEffect, useState } from "react";
import {
  Folder,
  Clock,
  CheckCircle,
  Users,
  Search,
  Plus
} from "@/lib/icons";
import ProjectCard from "@/components/ui/ProjectCard";
import { projects as mockProjects, tasks as mockTasks, users as mockUsers } from "@/lib/mock-data";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { Task, Project, TaskStatus, Priority, ProjectResponse, TaskResponse, PageResponse } from "@/types";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { apiClient } from "@/lib/api-client";
import { getProjectWorkspace } from "@/lib/workspace-projects";

export default function DashboardPage() {
  const { selectedWorkspace, selectedWorkspaceId } = useWorkspace();
  
  // State for dynamic user and data
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string }>({
    name: "Utilisateur",
    email: ""
  });
  
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [teamMembersCount, setTeamMembersCount] = useState<number>(mockUsers.length);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Charger l'utilisateur depuis localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setCurrentUser({
            name: parsed.nom || parsed.name || "Utilisateur",
            email: parsed.email || ""
          });
        } catch (e) {
          console.error("Error parsing user from localStorage", e);
        }
      }
    }
  }, []);

  // 2. Charger les données depuis l'API Backend avec repli (fallback) sur les mocks
  useEffect(() => {
    let active = true;
    
    async function fetchData() {
      setIsLoading(true);
      
      try {
        // Appeler GET /api/projects?size=100
        const projectsData = await apiClient.get<PageResponse<ProjectResponse>>("/api/projects?size=100");
        const rawProjects = projectsData.content || [];
        
        if (!active) return;
        
        if (rawProjects.length === 0) {
          // Si l'API retourne une liste vide, on n'a aucun projet backend, on initialise à vide
          setProjectsList([]);
          setTasksList([]);
          setTeamMembersCount(mockUsers.length);
          setIsLoading(false);
          return;
        }

        // Mapper les projets du backend vers le type Project du frontend
        const mappedProjects: Project[] = rawProjects.map((bp: ProjectResponse) => ({
          id: String(bp.id),
          workspaceId: getProjectWorkspace(String(bp.id)), // Rattacher chaque projet à SON workspace
          name: bp.name,
          description: bp.description || "",
          key: bp.projectKey || "",
          status: bp.archived ? "archived" : "active",
          visibility: (bp.visibility?.toLowerCase() as "public" | "private") || "public",
          ownerId: String(bp.ownerId),
          members: Array(bp.memberCount || 1).fill(null).map((_, i) => ({
            userId: String(i === 0 ? bp.ownerId : i),
            projectId: String(bp.id),
            role: i === 0 ? "owner" : "read",
            joinedAt: "",
            status: "active"
          })),
          createdAt: bp.createdAt,
          updatedAt: bp.updatedAt || bp.createdAt,
        }));

        // Récupérer les tâches de tous les projets en parallèle
        const tasksPromises = mappedProjects.map(async (proj) => {
          try {
            const res = await apiClient.get<PageResponse<TaskResponse>>(`/api/projects/${proj.id}/tasks?size=100`);
            return res.content || [];
          } catch (e) {
            console.error(`Error fetching tasks for project ${proj.id}:`, e);
            return [];
          }
        });

        const tasksResults = await Promise.all(tasksPromises);
        
        if (!active) return;

        // Mapper les tâches du backend vers le type Task du frontend
        const mappedTasks: Task[] = tasksResults.flat().map((bt: TaskResponse) => ({
          id: String(bt.id),
          title: bt.title,
          description: bt.description || "",
          status: (bt.status?.toLowerCase() as TaskStatus) || "todo",
          priority: (bt.priority?.toLowerCase() as Priority) || "medium",
          projectId: String(bt.projectId),
          assigneeId: bt.assigneeId ? String(bt.assigneeId) : undefined,
          dueDate: bt.dueDate ? String(bt.dueDate) : undefined,
          tags: [],
          createdAt: bt.createdAt,
          updatedAt: bt.updatedAt || bt.createdAt,
        }));

        // Calculer le nombre total de membres uniques
        const totalUniqueOwners = new Set(rawProjects.map((p: ProjectResponse) => p.ownerId));
        setTeamMembersCount(Math.max(mockUsers.length, totalUniqueOwners.size));

        setProjectsList(mappedProjects);
        setTasksList(mappedTasks);
      } catch (err: unknown) {
        console.warn("Backend API non joignable, bascule sur les mocks locaux. Erreur:", err);
        if (!active) return;
        
        // Mécanisme de repli sur les mocks locaux
        setProjectsList(mockProjects);
        setTasksList(mockTasks);
        setTeamMembersCount(mockUsers.length);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchData();
    
    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  // Filtrer les données en fonction du workspace sélectionné
  const workspaceProjects = projectsList.filter(p => p.workspaceId === selectedWorkspaceId);
  const workspaceProjectIds = workspaceProjects.map((project) => project.id);
  const workspaceTasks = tasksList.filter(t => workspaceProjectIds.includes(t.projectId));
  
  const activeProjectsCount = workspaceProjects.filter(p => p.status === "active").length;
  const inProgressTasksCount = workspaceTasks.filter(t => t.status === "in_progress" || t.status === "in_review").length;
  const doneTasksCount = workspaceTasks.filter(t => t.status === "done").length;

  const stats = [
    { label: "Projets actifs",    value: String(activeProjectsCount), icon: Folder,      color: "bg-blue-50 text-blue-600" },
    { label: "Tâches en cours",   value: String(inProgressTasksCount), icon: Clock,      color: "bg-orange-50 text-orange-600" },
    { label: "Tâches terminées",  value: String(doneTasksCount),       icon: CheckCircle, color: "bg-green-50 text-green-600" },
    { label: "Membres d'équipe",  value: String(teamMembersCount),    icon: Users,       color: "bg-purple-50 text-purple-600" },
  ];

  const recentProjects = workspaceProjects.slice(0, 3);
  
  // Tâches assignées à l'utilisateur actuel (ou fallback si aucun assigné spécifique)
  const myTasks = workspaceTasks.slice(0, 5);

  // Formatter la date du jour en français
  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <div className="p-6 lg:p-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-gray-400 dark:text-gray-500 font-bold mb-0.5 uppercase tracking-widest text-[10px]">Tableau de bord</p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
            Bonjour, {currentUser.name} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            {selectedWorkspace.name} · {todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg py-2 pl-9 pr-4 w-56 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <Link href="/dashboard/projects/new" className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nouveau projet
          </Link>
        </div>
      </header>

      {/* Loader pendant le chargement initial */}
      {isLoading && projectsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Chargement des données du projet...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">{stat.label}</p>
                  <p className="text-xl font-black text-gray-900 dark:text-gray-100">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide">Projets récents</h2>
                <Link href="/dashboard/projects" className="text-xs font-bold text-blue-600 hover:underline">Voir tout</Link>
              </div>
              
              {recentProjects.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {recentProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                  <Folder className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Aucun projet actif</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Créez votre premier projet pour commencer.</p>
                </div>
              )}
            </div>

            {/* My tasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide">Mes tâches</h2>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{myTasks.length} tâches</span>
              </div>
              
              {myTasks.length > 0 ? (
                <div className="space-y-2">
                  {myTasks.map((task: Task) => {
                    const proj = projectsList.find(p => p.id === task.projectId);
                    const taskNum = task.id.includes("-") ? task.id.split("-").pop() : task.id;
                    const taskId = proj ? `${proj.key}-${taskNum}` : taskNum;
                    return (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-400 hover:shadow-sm transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{taskId}</span>
                          <Badge variant={task.priority} />
                        </div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {task.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant={task.status} />
                          {task.dueDate && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                              {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Aucune tâche en cours</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vous êtes à jour !</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
