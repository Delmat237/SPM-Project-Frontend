"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useWorkspace } from "@/components/WorkspaceProvider";
import type { Workspace } from "@/types";

const PLANS: { id: Workspace["plan"]; label: string; hint: string }[] = [
  { id: "free", label: "Free", hint: "Pour démarrer, projets illimités." },
  { id: "team", label: "Team", hint: "Collaboration avancée en équipe." },
  { id: "enterprise", label: "Enterprise", hint: "Sécurité et support dédiés." },
];

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (workspace: Workspace) => void;
}) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<Workspace["plan"]>("free");
  const [error, setError] = useState("");

  const reset = () => { setName(""); setDescription(""); setPlan("free"); setError(""); };
  const close = () => { reset(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Le nom du workspace est obligatoire."); return; }
    const ws = createWorkspace({ name, description, plan });
    onCreated?.(ws);
    close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Nouveau workspace"
      footer={
        <>
          <button type="button" onClick={close}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            Annuler
          </button>
          <button type="submit" form="create-workspace-form" className="btn-primary py-2.5 px-6 text-sm">
            Créer le workspace
          </button>
        </>
      }
    >
      <form id="create-workspace-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="ws-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="ws-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Ex: Cellule Projet GI"
            className="block w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder:text-gray-400"
          />
        </div>

        <div>
          <label htmlFor="ws-desc" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Description
          </label>
          <textarea
            id="ws-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="À quoi sert cet espace ?"
            className="block w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm resize-none placeholder:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Plan</label>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlan(p.id)}
                title={p.hint}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  plan === p.id
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.label}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{p.hint}</p>
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
