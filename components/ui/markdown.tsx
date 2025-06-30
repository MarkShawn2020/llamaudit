'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn('prose dark:prose-invert whitespace-pre-wrap text-sm', className)}>
      {children}
    </div>
  );
}
