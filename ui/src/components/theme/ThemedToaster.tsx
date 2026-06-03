import { Toaster } from 'sonner';
import { useTheme } from '@/components/theme/ThemeProvider';

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      position="top-center"
      expand
      closeButton
      duration={7000}
      visibleToasts={5}
      gap={8}
      offset={16}
      icons={{
        success: null,
        error: null,
        warning: null,
        info: null,
      }}
      toastOptions={{
        duration: 7000,
        style: {
          maxWidth: 'min(500px, calc(100vw - 32px))',
          padding: '14px 42px 14px 18px',
          fontSize: '15px',
          borderRadius: '12px',
        },
        className: 'shadow-lg',
        descriptionClassName:
          'text-[14px] font-semibold leading-relaxed text-muted-foreground',
      }}
    />
  );
}
