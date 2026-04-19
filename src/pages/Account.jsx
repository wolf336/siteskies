import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { base44 } from '@/api/base44Client';
import AccountSidebar from '@/components/account/AccountSidebar';
import UsageOverview from '@/components/account/UsageOverview';
import BillingSection from '@/components/account/BillingSection';
import TeamSection from '@/components/account/TeamSection';
import ProfileSection from '@/components/account/ProfileSection';

export default function Account() {
  const [activeSection, setActiveSection] = useState('usage');
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
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-8 max-w-5xl">
      <AccountSidebar active={activeSection} onChange={setActiveSection} />
      <div className="flex-1 min-w-0">
        {renderSection()}
      </div>
    </div>
  );
}