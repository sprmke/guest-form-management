import {
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Home,
  Image,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  PawPrint,
  Receipt,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import {
  HOST_TOUR_CHAPTER_FRAMES,
  hostTourChapters,
} from '@/features/guest/marketing/for-hosts/data/hostTourChapters';

import {
  PLATFORM_APP_NAME,
  platformMarkInitial,
  platformWordmarkParts,
} from '@/lib/platformBranding';
import { cn } from '@/lib/utils';

const filmWordmark = platformWordmarkParts();
const filmMarkInitial = platformMarkInitial();
const filmPublishLabel = PLATFORM_APP_NAME || 'Your brand';
const filmAlertsLabel = PLATFORM_APP_NAME ? `${PLATFORM_APP_NAME} · Alerts` : 'Alerts';
const filmAutomationTagline = PLATFORM_APP_NAME
  ? `You approve the decisions. ${PLATFORM_APP_NAME} handles the repetition.`
  : 'You approve the decisions. The platform handles the repetition.';


const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Bookings', icon: CalendarDays },
  { label: 'Guest Inbox', icon: Inbox },
  { label: 'Finance', icon: CircleDollarSign },
  { label: 'Pricing', icon: TrendingUp },
  { label: 'Marketing', icon: Megaphone },
  { label: 'Maintenance', icon: Wrench },
];

interface FilmShellProps {
  activeLabel: string;
  children: React.ReactNode;
}

