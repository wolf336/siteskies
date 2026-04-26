import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Lightbulb, Bug } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function FeedbackModal({ open, onClose, page = "Dashboard" }) {
  const { t } = useTranslation();
  const feedbackTypes = [
    { value: "positive", label: t('feedback.positive'), icon: ThumbsUp },
    { value: "suggestion", label: t('feedback.suggestion'), icon: Lightbulb },
    { value: "bug", label: t('feedback.bug'), icon: Bug },
    { value: "negative", label: t('feedback.negative'), icon: ThumbsDown },
  ];
  const [type, setType] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.Feedback.create({
        message,
        type,
        page,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
      toast.success(t('feedback.successToast'));
      setMessage("");
      setType(null);
      onClose();
    } catch (err) {
      console.error("Feedback submission failed:", err);
      toast.error("Couldn't send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('feedback.title')}</DialogTitle>
          <DialogDescription>{t('feedback.subtitle')}</DialogDescription>
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
          placeholder={t('feedback.placeholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-28 resize-none mt-1"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('feedback.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!message.trim() || submitting}>
            {submitting ? t('feedback.sending') : t('feedback.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}