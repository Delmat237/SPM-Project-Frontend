"use client";

import React from "react";
import { Folder, MoreHorizontal, ArrowRight, Layers } from "@/lib/icons";
import { Project } from "@/types";
import Badge from "./Badge";
import Avatar from "./Avatar";
import { useRouter } from "next/navigation";
import { users as allUsers } from "@/lib/mock-data";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { getProjectWorkspace } from "@/lib/workspace-projects";

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const router = useRouter();
  const { workspaces } = useWorkspace();

  const members = project.members
    .map((m) => allUsers.find((u) => u.id === m.userId))
    .filter(Boolean)
    .slice(0, 4);

  const extraMembers = project.members.length > 4 ? project.members.length - 4 : 0;
  const workspace = workspaces.find((item) => item.id === getProjectWorkspace(project.id));

  return (
    <div
      onClick={() => router.push(`/dashboard/projects/${project.id}/kanban`)}
      className="group bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
          <Folder className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{project.key}</span>
            <Badge variant={project.status} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{project.name}</h3>
          {workspace && (
            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 max-w-full">
              <Layers className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{workspace.name}</span>
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 min-h-[32px]">
        {project.description}
      </p>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">Progression</span>
          <span className="text-[10px] font-bold text-blue-600">65%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="w-[65%] h-full bg-blue-500 rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {members.map((user, idx) => (
            <Avatar key={user?.id || idx} name={user?.name || ""} size="sm" className="ring-2 ring-white dark:ring-gray-800" />
          ))}
          {extraMembers > 0 && (
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-400">
              +{extraMembers}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
          <span>Ouvrir</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
