"use client";

import { useState, useEffect, use } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  ChevronRight,
  GanttChartSquare,
  Trello,
  Users,
  Settings,
  Mail,
  ShieldCheck,
  Trash2,
  ListChecks,
  BarChart2,
} from "@/lib/icons";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { MemberResponse } from "@/types";
import { projectsApi } from "@/lib/api/projects";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MEMBER: "Membre",
  READER: "Lecteur",
};

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [projectName, setProjectName] = useState("");
  const [members, setMembers]         = useState<MemberResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("MEMBER");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const [roleTarget, setRoleTarget]   = useState<MemberResponse | null>(null);
  const [newRole, setNewRole]         = useState("");

  useEffect(() => {
    Promise.all([projectsApi.get(id), projectsApi.members.list(id)])
      .then(([project, memberList]) => {
        setProjectName(project.name);
        setMembers(memberList);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const filteredMembers = members.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError("L'email est obligatoire."); return; }
    setInviteLoading(true);
    setInviteError("");
    try {
      await projectsApi.members.invite(id, inviteEmail.trim(), inviteRole);
      const updated = await projectsApi.members.list(id);
      setMembers(updated);
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER");
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Erreur lors de l'invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!roleTarget || !newRole) return;
    try {
      await projectsApi.members.updateRole(id, roleTarget.userId, newRole);
      setMembers(prev => prev.map(m => m.userId === roleTarget.userId ? { ...m, role: newRole as MemberResponse["role"] } : m));
      setRoleTarget(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors du changement de rôle.");
    }
  };

  const handleRemove = async (member: MemberResponse) => {
    if (!confirm(`Retirer ${member.fullName} du projet ?`)) return;
    try {
      await projectsApi.members.remove(id, member.userId);
      setMembers(prev => prev.filter(m => m.userId !== member.userId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  const tabs = [
    { name: "Kanban",     href: `/dashboard/projects/${id}/kanban`,    icon: Trello },
    { name: "Backlog",    href: `/dashboard/projects/${id}/backlog`,   icon: ListChecks },
    { name: "Gantt",      href: `/dashboard/projects/${id}/gantt`,     icon: GanttChartSquare },
    { name: "Analytics",  href: `/dashboard/projects/${id}/analytics`, icon: BarChart2 },
    { name: "Membres",    href: `/dashboard/projects/${id}/members`,   icon: Users, active: true },
    { name: "Paramètres", href: `/dashboard/projects/${id}/settings`,  icon: Settings },
  ];

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
          <h1 className="text-base font-black text-gray-900 dark:text-gray-100">Membres du projet</h1>
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Inviter un membre
          </button>
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

      <main className="flex-1 overflow-y-auto p-6 bg-[#f4f5f7] dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
              {members.length} membre{members.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Utilisateur</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Rôle</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Ajouté le</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4} className="px-5 py-3.5">
                          <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : filteredMembers.map((member) => (
                      <tr key={member.userId} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={member.fullName} />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{member.fullName}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {ROLE_LABELS[member.role] ?? member.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(member.joinedAt).toLocaleDateString("fr-FR")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {member.role !== "OWNER" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setRoleTarget(member); setNewRole(member.role); }}
                                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm text-gray-400 hover:text-blue-600 transition-all"
                                  title="Changer le rôle"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(member)}
                                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm text-gray-400 hover:text-red-500 transition-all"
                                  title="Retirer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button type="button" title="Plus d'options" className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm text-gray-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => { setIsInviteModalOpen(false); setInviteError(""); }}
        title="Inviter un nouveau membre"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setIsInviteModalOpen(false); setInviteError(""); }}
              className="px-5 py-2 rounded-lg font-semibold text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviteLoading}
              className="btn-primary py-2 px-5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {inviteLoading ? "Envoi…" : "Envoyer l'invitation"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {inviteError && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{inviteError}</p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Email de l&apos;invité
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
                placeholder="nom@exemple.com"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm placeholder:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Rôle du membre</label>
            <select
              aria-label="Rôle du membre"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
            >
              <option value="READER">Lecteur (Consultation uniquement)</option>
              <option value="MEMBER">Membre (Peut modifier les tâches)</option>
              <option value="ADMIN">Administrateur (Gestion du projet)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      {roleTarget && (
        <Modal
          isOpen={true}
          onClose={() => setRoleTarget(null)}
          title={`Modifier le rôle de ${roleTarget.fullName}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setRoleTarget(null)}
                className="px-5 py-2 rounded-lg font-semibold text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleChangeRole}
                className="btn-primary py-2 px-5 text-sm"
              >
                Confirmer
              </button>
            </>
          }
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nouveau rôle</label>
            <select
              aria-label="Nouveau rôle"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
            >
              <option value="READER">Lecteur</option>
              <option value="MEMBER">Membre</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
