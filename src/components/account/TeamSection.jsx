import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import TeamMembersList from '@/components/billing/TeamMembersList';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeamSection() {
  const { data, isLoading } = useSubscription();
  const subscription = data?.subscription;
  const teamMembers = data?.teamMembers || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Seats</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Invite people to your plan. Each seat is a separate SiteSkies account covered by your subscription.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <TeamMembersList subscription={subscription} teamMembers={teamMembers} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}