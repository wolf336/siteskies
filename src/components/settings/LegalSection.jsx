import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, FileText, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LegalSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{t('legal.title')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('legal.subtitle')}</p>
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
              <span className="text-sm font-medium text-foreground">{t('legal.termsOfService')}</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </a>
          <a
            href="https://siteskies.lovable.app/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-secondary transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t('legal.privacyPolicy')}</span>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}