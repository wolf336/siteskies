import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { base44 } from '@/api/base44Client';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import UsageOverview from '@/components/account/UsageOverview';
import BillingSection from '@/components/account/BillingSection';
import TeamSection from '@/components/account/TeamSection';
import ProfileSection from '@/components/account/ProfileSection';
import LegalSection from '@/components/settings/LegalSection';
import AcceptInviteBanner from '@/components/settings/AcceptInviteBanner';
import AppSettingsSection from '@/components/settings/AppSettingsSection';

export default function Settings() {
  const initialSection = (() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('section');
    return ['app_settings', 'profile', 'team', 'billing', 'usage', 'legal'].includes(s) ? s : 'app_settings';
  })();

  const [activeSection, setActiveSection] = useState(initialSection);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  const { data } = useSubscription(isAuthenticated);

  const subscription = data?.subscription;
  const teamMembers = data?.teamMembers || [];
  const projectCount = data?.projectCount || 0;

  const renderSection = () => {
    switch (activeSection) {
      case 'app_settings':
        return <AppSettingsSection />;
      case 'usage':
        return (
          <UsageOverview
            subscription={subscription}
            projectCount={projectCount}
            teamMemberCount={teamMembers.length + 1}
          />
        );
      case 'billing':
        return <BillingSection />;
      case 'team':
        return <TeamSection />;
      case 'profile':
        return <ProfileSection />;
      case 'legal':
        return <LegalSection />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <AcceptInviteBanner />
      <div className="flex gap-8">
        <SettingsSidebar active={activeSection} onChange={setActiveSection} />
        <div className="flex-1 min-w-0">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}