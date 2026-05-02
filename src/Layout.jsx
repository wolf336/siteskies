import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare, Settings } from "lucide-react";
import FeedbackModal from "@/components/FeedbackModal";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useSubscription();
  const currentSubscription = subscriptionData?.subscription;

  // Cache tier in localStorage so the button shows immediately on reload
  const cachedTier = localStorage.getItem("siteskies_subscription_tier");
  if (currentSubscription?.tier) {
    localStorage.setItem("siteskies_subscription_tier", currentSubscription.tier);
  }
  const effectiveTier = currentSubscription?.tier ?? cachedTier;
  const isFreeTier = effectiveTier === "free";
  const navItems = [
    { name: t('nav.settings'), icon: Settings, page: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2.5">
            <img src="https://media.base44.com/images/public/69aada1cbc0882d69fc03625/2635735c5_logoroundend1024x1024.png" alt="SiteSkies logo" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              SiteSkies
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {isFreeTier && (
              <Link
                to={createPageUrl("Settings") + "?section=billing"}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {t('nav.upgradeNow')}
              </Link>
            )}
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
              <span className="hidden sm:inline">{t('nav.feedback')}</span>
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