function FilmShell({ activeLabel, children }: FilmShellProps) {
  return (
    <AbsoluteFill className="bg-[#f4f7f8] text-slate-950">
      <div className="flex h-full">
        <aside className="flex w-[218px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-lg font-black text-white shadow-lg shadow-teal-600/20">
              {filmMarkInitial || '·'}
            </div>
            <div>
              {filmWordmark ? (
                <p className="text-[17px] font-extrabold tracking-tight">
                  {filmWordmark.primary}
                  {filmWordmark.accent ? (
                    <span className="text-teal-600">{filmWordmark.accent}</span>
                  ) : null}
                </p>
              ) : (
                <p className="text-[17px] font-extrabold tracking-tight">Host workspace</p>
              )}
              {filmWordmark ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Host workspace
                </p>
              ) : null}
            </div>
          </div>

          <nav className="space-y-1.5">
            {sidebarItems.map((item) => {
              const active = item.label === activeLabel;
              return (
                <div
                  key={item.label}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold',
                    active ? 'bg-teal-50 text-teal-700' : 'text-slate-500'
                  )}
                >
                  <item.icon className="h-[17px] w-[17px]" />
                  {item.label}
                  {active ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-teal-100 bg-teal-50/70 p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-bold text-teal-800">Automation live</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-teal-100">
              <div className="h-full w-[82%] rounded-full bg-teal-500" />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-[68px] items-center border-b border-slate-200 bg-white/95 px-7">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Azure North
              </p>
              <p className="text-sm font-bold text-slate-700">Monaco 2604</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                All systems synced
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200">
                <Bell className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                M
              </div>
            </div>
          </header>
          <div className="h-[652px] overflow-hidden p-7">{children}</div>
        </main>
      </div>
    </AbsoluteFill>
  );
}

function reveal(frame: number, delay = 0, distance = 16) {
  const progress = spring({
    frame: frame - delay,
    fps: 30,
    config: { damping: 18, stiffness: 120 },
  });
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * distance}px)`,
  };
}

function countTo(frame: number, value: number, delay = 0) {
  return Math.round(
    interpolate(frame, [delay, delay + 55], [0, value], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    })
  );
}

function SceneHeading({ chapterIndex }: { chapterIndex: number }) {
  const frame = useCurrentFrame();
  const chapter = hostTourChapters[chapterIndex];
  return (
    <div className="mb-5 flex items-end justify-between" style={reveal(frame)}>
      <div>
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-teal-600">
          {chapter?.eyebrow}
        </p>
        <h2 className="text-[27px] font-extrabold tracking-tight text-slate-950">
          {chapter?.title}
        </h2>
      </div>
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500">
        Live workspace
      </span>
    </div>
  );
}

function OverviewScene() {
  const frame = useCurrentFrame();
  const stats = [
    {
      label: 'Net profit',
      value: `₱${countTo(frame, 184650, 8).toLocaleString()}`,
      delta: '+12.4%',
    },
    { label: 'Occupied nights', value: `${countTo(frame, 24, 16)}`, delta: '80%' },
    { label: 'Active bookings', value: `${countTo(frame, 18, 24)}`, delta: '+3' },
    {
      label: 'Avg. nightly rate',
      value: `₱${countTo(frame, 3840, 32).toLocaleString()}`,
      delta: '+6.1%',
    },
  ];

  return (
    <FilmShell activeLabel="Dashboard">
      <SceneHeading chapterIndex={0} />
      <div className="grid grid-cols-4 gap-3.5">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            style={reveal(frame, 8 + index * 8)}
          >
            <p className="text-[11px] font-semibold text-slate-500">{stat.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-[23px] font-black tracking-tight">{stat.value}</p>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                {stat.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[1.55fr_1fr] gap-4">
        <div
          className="h-[330px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          style={reveal(frame, 42)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Cash flow</p>
              <p className="text-[11px] text-slate-400">Last 30 days</p>
            </div>
            <span className="text-xs font-bold text-teal-600">+₱42,800</span>
          </div>
          <div className="mt-8 flex h-[205px] items-end gap-3 border-b border-l border-slate-100 px-4">
            {[38, 62, 48, 78, 55, 87, 72, 94, 68, 100, 84, 112].map((height, index) => {
              const barHeight = interpolate(frame, [45 + index * 3, 90 + index * 3], [0, height], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div key={index} className="flex flex-1 items-end">
                  <div
                    className={cn('w-full rounded-t-md', index > 8 ? 'bg-teal-500' : 'bg-teal-200')}
                    style={{ height: barHeight }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="h-[330px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          style={reveal(frame, 58)}
        >
          <p className="text-sm font-bold">Today</p>
          <div className="mt-4 space-y-3">
            {[
              ['Check-in', 'Kyle Soriano', '2:00 PM'],
              ['Document review', 'Ana Reyes', 'Ready'],
              ['Maintenance', 'AC filter · Unit 4B', '4:30 PM'],
              ['Guest message', 'New reply waiting', 'Now'],
            ].map(([type, name, time], index) => (
              <div
                key={type}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                style={reveal(frame, 64 + index * 8, 8)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                  {index === 3 ? (
                    <MessageSquare className="h-4 w-4 text-teal-600" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-slate-500" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {type}
                  </p>
                  <p className="truncate text-xs font-bold text-slate-700">{name}</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold text-slate-400">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FilmShell>
  );
}

function BookingScene() {
  const frame = useCurrentFrame();
  const activeStep = Math.min(
    3,
    Math.floor(
      interpolate(frame, [22, 150], [0, 4], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    )
  );
  const steps = ['Pending review', 'Pending documents', 'Ready for check-in', 'Completed'];

  return (
    <FilmShell activeLabel="Bookings">
      <SceneHeading chapterIndex={1} />
      <div className="grid grid-cols-[1.45fr_0.8fr] gap-4">
        <div
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          style={reveal(frame, 6)}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 font-black text-teal-700">
              KS
            </div>
            <div>
              <p className="text-sm font-black">Kyle Soriano</p>
              <p className="text-[11px] text-slate-500">Jul 30 – Aug 2 · 4 guests · Facebook</p>
            </div>
            <span className="ml-auto rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">
              Workflow active
            </span>
          </div>
          <div className="py-7">
            {steps.map((step, index) => {
              const complete = index < activeStep;
              const active = index === activeStep;
              return (
                <div key={step} className="relative flex min-h-[72px] gap-4">
                  {index < steps.length - 1 ? (
                    <div
                      className={cn(
                        'absolute left-[17px] top-9 h-[44px] w-0.5',
                        complete ? 'bg-teal-500' : 'bg-slate-200'
                      )}
                    />
                  ) : null}
                  <div
                    className={cn(
                      'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                      complete && 'border-teal-500 bg-teal-500 text-white',
                      active &&
                        'border-teal-500 bg-teal-50 text-teal-700 shadow-lg shadow-teal-500/20',
                      !complete && !active && 'border-slate-200 bg-white text-slate-400'
                    )}
                  >
                    {complete ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="pt-1">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        active ? 'text-teal-700' : 'text-slate-700'
                      )}
                    >
                      {step}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {complete
                        ? 'Completed automatically'
                        : active
                          ? 'Working on this step'
                          : 'Queued'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          {[
            { icon: Receipt, label: 'Receipt validated', sub: 'AI confidence 98%', delay: 24 },
            {
              icon: FileCheck2,
              label: 'GAF approved',
              sub: 'Matched from inbound email',
              delay: 58,
            },
            { icon: PawPrint, label: 'Pet request cleared', sub: 'Document saved', delay: 92 },
            { icon: CalendarDays, label: 'Event updated', sub: 'Event updated', delay: 126 },
          ].map((event) => (
            <div
              key={event.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              style={reveal(frame, event.delay, 24)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <event.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-slate-800">{event.label}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{event.sub}</p>
              </div>
              <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
            </div>
          ))}
        </div>
      </div>
    </FilmShell>
  );
}

function InboxScene() {
  const frame = useCurrentFrame();
  const replyProgress = interpolate(frame, [72, 132], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const reply =
    'Absolutely! Early check-in is available from 12:30 PM. I’ll update your stay details now.';
  const typedReply = reply.slice(0, Math.floor(reply.length * replyProgress));

  return (
    <FilmShell activeLabel="Guest Inbox">
      <SceneHeading chapterIndex={2} />
      <div
        className="grid h-[528px] grid-cols-[0.7fr_1.35fr] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={reveal(frame, 6)}
      >
        <div className="border-r border-slate-200 p-3">
          <div className="mb-3 rounded-xl bg-slate-100 px-3 py-2.5 text-[11px] text-slate-400">
            Search conversations
          </div>
          {[
            ['AR', 'Ana Reyes', 'Can we check in early?', 'Now'],
            ['KS', 'Kyle Soriano', 'Thanks for the details!', '8m'],
            ['MT', 'Mia Tan', 'Parking receipt attached', '24m'],
            ['JL', 'Jon Lim', 'What is the Wi-Fi password?', '1h'],
          ].map(([initials, name, message, time], index) => (
            <div
              key={name}
              className={cn('flex gap-3 rounded-xl p-3', index === 0 && 'bg-teal-50')}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  index === 0 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                )}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-bold">{name}</p>
                  <span className="ml-auto text-[9px] text-slate-400">{time}</span>
                </div>
                <p className="mt-1 truncate text-[10px] text-slate-400">{message}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col bg-slate-50/60">
          <div className="flex h-16 items-center border-b border-slate-200 bg-white px-5">
            <div>
              <p className="text-sm font-black">Ana Reyes</p>
              <p className="text-[10px] text-slate-400">Web chat · Monaco 2604</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
            </span>
          </div>
          <div className="flex-1 space-y-4 p-5">
            <div
              className="max-w-[62%] rounded-2xl rounded-bl-md bg-white p-3.5 text-xs leading-relaxed shadow-sm"
              style={reveal(frame, 18)}
            >
              Hi! Our flight lands early. Is it possible to check in before 2 PM?
            </div>
            <div className="ml-auto max-w-[78%]" style={reveal(frame, 42)}>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-600">
                <Sparkles className="h-3.5 w-3.5" /> AI suggested
              </div>
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs leading-relaxed text-teal-950 shadow-sm">
                {typedReply}
                {frame < 134 ? (
                  <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-teal-600" />
                ) : null}
              </div>
            </div>
          </div>
          <div className="m-4 flex h-12 items-center rounded-xl border border-slate-200 bg-white px-4 text-[11px] text-slate-400">
            Write a reply…
            <button
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white"
              type="button"
              tabIndex={-1}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </FilmShell>
  );
}

function FinanceScene() {
  const frame = useCurrentFrame();
  return (
    <FilmShell activeLabel="Finance">
      <SceneHeading chapterIndex={3} />
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Total income', '₱286,400', '+18.2%', 'text-emerald-700 bg-emerald-50'],
          ['Expenses', '₱71,280', '-4.8%', 'text-rose-700 bg-rose-50'],
          ['Net profit', '₱215,120', '+24.1%', 'text-teal-700 bg-teal-50'],
        ].map(([label, value, delta, tone], index) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            style={reveal(frame, index * 8)}
          >
            <p className="text-[11px] font-semibold text-slate-500">{label}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[25px] font-black">{value}</p>
              <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', tone)}>
                {delta}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[1.25fr_1fr] gap-4">
        <div
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          style={reveal(frame, 30)}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Income vs expenses</p>
            <div className="flex gap-3 text-[10px] font-semibold text-slate-500">
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-500" />
                Income
              </span>
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300" />
                Expenses
              </span>
            </div>
          </div>
          <div className="mt-7 flex h-[220px] items-end gap-5 border-b border-slate-100 px-4">
            {[68, 82, 62, 105, 94, 126, 114].map((height, index) => (
              <div key={index} className="flex flex-1 items-end justify-center gap-1.5">
                <div
                  className="w-5 rounded-t bg-teal-500"
                  style={{
                    height: interpolate(frame, [38 + index * 4, 88 + index * 4], [0, height], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    }),
                  }}
                />
                <div
                  className="w-5 rounded-t bg-slate-200"
                  style={{
                    height: interpolate(
                      frame,
                      [45 + index * 4, 95 + index * 4],
                      [0, height * 0.42],
                      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    ),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <div
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          style={reveal(frame, 48)}
        >
          <p className="text-sm font-bold">Recent activity</p>
          <div className="mt-4 divide-y divide-slate-100">
            {[
              ['Monaco 2604 · Kyle', 'Stay income', '+₱18,500'],
              ['Electricity', 'Utilities', '−₱3,820'],
              ['Parking settlement', 'Operations', '−₱800'],
              ['Azure North · Ana', 'Stay income', '+₱14,900'],
            ].map(([name, category, amount], index) => (
              <div
                key={name}
                className="flex items-center py-3.5"
                style={reveal(frame, 60 + index * 8, 8)}
              >
                <span
                  className={cn(
                    'mr-3 flex h-8 w-8 items-center justify-center rounded-lg',
                    amount.startsWith('+')
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  <Receipt className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-bold">{name}</p>
                  <p className="text-[9px] text-slate-400">{category}</p>
                </div>
                <span
                  className={cn(
                    'ml-auto text-xs font-black',
                    amount.startsWith('+') ? 'text-emerald-600' : 'text-slate-700'
                  )}
                >
                  {amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FilmShell>
  );
}

function PricingScene() {
  const frame = useCurrentFrame();
  const selected = Math.min(
    4,
    Math.floor(
      interpolate(frame, [30, 145], [0, 5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    )
  );
  return (
    <FilmShell activeLabel="Pricing">
      <SceneHeading chapterIndex={4} />
      <div className="grid grid-cols-[1.45fr_0.65fr] gap-4">
        <div
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          style={reveal(frame, 6)}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-black">August 2026</p>
              <p className="text-[10px] text-slate-400">Monaco 2604 nightly rates</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500">
              Month view
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="pb-1 text-center text-[9px] font-bold uppercase text-slate-400"
              >
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, index) => {
              const date = index + 1;
              const booked = [4, 5, 6, 18, 19, 20].includes(date);
              const highlighted = index >= 10 && index <= 10 + selected;
              return (
                <div
                  key={date}
                  className={cn(
                    'relative h-[65px] rounded-xl border p-2',
                    booked
                      ? 'border-slate-200 bg-slate-100'
                      : highlighted
                        ? 'border-teal-400 bg-teal-50 shadow-sm'
                        : 'border-slate-100 bg-white'
                  )}
                >
                  <span className="text-[9px] font-bold text-slate-500">{date}</span>
                  <p
                    className={cn(
                      'mt-2 text-[10px] font-black',
                      highlighted
                        ? 'text-teal-700'
                        : booked
                          ? 'text-slate-400 line-through'
                          : 'text-slate-700'
                    )}
                  >
                    {date % 6 === 0 ? '₱4,299' : date % 5 === 0 ? '₱3,899' : '₱2,799'}
                  </p>
                  {booked ? (
                    <span className="absolute bottom-1.5 left-2 text-[8px] font-bold text-slate-400">
                      Booked
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-3" style={reveal(frame, 34)}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black">Rate settings</p>
            <div className="mt-4 space-y-4">
              {[
                ['Weekday', '₱2,799'],
                ['Weekend', '₱3,899'],
                ['Holiday premium', '+18%'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="mb-1.5 text-[10px] font-semibold text-slate-400">{label}</p>
                  <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            className="flex items-center gap-3 rounded-2xl bg-teal-600 p-4 text-white shadow-lg shadow-teal-600/20"
            style={reveal(frame, 116)}
          >
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <p className="text-xs font-black">Rates updated</p>
              <p className="text-[9px] text-teal-100">Pricing calendar is live</p>
            </div>
          </div>
        </div>
      </div>
    </FilmShell>
  );
}

function MarketingScene() {
  const frame = useCurrentFrame();
  const stage = Math.min(
    3,
    Math.floor(
      interpolate(frame, [18, 152], [0, 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    )
  );
  const stages = ['Plan', 'Design', 'Edit', 'Publish'];
  return (
    <FilmShell activeLabel="Marketing">
      <SceneHeading chapterIndex={5} />
      <div
        className="rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-xl"
        style={reveal(frame, 6)}
      >
        <div className="mb-4 flex items-center gap-2 text-white">
          {stages.map((label, index) => (
            <div
              key={label}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-lg text-[11px] font-bold transition-colors',
                index === stage
                  ? 'bg-teal-500 text-white'
                  : index < stage
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'bg-white/5 text-slate-500'
              )}
            >
              {index < stage ? <Check className="mr-1.5 h-3.5 w-3.5" /> : null}
              {label}
            </div>
          ))}
        </div>
        <div className="grid h-[410px] grid-cols-[0.62fr_1.45fr_0.72fr] gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Content calendar
            </p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    'aspect-square rounded-md border',
                    index === stage + 4
                      ? 'border-teal-400 bg-teal-400/20'
                      : 'border-white/10 bg-white/5'
                  )}
                >
                  {index === stage + 4 ? (
                    <Image className="m-auto mt-2.5 h-4 w-4 text-teal-300" />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2 rounded bg-white/10" />
              <div className="h-2 w-4/5 rounded bg-white/10" />
              <div className="h-2 w-3/5 rounded bg-white/10" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-700 via-slate-800 to-slate-950 p-7 text-white">
            <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-teal-400/20 blur-2xl" />
            <div className="relative flex h-full flex-col justify-between rounded-2xl border border-white/15 bg-white/10 p-7 backdrop-blur">
              <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em]">
                Weekend escape
              </span>
              <div>
                <p className="max-w-[420px] text-[32px] font-black leading-[1.05] tracking-tight">
                  Your next quiet weekend is closer than you think.
                </p>
                <p className="mt-3 text-xs text-white/65">Monaco 2604 · Azure North</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-teal-300"
                    style={{
                      width: `${interpolate(frame, [60, 148], [5, 92], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-bold text-white/60">00:12</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Publish</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-teal-500" />
                <div>
                  <p className="text-[10px] font-bold">{filmPublishLabel}</p>
                  <p className="text-[8px] text-slate-500">Property post</p>
                </div>
              </div>
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-teal-500/40 to-indigo-500/30" />
              <div className="mt-3 h-2 rounded bg-white/10" />
              <div className="mt-1.5 h-2 w-2/3 rounded bg-white/10" />
            </div>
            <div
              className={cn(
                'mt-3 flex h-10 items-center justify-center rounded-lg text-[11px] font-black',
                stage === 3
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                  : 'bg-white/10 text-slate-400'
              )}
            >
              {stage === 3 ? (
                <>
                  <Send className="mr-2 h-4 w-4" /> Scheduled
                </>
              ) : (
                'Schedule post'
              )}
            </div>
          </div>
        </div>
      </div>
    </FilmShell>
  );
}

function MaintenanceScene() {
  const frame = useCurrentFrame();
  return (
    <FilmShell activeLabel="Maintenance">
      <SceneHeading chapterIndex={6} />
      <div className="grid grid-cols-[1fr_0.48fr] gap-4">
        <div
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          style={reveal(frame, 6)}
        >
          <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.55fr] border-b border-slate-100 px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            <span>Task</span>
            <span>Category</span>
            <span>Schedule</span>
            <span>Status</span>
          </div>
          {[
            ['AC filter replacement', 'Preventive', 'Today · 4:30 PM', 'Due', Wrench],
            ['Deep clean balcony', 'Cleaning', 'Tomorrow', 'Scheduled', Home],
            ['Smoke alarm test', 'Safety', 'Aug 3', 'Scheduled', Bell],
            ['Water heater inspection', 'Plumbing', 'Aug 5', 'Scheduled', Wrench],
            ['Inventory toiletries', 'Supplies', 'Aug 6', 'Scheduled', ClipboardCheck],
          ].map(([task, category, schedule, status, Icon], index) => {
            const completed = index === 0 && frame > 100;
            return (
              <div
                key={String(task)}
                className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.55fr] items-center border-b border-slate-100 px-5 py-4"
                style={reveal(frame, 20 + index * 10, 8)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl',
                      completed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span
                    className={cn('text-xs font-bold', completed && 'text-slate-400 line-through')}
                  >
                    {String(task)}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{String(category)}</span>
                <span className="text-[10px] text-slate-500">{String(schedule)}</span>
                <span
                  className={cn(
                    'w-fit rounded-full px-2 py-1 text-[9px] font-bold',
                    completed
                      ? 'bg-emerald-50 text-emerald-700'
                      : status === 'Due'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {completed ? 'Done' : String(status)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="space-y-4">
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            style={reveal(frame, 30)}
          >
            <p className="text-xs font-black">This month</p>
            <p className="mt-3 text-[38px] font-black tracking-tight">{countTo(frame, 12, 35)}</p>
            <p className="text-[10px] text-slate-400">scheduled tasks</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-500"
                style={{
                  width: `${interpolate(frame, [45, 115], [10, 76], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[9px] font-semibold text-slate-400">9 completed</p>
          </div>
          <div
            className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg"
            style={reveal(frame, 92)}
          >
            <div className="flex items-center gap-2 text-teal-300">
              <Bell className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Reminder sent</span>
            </div>
            <p className="mt-3 text-sm font-black">AC filter due · Unit 4B</p>
            <p className="mt-1 text-[10px] text-slate-400">Maintenance team · Telegram</p>
          </div>
        </div>
      </div>
    </FilmShell>
  );
}

function NotificationsScene() {
  const frame = useCurrentFrame();
  const modules = [
    ['Marketing', Megaphone, 'Content reminders'],
    ['Staff', Users, 'Shift and guest updates'],
    ['Operations', ClipboardCheck, 'Booking workflow alerts'],
    ['Finance', CircleDollarSign, 'Payment reminders'],
    ['Maintenance', Wrench, 'Property upkeep'],
  ] as const;
  return (
    <FilmShell activeLabel="Dashboard">
      <SceneHeading chapterIndex={7} />
      <div className="grid grid-cols-[1fr_0.85fr] gap-5">
        <div className="space-y-3">
          {modules.map(([label, Icon, detail], index) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              style={reveal(frame, index * 13, 12)}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black">{label}</p>
                <p className="mt-1 text-[10px] text-slate-400">{detail}</p>
              </div>
              <div className="ml-auto flex h-6 w-11 items-center rounded-full bg-teal-500 px-1">
                <span className="ml-auto h-4 w-4 rounded-full bg-white shadow" />
              </div>
            </div>
          ))}
        </div>
        <div className="relative flex items-center justify-center">
          <div
            className="h-[475px] w-[250px] rounded-[38px] border-[7px] border-slate-900 bg-slate-950 p-3 shadow-2xl"
            style={reveal(frame, 22)}
          >
            <div className="mx-auto mb-5 h-4 w-20 rounded-full bg-slate-900" />
            <p className="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {filmAlertsLabel}
            </p>
            <div className="mt-3 space-y-3">
              {[
                {
                  title: 'Booking moved forward',
                  detail: 'Kyle is ready for check-in',
                  icon: CalendarDays,
                  delay: 34,
                },
                {
                  title: 'Payment reminder',
                  detail: 'Ana · balance due tomorrow',
                  icon: CircleDollarSign,
                  delay: 74,
                },
                {
                  title: 'Maintenance due',
                  detail: 'AC filter · Unit 4B',
                  icon: Wrench,
                  delay: 114,
                },
              ].map(({ title, detail, icon: Icon, delay }) => (
                <div
                  key={title}
                  className="rounded-2xl bg-white p-3 text-slate-900 shadow-lg"
                  style={reveal(frame, delay, 28)}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[9px] font-black">{title}</p>
                  </div>
                  <p className="mt-2 text-[8px] leading-relaxed text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div
            className="absolute right-0 top-7 rounded-xl bg-teal-500 px-3 py-2 text-[9px] font-black text-white shadow-lg"
            style={reveal(frame, 128, 20)}
          >
            Delivered instantly
          </div>
        </div>
      </div>
    </FilmShell>
  );
}

function AiScene() {
  const frame = useCurrentFrame();
  const orbScale = interpolate(frame, [0, 45, 90, 135, 179], [1, 1.08, 0.98, 1.08, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tasks = [
    ['Payment receipt', 'Validated · 98% confidence', Receipt, 22],
    ['Inbound approval', 'Matched and archived', FileCheck2, 58],
    ['Guest message', 'Reply draft prepared', MessageSquare, 94],
    ['Workflow step', 'Status and dates synced', CalendarDays, 130],
  ] as const;
  return (
    <FilmShell activeLabel="Dashboard">
      <SceneHeading chapterIndex={8} />
      <div
        className="relative flex h-[510px] items-center justify-center overflow-hidden rounded-3xl bg-slate-950 shadow-2xl"
        style={reveal(frame, 4)}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at center, #2dd4bf 0, transparent 48%)',
          }}
        />
        <div className="absolute h-[420px] w-[420px] rounded-full border border-teal-400/10" />
        <div className="absolute h-[310px] w-[310px] rounded-full border border-teal-400/15" />
        <div
          className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 via-teal-500 to-cyan-700 shadow-[0_0_80px_20px_rgba(45,212,191,0.28)]"
          style={{ transform: `scale(${orbScale})` }}
        >
          <Bot className="h-14 w-14 text-white" />
          <span className="absolute -bottom-9 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">
            AI assistant active
          </span>
        </div>
        {tasks.map(([title, detail, Icon, delay], index) => {
          const positions = [
            'left-[90px] top-[72px]',
            'right-[85px] top-[88px]',
            'left-[110px] bottom-[70px]',
            'right-[95px] bottom-[72px]',
          ];
          return (
            <div
              key={title}
              className={cn(
                'absolute flex w-[245px] items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur-md',
                positions[index]
              )}
              style={reveal(frame, delay, 24)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black">{title}</p>
                <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
              </div>
              <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />
            </div>
          );
        })}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/5 px-4 py-2 text-[9px] font-semibold text-slate-400"
          style={reveal(frame, 150, 8)}
        >
          {filmAutomationTagline}
        </div>
      </div>
    </FilmShell>
  );
}

const scenes = [
  OverviewScene,
  BookingScene,
  InboxScene,
  FinanceScene,
  PricingScene,
  MarketingScene,
  MaintenanceScene,
  NotificationsScene,
  AiScene,
];

export interface HostDashboardFilmProps {
  narrationMuted: boolean;
}

export function HostDashboardFilm({ narrationMuted }: HostDashboardFilmProps) {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill className="bg-slate-950">
      {scenes.map((Scene, index) => {
        const chapter = hostTourChapters[index];
        return (
          <Sequence
            key={chapter?.id}
            from={index * HOST_TOUR_CHAPTER_FRAMES}
            durationInFrames={HOST_TOUR_CHAPTER_FRAMES}
            premountFor={fps}
          >
            {chapter ? <Audio src={chapter.audioSrc} muted={narrationMuted} /> : null}
            <Scene />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
