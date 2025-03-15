interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function toast(options: ToastOptions) {
  // 简单实现，你可以替换为更复杂的 toast 库
  console.log(`[${options.variant || 'default'}] ${options.title}: ${options.description || ''}`)
} 