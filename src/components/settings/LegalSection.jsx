import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, FileText, Shield } from 'lucide-react';

export default function LegalSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Legal</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Terms of service and privacy policy.</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-secondary transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Terms of Service</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-secondary transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Privacy Policy</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}