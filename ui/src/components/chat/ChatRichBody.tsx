import { useMemo } from 'react';

import { ChatMapLinkCard } from '@/components/chat/ChatMapLinkCard';
import { ChatUrlLinkCard } from '@/components/chat/ChatUrlLinkCard';
import { parseChatRichBlocks, type ChatRichSegment } from '@/lib/chat/parseChatRichBlocks';
import { cn } from '@/lib/utils';

type Props = {
  text: string;
  outbound?: boolean;
  /** Skip tall map embeds — use compact map chips (voice captions / tight UI). */
  compactMaps?: boolean;
  className?: string;
};

function RichSegments({ segments, outbound }: { segments: ChatRichSegment[]; outbound: boolean }) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>;
        }
        return (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'break-words underline underline-offset-2',
              outbound
                ? 'text-primary-foreground decoration-primary-foreground/50'
                : 'text-primary decoration-primary/40'
            )}
          >
            {seg.text}
          </a>
        );
      })}
    </>
  );
}

export function ChatRichBody({ text, outbound = false, compactMaps = false, className }: Props) {
  const blocks = useMemo(() => parseChatRichBlocks(text), [text]);

  return (
    <div className={cn('space-y-2 break-words text-sm leading-relaxed', className)}>
      {blocks.map((block, i) => {
        if (block.type === 'mapLink') {
          return (
            <ChatMapLinkCard
              key={`map-${i}`}
              href={block.href}
              lat={block.lat}
              lng={block.lng}
              label={block.label}
              outbound={outbound}
              compact={compactMaps}
            />
          );
        }

        if (block.type === 'urlLink') {
          return (
            <ChatUrlLinkCard
              key={`url-${i}`}
              href={block.href}
              title={block.title}
              subtitle={block.subtitle}
              variant={block.variant}
              outbound={outbound}
              className={
                compactMaps
                  ? outbound
                    ? undefined
                    : 'border-white/15 bg-white/5 text-[#F5F2EA] [&_span]:text-[#F5F2EA]/70'
                  : undefined
              }
            />
          );
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={`list-${i}`}
              className={cn('my-0.5 space-y-1 pl-4', block.ordered ? 'list-decimal' : 'list-disc')}
            >
              {block.items.map((item, j) => (
                <li key={j} className="pl-0.5">
                  <RichSegments segments={item} outbound={outbound} />
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`p-${i}`} className="whitespace-pre-wrap">
            <RichSegments segments={block.segments} outbound={outbound} />
          </p>
        );
      })}
    </div>
  );
}
