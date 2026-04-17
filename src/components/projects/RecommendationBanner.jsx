import React from "react";
import { Sun, TriangleAlert, CloudRain, Hourglass } from "lucide-react";
import { motion } from "framer-motion";

const config = {
  proceed: {
    icon: Sun,
    title: "Good to Go",
    bg: "bg-success/10 border-success/25",
    iconBg: "bg-success/20",
    iconColor: "text-success",
    textColor: "text-success",
  },
  caution: {
    icon: TriangleAlert,
    title: "Proceed with Caution",
    bg: "bg-warning/10 border-warning/25",
    iconBg: "bg-warning/20",
    iconColor: "text-warning",
    textColor: "text-warning",
  },
  postpone: {
    icon: CloudRain,
    title: "Postponement Recommended",
    bg: "bg-destructive/10 border-destructive/25",
    iconBg: "bg-destructive/20",
    iconColor: "text-destructive",
    textColor: "text-destructive",
  },
  pending: {
    icon: Hourglass,
    title: "Awaiting Forecast",
    bg: "bg-muted border-border",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    textColor: "text-muted-foreground",
  },
};

export default function RecommendationBanner({ weather_signal, weather_signal_details }) {
  const c = config[weather_signal || "pending"];
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-5 ${c.bg}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
          <Icon className={`h-5 w-5 ${c.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-base font-semibold ${c.textColor}`}>{c.title}</h3>
          {weather_signal_details && (
            <p className="mt-1 text-sm text-foreground/70 leading-relaxed">{weather_signal_details}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}