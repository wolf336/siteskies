import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Lightbulb, Bug } from "lucide-react";
import { toast } from "sonner";

const feedbackTypes = [
  { value: "positive", label: "Positive", icon: ThumbsUp },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb },
  { value: "bug", label: "Bug", icon: Bug },
  { value: "negative", label: "Negative", icon: ThumbsDown },
];

export default function FeedbackModal({ open, onClose, page = "Dashboard" }) {
  const [type, setType] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await base44.entities.Feedback.create({ message, type, page });
    toast.success("Thanks for your feedback!");
    setSubmitting(false);
    setMessage("");
    setType("suggestion");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Feedback</DialogTitle>
          <DialogDescription>Help us improve SiteSkies by sharing your thoughts.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mt-1">
          {feedbackTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={`flex-1 flex flex-col items-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors ${
                type === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Tell us what's on your mind..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-28 resize-none mt-1"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!message.trim() || submitting}>
            {submitting ? "Sending..." : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}