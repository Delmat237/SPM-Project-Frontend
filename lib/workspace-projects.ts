import { activeWorkspace } from "@/lib/mock-data";

// ─── Association projet → workspace (frontend-only) ───────────────────────────
// Le backend n'a pas de notion de workspace : on relie chaque projet à un
// workspace côté client (localStorage). Les projets sans association explicite
// (créés avant cette fonctionnalité, ou venant du backend) sont rattachés au
// workspace principal pour rester visibles.

const KEY = "spm.projectWorkspace";
const DEFAULT_WORKSPACE_ID = activeWorkspace.id;

function loadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // map corrompue → on repart d'un objet vide
  }
  return {};
}

export function getProjectWorkspace(projectId: string): string {
  return loadMap()[projectId] ?? DEFAULT_WORKSPACE_ID;
}

export function setProjectWorkspace(projectId: string, workspaceId: string): void {
  if (typeof window === "undefined") return;
  const map = loadMap();
  map[projectId] = workspaceId;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function belongsToWorkspace(projectId: string, workspaceId: string): boolean {
  return getProjectWorkspace(projectId) === workspaceId;
}
