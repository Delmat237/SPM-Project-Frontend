"use client";

import { useState, useEffect, use } from "react";
import {
  BarChart3, Bell, Calendar, ChevronRight, Clock,
  GanttChartSquare, Globe, Trello, Users, Settings,
  ShieldAlert, Archive, Trash2, Save, Tag, ListChecks, BarChart2,
} from "@/lib/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { ProjectResponse, MemberResponse } from "@/types";
import { projectsApi } from "@/lib/api/projects";

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject]     = useState<ProjectResponse | null>(null);
  const [members, setMembers]     = useState<MemberResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [name, setName]           = useState("");
  const [description, setDesc]    = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [error, setError]         = useState("");

  const [activeSection, setActiveSection] = useState("general");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    Promise.all([
      projectsApi.get(id),
      projectsApi.members.list(id),
    ]).then(([p, m]) => {
      setProject(p);
      setName(p.name);
      setDesc(p.description || "");
      setVisibility(p.visibility);
      setMembers(m);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await projectsApi.update(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      setProject(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
    } finally { setSaving(false); }
  };

  const handleArchive = async () => {
    if (!confirm("Archiver ce projet ? Il passera en lecture seule.")) return;
    try {
      await projectsApi.update(id, {} as never);
      router.push("/dashboard/projects");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'archivage.");
    }
  };

  const handleDelete = async () => {
    if (!project || confirmName !== project.name) return;
    setDeleting(true);
    try {
      await projectsApi.delete(id);
      router.push("/dashboard/projects");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    } finally { setDeleting(false); }
  };

  const sections = [
    { id: "general",       label: "Général",          icon: Settings },
    { id: "workflow",      label: "Workflow",          icon: Trello },
    { id: "notifications", label: "Notifications",     icon: Bell },
    { id: "danger",        label: "Zone de danger",    icon: ShieldAlert },
  ];

  const tabs = [
    { name: "Kanban",     href: `/dashboard/projects/${id}/kanban`,    icon: Trello },
    { name: "Backlog",    href: `/dashboard/projects/${id}/backlog`,   icon: ListChecks },
    { name: "Gantt",      href: `/dashboard/projects/${id}/gantt`,     icon: GanttChartSquare },
    { name: "Analytics",  href: `/dashboard/projects/${id}/analytics`, icon: BarChart2 },
    { name: "Membres",    href: `/dashboard/projects/${id}/members`,   icon: Users },
    { name: "Paramètres", href: `/dashboard/projects/${id}/settings`,  icon: Settings, active: true },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  const totalTasks = project?.memberCount ?? 0;
  const completion = 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 pt-5 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 mb-4">
          <Link href="/dashboard/projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Projets</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 dark:text-gray-300">{project?.name || id}</span>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-black text-gray-900 dark:text-gray-100">Paramètres du projet</h1>
          {activeSection === "general" && (
            <button type="button" onClick={handleSave} disabled={saving}
              className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5 disabled:opacity-60">
              <Save className="w-3.5 h-3.5" />
              {saving ? "Enregistrement…" : saveSuccess ? "✓ Enregistré" : "Enregistrer"}
            </button>
          )}
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

      <main className="flex-1 flex overflow-hidden bg-[#f4f5f7] dark:bg-gray-900">
        <aside className="w-52 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hidden md:block">
          <nav className="space-y-1">
            {sections.map(sec => (
              <button type="button" key={sec.id} onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeSection === sec.id
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"
                } ${sec.id === "danger" ? "mt-4" : ""}`}>
                <sec.icon className="w-4 h-4" />
                {sec.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="max-w-6xl grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <div className="space-y-5">
              {activeSection === "general" && (
                <>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-5 uppercase tracking-wide">Informations de base</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Nom du projet</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                        <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm resize-none" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-5 uppercase tracking-wide">Préférences</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all"
                        onClick={() => setVisibility(visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC")}>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Visibilité publique</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Tout le monde dans l&apos;organisation peut voir ce projet.</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative p-0.5 shadow-inner transition-colors shrink-0 ${visibility === "PUBLIC" ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${visibility === "PUBLIC" ? "translate-x-5" : "translate-x-0"}`} />
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {activeSection === "workflow" && (
                <>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-5 uppercase tracking-wide">Colonnes du tableau</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        ["À faire", "Les tâches prêtes à être prises en charge."],
                        ["En cours", "Le travail actif de l'équipe."],
                        ["En revue", "Les tâches en validation."],
                        ["Bloqué", "Les tâches bloquées en attente."],
                        ["Terminé", "Les livraisons finalisées."],
                      ].map(([n, d]) => (
                        <div key={n} className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{n}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{d}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-5 uppercase tracking-wide">Règles de travail</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Limite tâches en cours</label>
                        <input type="number" defaultValue={5}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === "notifications" && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-5 uppercase tracking-wide">Notifications projet</h3>
                  <div className="space-y-3">
                    {[
                      ["Commentaires et mentions", "Prévenir les membres lorsqu'ils sont mentionnés.", true],
                      ["Changement de statut", "Notifier l'équipe quand une tâche change de colonne.", true],
                      ["Échéances proches", "Envoyer un rappel avant les dates limites.", false],
                    ].map(([name, desc, on]) => (
                      <label key={String(name)} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{String(name)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{String(desc)}</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative p-0.5 shadow-inner transition-colors shrink-0 ${on ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === "danger" && (
                <div className="bg-red-50/50 p-6 rounded-xl border border-red-200 border-dashed">
                  <h3 className="text-sm font-black text-red-600 mb-5 uppercase tracking-wide">Actions irréversibles</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Archiver le projet</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Le projet passera en lecture seule pour tous les membres.</p>
                      </div>
                      <button type="button" onClick={handleArchive}
                        className="px-4 py-2 rounded-lg border border-orange-200 text-orange-600 font-semibold hover:bg-orange-50 transition-all text-sm flex items-center gap-1.5 shrink-0">
                        <Archive className="w-4 h-4" /> Archiver
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm">
                      <div>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">Supprimer définitivement</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Toutes les tâches, membres et données seront supprimés.</p>
                      </div>
                      <button type="button" onClick={() => setIsDeleteModalOpen(true)}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all text-sm shadow-sm flex items-center gap-1.5 shrink-0">
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <aside className="space-y-5">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Résumé</p>
                    <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mt-1">{project?.name}</h3>
                  </div>
                  <Badge variant={project?.archived ? "archived" : "active"} />
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Avancement</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">{completion}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${completion}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-2" />
                      <p className="text-lg font-black text-gray-900 dark:text-gray-100">{project?.memberCount ?? 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Membres</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-2" />
                      <p className="text-lg font-black text-gray-900 dark:text-gray-100">{members.length}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Actifs</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Visibilité</span>
                      <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100 capitalize">{project?.visibility?.toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Responsable</span>
                      <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100 text-right text-xs">{project?.ownerName}</span>
                    </div>
                    {project?.updatedAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500 dark:text-gray-400">Mis à jour</span>
                        <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100">
                          {new Date(project.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Accès rapides</h3>
                <div className="space-y-2">
                  {[
                    { label: "Tableau Kanban", href: `/dashboard/projects/${id}/kanban`, icon: Trello },
                    { label: "Backlog",        href: `/dashboard/projects/${id}/backlog`, icon: ListChecks },
                    { label: "Planning Gantt", href: `/dashboard/projects/${id}/gantt`, icon: Clock },
                    { label: "Analytics",     href: `/dashboard/projects/${id}/analytics`, icon: BarChart2 },
                    { label: "Membres",        href: `/dashboard/projects/${id}/members`, icon: Users },
                  ].map(item => (
                    <Link key={item.label} href={item.href}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                      <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {item.label}
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Supprimer le projet ?"
        footer={
          <>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)}
              className="px-5 py-2 rounded-lg font-semibold text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              Annuler
            </button>
            <button type="button" disabled={confirmName !== (project?.name ?? "") || deleting}
              onClick={handleDelete}
              className="bg-red-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {deleting ? "Suppression…" : "Confirmer la suppression"}
            </button>
          </>
        }>
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg flex gap-3 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">
              Cette action est irréversible. Toutes les données associées à <strong>{project?.name}</strong> seront définitivement supprimées.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Saisissez <strong>{project?.name}</strong> pour confirmer
            </label>
            <input type="text" value={confirmName} onChange={e => setConfirmName(e.target.value)}
              placeholder={project?.name ?? ""}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:outline-none transition-all text-sm font-semibold placeholder:text-gray-400" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
