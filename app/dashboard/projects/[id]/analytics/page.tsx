"use client";

import { useState, useEffect, use } from "react";
import {
  ChevronRight, GanttChartSquare, Trello, Users, Settings,
  ListChecks, BarChart2, TrendingUp, CheckCircle, AlertCircle,
  Clock, Download, RefreshCw,
} from "@/lib/icons";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { ProjectSummaryResponse, BurndownResponse, VelocityResponse, ExportJobResponse } from "@/types";
import { analyticsApi } from "@/lib/api/analytics";
import { projectsApi } from "@/lib/api/projects";

/* ─── Helpers ─────────────────────────────────────────────── */

function DonutChart({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? value / total : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-700" />
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="10" stroke={color}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "44px 44px" }} />
        <text x="44" y="49" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" className="text-gray-900 dark:text-gray-100">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{value}/{total}</span>
    </div>
  );
}

function BarChartSVG({ data, color, maxVal }: { data: { label: string; value: number }[]; color: string; maxVal?: number }) {
  const max = maxVal ?? Math.max(...data.map(d => d.value), 1);
  const W = 56;
  const H = 80;
  return (
    <div className="flex items-end gap-2">
      {data.map(d => (
        <div key={d.label} className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{d.value}</span>
          <div className="w-10 rounded-t transition-all" style={{ height: `${Math.round((d.value / max) * H)}px`, backgroundColor: color }} />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 w-10 text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function BurndownChart({ data, totalTasks }: { data: BurndownResponse["dataPoints"]; totalTasks: number }) {
  if (!data.length) return <div className="text-xs text-gray-400 dark:text-gray-500">Aucune donnée disponible.</div>;

  const W = 500;
  const H = 160;
  const PAD = 32;

  const maxR = Math.max(...data.map(d => d.remaining), totalTasks);
  const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const scaleY = (v: number) => H - PAD - (v / maxR) * (H - PAD * 2);

  const actPoints = data.map((d, i) => `${scaleX(i)},${scaleY(d.remaining)}`).join(" ");
  const idealPoints = [
    `${scaleX(0)},${scaleY(totalTasks)}`,
    `${scaleX(data.length - 1)},${scaleY(0)}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = scaleY(t * maxR);
        return (
          <g key={t}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-700" />
            <text x={PAD - 4} y={y + 4} fontSize="9" textAnchor="end" fill="currentColor" className="text-gray-400 dark:text-gray-600">
              {Math.round(t * maxR)}
            </text>
          </g>
        );
      })}
      {/* Ideal line */}
      <polyline points={idealPoints} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Actual line */}
      <polyline points={actPoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(d.remaining)} r="3" fill="#3b82f6" />
      ))}
      {/* X labels (first and last) */}
      {[0, data.length - 1].map(i => (
        <text key={i} x={scaleX(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="currentColor" className="text-gray-400 dark:text-gray-600">
          {new Date(data[i].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </text>
      ))}
    </svg>
  );
}

/* ─── Main component ──────────────────────────────────────── */

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [projectName, setProjectName] = useState("");
  const [summary, setSummary]         = useState<ProjectSummaryResponse | null>(null);
  const [burndown, setBurndown]       = useState<BurndownResponse | null>(null);
  const [velocity, setVelocity]       = useState<VelocityResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [exportJob, setExportJob]     = useState<ExportJobResponse | null>(null);
  const [exporting, setExporting]     = useState(false);

  const today = new Date();
  const sprintStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
  const sprintEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);

  useEffect(() => {
    Promise.all([
      projectsApi.get(id),
      analyticsApi.summary(id).catch(() => null),
      analyticsApi.burndown(id, sprintStart, sprintEnd).catch(() => null),
      analyticsApi.velocity(id).catch(() => null),
    ]).then(([project, s, b, v]) => {
      setProjectName(project.name);
      setSummary(s);
      setBurndown(b);
      setVelocity(v);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleExport = async (format: "CSV" | "JSON") => {
    setExporting(true);
    try {
      const job = await analyticsApi.export.create(id, format);
      setExportJob(job);
      // Poll until DONE
      const poll = async () => {
        const updated = await analyticsApi.export.status(job.jobId);
        setExportJob(updated);
        if (updated.status === "PENDING" || updated.status === "PROCESSING") {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 2000);
    } finally { setExporting(false); }
  };

  const tabs = [
    { name: "Kanban",     href: `/dashboard/projects/${id}/kanban`,   icon: Trello },
    { name: "Backlog",    href: `/dashboard/projects/${id}/backlog`,  icon: ListChecks },
    { name: "Gantt",      href: `/dashboard/projects/${id}/gantt`,    icon: GanttChartSquare },
    { name: "Analytics",  href: `/dashboard/projects/${id}/analytics`, icon: BarChart2, active: true },
    { name: "Membres",    href: `/dashboard/projects/${id}/members`,  icon: Users },
    { name: "Paramètres", href: `/dashboard/projects/${id}/settings`, icon: Settings },
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
          <h1 className="text-base font-black text-gray-900 dark:text-gray-100">Analytics · {projectName || "Chargement…"}</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleExport("CSV")} disabled={exporting}
              className="btn-outline py-1.5 px-4 text-sm flex items-center gap-1.5 disabled:opacity-60">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" onClick={() => handleExport("JSON")} disabled={exporting}
              className="btn-outline py-1.5 px-4 text-sm flex items-center gap-1.5 disabled:opacity-60">
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
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

      <main className="flex-1 overflow-y-auto p-6 bg-[#f4f5f7] dark:bg-gray-900">
        {/* Export job status */}
        {exportJob && (
          <div className={`mb-4 px-4 py-3 rounded-lg border text-sm font-semibold flex items-center gap-2 ${
            exportJob.status === "DONE" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400" :
            exportJob.status === "FAILED" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400" :
            "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
          }`}>
            {exportJob.status === "PENDING" || exportJob.status === "PROCESSING"
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Export en cours…</>
              : exportJob.status === "DONE"
              ? <><CheckCircle className="w-4 h-4" /> Export terminé ·{" "}
                  <a href={analyticsApi.export.downloadUrl(exportJob.jobId)} target="_blank" rel="noreferrer"
                    className="underline">Télécharger</a></>
              : <><AlertCircle className="w-4 h-4" /> Échec de l&apos;export</>
            }
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-xl animate-pulse border border-gray-200 dark:border-gray-700" />
            ))}
          </div>
        ) : summary ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total tâches",      value: summary.totalTasks,      icon: ListChecks,    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
                { label: "Terminées",         value: summary.completedTasks,  icon: CheckCircle,   color: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
                { label: "En cours",          value: summary.inProgressTasks, icon: Clock,         color: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
                { label: "En retard",         value: summary.overdueCount,    icon: AlertCircle,   color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
              ].map(card => (
                <div key={card.label} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">{card.label}</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              {/* Completion donut */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center gap-4">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide self-start">Taux de complétion</h3>
                <DonutChart value={summary.completedTasks} total={summary.totalTasks} color="#22c55e" label="Terminé" />
                <div className="w-full space-y-2 text-sm">
                  {[
                    { label: "À faire",      value: summary.todoTasks,       color: "#9ca3af" },
                    { label: "En cours",     value: summary.inProgressTasks, color: "#3b82f6" },
                    { label: "En revue",     value: summary.inReviewTasks,   color: "#8b5cf6" },
                    { label: "Bloqué",       value: summary.blockedTasks,    color: "#ef4444" },
                    { label: "Terminé",      value: summary.completedTasks,  color: "#22c55e" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{row.label}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{row.value}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right">
                        {summary.totalTasks > 0 ? `${Math.round((row.value / summary.totalTasks) * 100)}%` : "0%"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Velocity */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-1">Vélocité</h3>
                {velocity ? (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Moyenne : <strong className="text-gray-900 dark:text-gray-100">{velocity.averageVelocity.toFixed(1)}</strong> tâches/sprint
                    </p>
                    <BarChartSVG
                      data={velocity.sprints.slice(-6).map(s => ({ label: s.label, value: s.completedTasks }))}
                      color="#3b82f6"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                    <TrendingUp className="w-8 h-8 mb-2" />
                    <p className="text-xs">Données insuffisantes</p>
                  </div>
                )}
              </div>

              {/* Members stats */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-4">Résumé équipe</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Membres actifs</span>
                    <span className="font-black text-gray-900 dark:text-gray-100">{summary.memberCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Tâches/membre</span>
                    <span className="font-black text-gray-900 dark:text-gray-100">
                      {summary.memberCount > 0 ? (summary.totalTasks / summary.memberCount).toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Complétion</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">{Math.round(summary.completionRate)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${summary.completionRate}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Burndown chart */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-wide">Burndown Chart</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sprint : {sprintStart} → {sprintEnd}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-blue-500 rounded" />
                    Réel
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 bg-gray-400 rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 4px, transparent 4px, transparent 8px)" }} />
                    Idéal
                  </div>
                </div>
              </div>
              {burndown ? (
                <BurndownChart data={burndown.dataPoints} totalTasks={burndown.totalTasks} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                  <BarChart2 className="w-10 h-10 mb-2" />
                  <p className="text-sm">Aucune donnée de burndown disponible pour ce sprint.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <BarChart2 className="w-12 h-12 mb-3" />
            <p className="text-sm font-semibold">Aucune donnée analytique disponible.</p>
            <p className="text-xs mt-1">Créez des tâches dans ce projet pour voir apparaître les statistiques.</p>
          </div>
        )}
      </main>
    </div>
  );
}
