import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CloudSun, LayoutDashboard, FolderPlus, MessageSquare, CreditCard } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";

export default function Layout({ children, currentPageName }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
    { name: "New Project", icon: FolderPlus, page: "NewProject" },
    { name: "Billing", icon: CreditCard, page: "Billing" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CloudSun className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              SiteSkies
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedback</span>
            </button>
          </nav>
          <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} page={currentPageName} />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}