import React from 'react';
import { BarChart2, CreditCard, Users, User } from 'lucide-react';

const sections = [
  { key: 'usage', label: 'Usage', icon: BarChart2 },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'team', label: 'Team Members', icon: Users },
  { key: 'profile', label: 'Account Info', icon: User },
];

export default function AccountSidebar({ active, onChange }) {
  return (
    <div className="w-56 shrink-0">
      <nav className="space-y-0.5">
        {sections.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              active === key
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}