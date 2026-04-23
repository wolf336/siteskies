import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { User, Mail, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSection() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await base44.functions.invoke('deleteAccount', {});
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Account deleted. Signing you out...');
      setTimeout(() => base44.auth.logout('/'), 1500);
    } catch (err) {
      toast.error('Failed to delete account: ' + (err?.message || 'Unknown error'));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Account Info</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Your profile details.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground">Full name</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.email || '—'}</p>
                <p className="text-xs text-muted-foreground">Email address</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={() => { setConfirmText(''); setDialogOpen(true); }}
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <span className="block">This action is <strong>permanent and cannot be undone</strong>. All of your data will be deleted, including:</span>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>All your projects and weather forecasts</li>
                <li>Your subscription (any active subscription will be canceled immediately)</li>
                <li>Your team memberships</li>
              </ul>
              <span className="block text-xs text-muted-foreground pt-2">
                Note: billing records (past invoices and transactions) are retained by our payment processor for tax and audit purposes.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-foreground">delete</strong> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="delete"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'delete' || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}