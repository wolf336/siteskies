import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCircle, Users, CreditCard, BarChart2, Scale,
  ArrowLeft, LogOut, ChevronDown, Settings2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const useGroups = (t) => [
  {
    key: 'app',
    label: t('sidebar.appSettings'),
    items: [
      { key: 'app_settings', label: t('sidebar.appSettings'), icon: Settings2 },
    ],
  },
  {
    key: 'account',
    label: t('sidebar.account'),
    items: [
      { key: 'profile', label: t('sidebar.accountInfo'), icon: UserCircle },
      { key: 'team', label: t('sidebar.seats'), icon: Users },
    ],
  },
  {
    key: 'subscription',
    label: t('sidebar.subscription'),
    items: [
      { key: 'billing', label: t('sidebar.billing'), icon: CreditCard },
      { key: 'usage', label: t('sidebar.usage'), icon: BarChart2 },
    ],
  },
  {
    key: 'legal',
    label: t('sidebar.legal'),
    items: [
      { key: 'legal', label: t('sidebar.termsPrivacy'), icon: Scale },
    ],
  },
];

export default function SettingsSidebar({ active, onChange }) {
  const { t } = useTranslation();
  const GROUPS = useGroups(t);
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(GROUPS.map((g) => [g.key, true]))
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleGroup = (key) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  return (
    <div className="w-60 shrink-0">
      <div className="mb-3">
        <Link
        to="/"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {t('nav.backToDashboard')}
        </Link>
      </div>

      <nav className="space-y-2">
        {GROUPS.map((group) => {
          const isOpen = openGroups[group.key];
          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                />
              </button>
              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => onChange(key)}
                      className={`w-full flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                        active === key
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-2 border-t border-border mt-3">
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t('sidebar.logOut')}
          </button>
        </div>
      </nav>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sidebar.logOutTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sidebar.logOutDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>{t('sidebar.logOut')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}