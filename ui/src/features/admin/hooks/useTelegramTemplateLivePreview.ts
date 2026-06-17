import { useQuery } from '@tanstack/react-query';
import {
  fetchTelegramDraftPreview,
  type TelegramPreviewContext,
} from '@/features/admin/lib/telegramDraftPreviewApi';

export function useTelegramTemplateLivePreview(
  text: string,
  previewContext: TelegramPreviewContext | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'telegram-draft-preview',
      previewContext?.bot,
      previewContext?.scenario,
      previewContext?.checkInYmd,
      previewContext?.checkOutYmd,
      text,
    ],
    queryFn: () => fetchTelegramDraftPreview(text, previewContext!),
    enabled: enabled && !!previewContext && !!text.trim(),
    retry: false,
    staleTime: 30_000,
  });
}
