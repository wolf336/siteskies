import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCircle, Users, CreditCard, BarChart2, Scale,
  ArrowLeft, LogOut, ChevronDown,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const GROUPS = [
  {
    key: 'account',
    label: 'Account',
    items: [
      { key: 'profile', label: 'Account Info', icon: UserCircle },
      { key: 'team', label: 'Seats', icon: Users },
    ],
  },
  {
    key: 'subscription',
    label: 'Subscription',
    items: [
      { key: 'billing', label: 'Billing', icon: CreditCard },
      { key: 'usage', label: 'Usage', icon: BarChart2 },
    ],
  },
  {
    key: 'legal',
    label: 'Legal',
    items: [
      { key: 'legal', label: 'Terms & Privacy', icon: Scale },
    ],
  },
];

export default function SettingsSidebar({ active, onChange }) {
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
          Back to Dashboard
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
            Log Out
          </button>
        </div>
      </nav>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be signed out of your SiteSkies account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}