import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppSettingsSection() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  const setLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('appSettings.title')}</h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{t('appSettings.language')}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t('appSettings.languageDescription')}</p>
        <div className="flex gap-2 pt-1">
          <Button
            variant={currentLang === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('en')}
          >
            🇬🇧 {t('appSettings.english')}
          </Button>
          <Button
            variant={currentLang === 'de' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('de')}
          >
            🇩🇪 {t('appSettings.german')}
          </Button>
        </div>
      </div>
    </div>
  );
}