import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, CloudSun, FolderOpen, List, LayoutGrid, Table2, CalendarDays, RefreshCw, Loader2, MessageSquare } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal.jsx";
import { motion, AnimatePresence } from "framer-motion";
import ProjectCard from "@/components/projects/ProjectCard.jsx";
import ProjectGrid from "@/components/projects/ProjectGrid.jsx";
import ProjectTable from "@/components/projects/ProjectTable.jsx";
import ProjectCalendar from "@/components/projects/ProjectCalendar.jsx";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list");
  const [syncing, setSyncing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: syncSetting } = useQuery({
    queryKey: ["lastBulkSync"],
    queryFn: async () => {
      const results = await base44.entities.AppSetting.filter({ key: "last_bulk_weather_sync" });
      if (results.length > 0) {
        return JSON.parse(results[0].value);
      }
      return null;
    },
  });

  const handleBulkSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("bulkUpdateWeather", {});
      const { successCount, failed, totalEligible } = res.data;

      if (failed.length === 0) {
        toast.success(`All ${successCount} eligible project${successCount !== 1 ? "s" : ""} synced successfully.`);
      } else {
        toast.error(
          `${successCount} of ${totalEligible} projects synced. ${failed.length} failed:\n${failed.map(f => `• ${f.name}: ${f.reason}`).join("\n")}`,
          { duration: 8000 }
        );
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["lastBulkSync"] });
    } catch (err) {
      toast.error(`Sync failed: ${err?.message || "Unknown error"}`, { duration: 5000 });
    }
    setSyncing(false);
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase());

    if (filter === "all") return matchesSearch;
    if (filter === "active")
      return matchesSearch && ["planning", "monitoring", "ready", "in_progress"].includes(p.status);
    if (filter === "attention")
      return matchesSearch && (p.weather_signal === "caution" || p.weather_signal === "postpone");
    if (filter === "completed") return matchesSearch && p.status === "completed";
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track weather conditions for your upcoming projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Feedback
          </button>
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleBulkSync}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Syncing..." : "Sync all projects"}
            </Button>
            {syncSetting?.synced_at && (
              <p className="text-xs text-muted-foreground">
                Last synced {formatDistanceToNow(new Date(syncSetting.synced_at), { addSuffix: true })}
                {syncSetting.failed_count > 0 && (
                  <span className="text-destructive ml-1">({syncSetting.failed_count} failed)</span>
                )}
              </p>
            )}
          </div>
          <Link to={createPageUrl("NewProject")}>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters + View switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-muted">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="attention">Needs Attention</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {/* View switcher */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/30 self-start sm:self-auto">
          {[
            { key: 'list', icon: List },
            { key: 'grid', icon: LayoutGrid },
            { key: 'table', icon: Table2 },
            { key: 'calendar', icon: CalendarDays },
          ].map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`p-1.5 rounded transition-colors ${view === key ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
            {projects.length === 0 ? (
              <CloudSun className="h-7 w-7 text-muted-foreground" />
            ) : (
              <FolderOpen className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {projects.length === 0 ? "No projects yet" : "No matching projects"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {projects.length === 0
              ? "Create your first project to start tracking weather."
              : "Try adjusting your filters or search."}
          </p>
          {projects.length === 0 && (
            <Link to={createPageUrl("NewProject")}>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {view === 'list' && (
            <motion.div className="grid gap-3" layout>
              <AnimatePresence>
                {filtered.map((project) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    layout
                  >
                    <ProjectCard project={project} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
          {view === 'grid' && <ProjectGrid projects={filtered} />}
          {view === 'table' && <ProjectTable projects={filtered} />}
          {view === 'calendar' && <ProjectCalendar projects={filtered} />}
        </>
      )}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} page="Dashboard" />
    </div>
  );
}