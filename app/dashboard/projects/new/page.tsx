"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock, Globe, Layers, Trello, ListChecks, GanttChartSquare, Settings2, Plus, X, ArrowUpDown } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { projectsApi } from "@/lib/api/projects";
import { useWorkspace } from "@/components/WorkspaceProvider";
import {
  BOARD_TEMPLATES,
  COLUMN_PALETTE,
  STATUS_META,
  ALL_STATUSES,
  getTemplate,
  saveBoardConfig,
  type BoardColumn,
} from "@/lib/templates";
import { setProjectWorkspace } from "@/lib/workspace-projects";
import type { TaskStatus } from "@/types";

const TEMPLATE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  kanban: Trello,
  scrum: Trello,
  list: ListChecks,
  timeline: GanttChartSquare,
  blank: Settings2,
};

export default function NewProjectPage() {
  const router = useRouter();
  const { selectedWorkspace } = useWorkspace();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "PRIVATE" as "PUBLIC" | "PRIVATE",
  });
  const [templateId, setTemplateId] = useState("kanban");
  const [columns, setColumns] = useState<BoardColumn[]>(getTemplate("kanban").columns);
  const [customizing, setCustomizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    setColumns(getTemplate(id).columns);
    setCustomizing(id === "blank");
  };

  const updateColumn = (index: number, patch: Partial<BoardColumn>) =>
    setColumns((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const removeColumn = (index: number) =>
    setColumns((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const moveColumn = (index: number, dir: -1 | 1) =>
    setColumns((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const unusedStatuses = ALL_STATUSES.filter((s) => !columns.some((c) => c.status === s));

  const addColumn = (status: TaskStatus) =>
    setColumns((prev) => [...prev, { status, title: STATUS_META[status].label, color: STATUS_META[status].color }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError("Le nom du projet est obligatoire."); return; }

    setLoading(true);
    setError("");
    try {
      const project = await projectsApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        visibility: formData.visibility,
      });
      const tpl = getTemplate(templateId);
      saveBoardConfig(String(project.id), { template: templateId, view: tpl.view, columns });
      setProjectWorkspace(String(project.id), selectedWorkspace.id);
      const dest = tpl.view === "backlog" ? "backlog" : tpl.view === "gantt" ? "gantt" : "kanban";
      router.push(`/dashboard/projects/${project.id}/${dest}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 lg:py-14">
      <div className="w-full max-w-2xl">
        <nav className="flex items-center gap-2 text-sm font-semibold text-gray-400 dark:text-gray-500 mb-6">
          <Link href="/dashboard/projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Projets</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-gray-100">Nouveau projet</span>
        </nav>

        <header className="mb-8 text-center">
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-1">Créer un projet</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Définissez les bases de votre nouvelle collaboration.</p>
        </header>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Nom du projet <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); setError(""); }}
                className="block w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder:text-gray-400"
                placeholder="Ex: Refonte du Site Web"
              />
            </div>

            <div>
              <label htmlFor="workspace-placeholder" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Organisation
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <div className="block w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 text-sm">
                  {selectedWorkspace.name}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="block w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none placeholder:text-gray-400"
                placeholder="Décrivez brièvement l'objectif de ce projet..."
              />
            </div>

            {/* Template picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Modèle</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {BOARD_TEMPLATES.map((tpl) => {
                  const Icon = TEMPLATE_ICON[tpl.id] ?? Trello;
                  const active = templateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => selectTemplate(tpl.id)}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        active
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 ${active ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{tpl.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Customize columns */}
              <button
                type="button"
                onClick={() => setCustomizing((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Settings2 className="w-3.5 h-3.5" />
                {customizing ? "Masquer la personnalisation" : "Personnaliser les colonnes"}
              </button>

              {customizing && (
                <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-2.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Renommez, réordonnez ou retirez les colonnes. Chaque colonne reste reliée à un statut de tâche.
                  </p>
                  {columns.map((c, i) => (
                    <div key={c.status} className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button type="button" aria-label="Monter" onClick={() => moveColumn(i, -1)} disabled={i === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className={`w-3 h-3 rounded-full shrink-0 ${c.color}`} />
                      <input
                        value={c.title}
                        onChange={(e) => updateColumn(i, { title: e.target.value })}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <select
                        aria-label="Couleur"
                        value={c.color}
                        onChange={(e) => updateColumn(i, { color: e.target.value })}
                        className="px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {COLUMN_PALETTE.map((p) => (
                          <option key={p.class} value={p.class}>{p.name}</option>
                        ))}
                      </select>
                      <button type="button" aria-label="Retirer la colonne" onClick={() => removeColumn(i)} disabled={columns.length <= 1}
                        className="p-1 rounded text-gray-400 hover:text-red-500 disabled:opacity-30">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {unusedStatuses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-semibold text-gray-400">Ajouter :</span>
                      {unusedStatuses.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addColumn(s)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500"
                        >
                          <Plus className="w-3 h-3" />
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Visibilité</label>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, visibility: "PRIVATE" }))}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                    formData.visibility === "PRIVATE"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mt-0.5 ${formData.visibility === "PRIVATE" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Privé</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Seuls les membres invités peuvent voir ce projet.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, visibility: "PUBLIC" }))}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                    formData.visibility === "PUBLIC"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mt-0.5 ${formData.visibility === "PUBLIC" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Public</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tous les membres de l&apos;organisation peuvent voir ce projet.</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Link
                href="/dashboard/projects"
                className="px-5 py-2.5 rounded-lg font-semibold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-2.5 px-6 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Création…" : "Créer le projet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
