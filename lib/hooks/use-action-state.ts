'use client';

import { useCallback, useState, useTransition } from 'react';

export function useActionState<T extends { error?: string }, D = FormData>(
  action: (data: D) => Promise<T>,
  initialState: T
) {
  const [state, setState] = useState<T>(initialState);
  const [isPending, startTransition] = useTransition();

  const formAction = useCallback(
    async (data: D) => {
      startTransition(async () => {
        try {
          const result = await action(data);
          setState(result);
        } catch (error) {
          setState({
            ...initialState,
            error: error instanceof Error ? error.message : '操作失败',
          });
        }
      });
    },
    [action, initialState]
  );

  return [state, formAction, isPending] as const;
} 