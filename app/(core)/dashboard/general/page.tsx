'use client';

import { updateAccount } from '@/app/(login)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/lib/auth';
import { useActionState } from '@/lib/hooks/use-action-state';
import { Loader2 } from 'lucide-react';
import { startTransition } from 'react';

type ActionState = {
  error?: string;
  success?: string;
};

export default function GeneralPage() {
  const { user } = useUser();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    { error: '', success: '' }
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(() => {
      formAction(new FormData(event.currentTarget));
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>账户设置</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name || ''}
                placeholder="请输入您的名称"
              />
            </div>
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                disabled
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存更改
            </Button>
            {state.error && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}
            {state.success && (
              <p className="text-sm text-green-500">{state.success}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
