import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { User, Mail, Trash2, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function ProfileSection() {
  const { t } = useTranslation();
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
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
        <h2 className="text-xl font-semibold text-foreground">{t('profile.title')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('profile.subtitle')}</p>
      </div>
      {isLoading ?
      <Skeleton className="h-28 rounded-xl" /> :

      <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.full_name || '—'}</p>
                
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.email || '—'}</p>
                
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  if (!user?.email) return;
                  await base44.auth.resetPasswordRequest(user.email);
                  toast.success('Password reset email sent! Check your inbox.');
                }}>
                <KeyRound className="h-4 w-4" />
                {t('profile.changePassword')}
              </Button>
              <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              onClick={() => {setConfirmText('');setDialogOpen(true);}}>
                <Trash2 className="h-4 w-4" />
                {t('profile.deleteAccount')}
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('profile.deleteTitle')}</DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <span className="block" dangerouslySetInnerHTML={{ __html: t('profile.deleteWarning') }} />
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>{t('profile.deleteItem1')}</li>
                <li>{t('profile.deleteItem2')}</li>
                <li>{t('profile.deleteItem3')}</li>
              </ul>
              <span className="block text-xs text-muted-foreground pt-2">
                {t('profile.deleteNote')}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              <span dangerouslySetInnerHTML={{ __html: t('profile.deleteConfirmPrompt') }} />
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t('profile.deleteConfirmPlaceholder')}
              autoFocus />
            
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={deleting}>
              {t('profile.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== t('profile.deleteConfirmWord') || deleting}
              onClick={handleDeleteAccount}>
              
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('profile.deleteMyAccount')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}