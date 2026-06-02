"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Layers,
  ShieldCheck,
  Sun,
  Moon,
  Plus,
} from "@/lib/icons";
import Avatar from "../ui/Avatar";
import CreateWorkspaceModal from "../ui/CreateWorkspaceModal";
import { useTheme } from "@/components/ThemeProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";

const Sidebar = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { selectedWorkspace, selectedWorkspaceId, setSelectedWorkspaceId, workspaces } = useWorkspace();

  // Valeur par défaut identique côté serveur et au premier rendu client (évite
  // un mismatch d'hydratation) ; le vrai user est chargé depuis localStorage
  // après le montage.
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string }>(
    { name: "Utilisateur", email: "", role: "user" }
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    try {
      const parsed = JSON.parse(storedUser) as Record<string, unknown>;
      setCurrentUser({
        name: (parsed.nom as string) || (parsed.name as string) || "Utilisateur",
        email: (parsed.email as string) || "",
        role: (Array.isArray(parsed.roles) && (parsed.roles.includes("ROLE_ADMIN") || parsed.roles.includes("admin"))) ? "admin" : "user"
      });
    } catch {
      /* garde la valeur par défaut */
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      window.location.href = "/auth/login";
    }
  };

  const navItems = [
    { name: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Mes Projets",     icon: FolderKanban,   href: "/dashboard/projects" },
    { name: "Notifications",   icon: Bell,            href: "/dashboard/notifications", badge: 3 },
    { name: "Profil",          icon: User,            href: "/dashboard/profile" },
  ];

  const adminItems = [
    { name: "Admin compte", icon: ShieldCheck, href: "/dashboard/admin" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`relative h-screen bg-[#1d2125] transition-all duration-300 flex flex-col shrink-0 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
        <div className="bg-blue-500 p-1.5 rounded-lg shrink-0">
          <Layers className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <span className="text-base font-black text-white tracking-tight">SPM</span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-[52px] bg-[#1d2125] border border-white/20 rounded-full p-1 shadow-md hover:bg-[#282e33] transition-colors z-10"
      >
        {isCollapsed
          ? <ChevronRight className="w-3 h-3 text-gray-400" />
          : <ChevronLeft className="w-3 h-3 text-gray-400" />
        }
      </button>

      {!isCollapsed && (
        <div className="px-2 pt-3">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Workspace
            </label>
            <button
              type="button"
              onClick={() => setWorkspaceModalOpen(true)}
              title="Nouveau workspace"
              aria-label="Nouveau workspace"
              className="text-gray-500 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs font-bold text-gray-200 truncate">{selectedWorkspace.name}</p>
            <select
              aria-label="Changer de workspace"
              value={selectedWorkspaceId}
              onChange={(event) => setSelectedWorkspaceId(event.target.value)}
              className="mt-1 w-full bg-transparent text-[11px] font-medium text-gray-400 focus:outline-none"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id} className="bg-[#1d2125] text-gray-200">
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="px-2 pt-3 space-y-1.5">
          <button
            type="button"
            title={selectedWorkspace.name}
            className="w-full flex items-center justify-center p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-black text-white"
          >
            {selectedWorkspace.name.slice(0, 1)}
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceModalOpen(true)}
            title="Nouveau workspace"
            aria-label="Nouveau workspace"
            className="w-full flex items-center justify-center p-2 rounded-lg border border-dashed border-white/15 text-gray-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!isCollapsed && (
          <p className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Menu</p>
        )}
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
                active
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              } ${isCollapsed ? "justify-center" : ""}`}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : "text-gray-400 group-hover:text-gray-200"}`} />
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && item.badge && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
          );
        })}

        {currentUser.role === "admin" && (
          <>
            {!isCollapsed && (
              <p className="px-3 mt-6 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Compte</p>
            )}
            {isCollapsed && <div className="my-3 mx-2 border-t border-white/10" />}
            {adminItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                    active
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : "text-gray-400 group-hover:text-gray-200"}`} />
                  {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Theme toggle */}
      <div className="px-2 pb-1">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Basculer le thème"
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors ${isCollapsed ? "justify-center" : ""}`}
        >
          {theme === "dark"
            ? <Sun className="w-4 h-4 shrink-0" />
            : <Moon className="w-4 h-4 shrink-0" />
          }
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </span>
          )}
        </button>
      </div>

      {/* User */}
      <div className="px-2 py-3 border-t border-white/10">
        <div
          onClick={isCollapsed ? handleLogout : undefined}
          className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? "Se déconnecter" : undefined}
        >
          <Avatar name={currentUser.name} size="sm" className="shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-200 truncate">{currentUser.name}</p>
              <p className="text-[10px] font-medium text-gray-500 truncate">{currentUser.email}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <CreateWorkspaceModal
        isOpen={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;
