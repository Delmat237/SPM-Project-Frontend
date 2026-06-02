import { TaskStatus } from "@/types";

// ─── Board templates ──────────────────────────────────────────────────────────
// A "modèle" (template) is a board layout over the 5 backend task statuses.
// Customizing a template = choosing which statuses to show, their order, their
// display title and color. This keeps drag & drop and the real API working,
// since every column still maps to a real TaskStatus.

export interface BoardColumn {
  status: TaskStatus;
  title: string;
  color: string; // tailwind bg-* class
}

export interface BoardConfig {
  template: string;        // template id used as starting point
  view: BoardView;         // which project view to open by default
  columns: BoardColumn[];  // ordered subset of the 5 statuses
}

export type BoardView = "kanban" | "backlog" | "gantt";

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: "À faire",  color: "bg-gray-400" },
  in_progress: { label: "En cours", color: "bg-blue-500" },
  in_review:   { label: "En revue", color: "bg-violet-500" },
  blocked:     { label: "Bloqué",   color: "bg-red-500" },
  done:        { label: "Terminé",  color: "bg-green-500" },
};

export const ALL_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review", "blocked", "done"];

export const COLUMN_PALETTE: { name: string; class: string }[] = [
  { name: "Gris",    class: "bg-gray-400" },
  { name: "Bleu",    class: "bg-blue-500" },
  { name: "Violet",  class: "bg-violet-500" },
  { name: "Rouge",   class: "bg-red-500" },
  { name: "Vert",    class: "bg-green-500" },
  { name: "Ambre",   class: "bg-amber-500" },
  { name: "Rose",    class: "bg-pink-500" },
  { name: "Cyan",    class: "bg-cyan-500" },
];

function col(status: TaskStatus, title?: string, color?: string): BoardColumn {
  return {
    status,
    title: title ?? STATUS_META[status].label,
    color: color ?? STATUS_META[status].color,
  };
}

export function defaultColumns(): BoardColumn[] {
  return ALL_STATUSES.map((s) => col(s));
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  view: BoardView;
  columns: BoardColumn[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "kanban",
    name: "Kanban",
    description: "Tableau visuel à 5 colonnes pour un flux continu.",
    view: "kanban",
    columns: defaultColumns(),
  },
  {
    id: "scrum",
    name: "Scrum / Sprint",
    description: "Organisé pour des sprints : backlog, développement, revue, terminé.",
    view: "kanban",
    columns: [
      col("todo", "Sprint Backlog"),
      col("in_progress", "En développement", "bg-blue-500"),
      col("in_review", "En revue"),
      col("done", "Terminé"),
    ],
  },
  {
    id: "list",
    name: "Liste",
    description: "Vue liste priorisable (backlog), sans colonnes visuelles.",
    view: "backlog",
    columns: defaultColumns(),
  },
  {
    id: "timeline",
    name: "Timeline / Gantt",
    description: "Planification temporelle des tâches sur un calendrier.",
    view: "gantt",
    columns: defaultColumns(),
  },
  {
    id: "blank",
    name: "Personnalisé",
    description: "Partez d'une base simple et définissez vos propres colonnes.",
    view: "kanban",
    columns: [col("todo"), col("in_progress"), col("done")],
  },
];

export function getTemplate(id: string): BoardTemplate {
  return BOARD_TEMPLATES.find((t) => t.id === id) ?? BOARD_TEMPLATES[0];
}

// ─── Per-project persistence (frontend-only, no backend endpoint) ─────────────

const KEY = (projectId: string) => `spm.board.${projectId}`;

export function getBoardConfig(projectId: string): BoardConfig {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY(projectId));
      if (raw) {
        const parsed = JSON.parse(raw) as BoardConfig;
        if (parsed?.columns?.length) return parsed;
      }
    } catch {
      // ignore malformed config and fall back to default
    }
  }
  return { template: "kanban", view: "kanban", columns: defaultColumns() };
}

export function saveBoardConfig(projectId: string, config: BoardConfig): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY(projectId), JSON.stringify(config));
  }
}
