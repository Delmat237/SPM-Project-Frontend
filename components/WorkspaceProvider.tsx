"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { activeWorkspace, workspaces as seedWorkspaces } from "@/lib/mock-data";
import { Workspace } from "@/types";

interface CreateWorkspaceInput {
  name: string;
  description?: string;
  plan?: Workspace["plan"];
}

interface WorkspaceContextValue {
  selectedWorkspace: Workspace;
  selectedWorkspaceId: string;
  setSelectedWorkspaceId: (workspaceId: string) => void;
  workspaces: Workspace[];
  createWorkspace: (input: CreateWorkspaceInput) => Workspace;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const STORAGE_KEY = "spm.workspaces";
const SELECTED_KEY = "spm.selectedWorkspace";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "workspace";
}

function loadWorkspaces(): Workspace[] {
  if (typeof window === "undefined") return seedWorkspaces;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Workspace[];
      // Merge seeds with stored, stored ones win on id collision.
      const byId = new Map<string, Workspace>();
      for (const w of seedWorkspaces) byId.set(w.id, w);
      for (const w of stored) byId.set(w.id, w);
      return Array.from(byId.values());
    }
  } catch {
    // ignore malformed storage
  }
  return seedWorkspaces;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(seedWorkspaces);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(activeWorkspace.id);

  // Hydrate from localStorage on mount (avoids SSR/client mismatch).
  useEffect(() => {
    setWorkspaces(loadWorkspaces());
    const storedSelected = window.localStorage.getItem(SELECTED_KEY);
    if (storedSelected) setSelectedWorkspaceId(storedSelected);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SELECTED_KEY, selectedWorkspaceId);
    }
  }, [selectedWorkspaceId]);

  const persist = (next: Workspace[]) => {
    setWorkspaces(next);
    if (typeof window !== "undefined") {
      // Only persist workspaces created by the user (not in the seed list).
      const seedIds = new Set(seedWorkspaces.map((w) => w.id));
      const created = next.filter((w) => !seedIds.has(w.id));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    }
  };

  const createWorkspace = ({ name, description, plan = "free" }: CreateWorkspaceInput): Workspace => {
    let ownerId = "user-1";
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(window.localStorage.getItem("user") || "{}");
        if (stored?.id) ownerId = String(stored.id);
      } catch { /* keep default */ }
    }
    const now = new Date().toISOString();
    const ws: Workspace = {
      id: `workspace-${Date.now()}`,
      name: name.trim(),
      slug: slugify(name),
      description: description?.trim() ?? "",
      domain: "",
      plan,
      ownerId,
      members: [{ userId: ownerId, workspaceId: "", role: "owner", joinedAt: now, status: "active" }],
      createdAt: now,
    };
    ws.members[0].workspaceId = ws.id;
    persist([...workspaces, ws]);
    setSelectedWorkspaceId(ws.id);
    return ws;
  };

  const value = useMemo<WorkspaceContextValue>(() => {
    const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0] ?? activeWorkspace;
    return {
      selectedWorkspace,
      selectedWorkspaceId,
      setSelectedWorkspaceId,
      workspaces,
      createWorkspace,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceId, workspaces]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}
