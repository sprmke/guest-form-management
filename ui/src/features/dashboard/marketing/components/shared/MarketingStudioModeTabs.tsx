import { SlidingTabsList, SlidingTabsTrigger } from '@/components/ui/sliding-tabs';

export function MarketingStudioModeTabs() {
  return (
    <SlidingTabsList size="primary">
      <SlidingTabsTrigger value="calendar">Calendar</SlidingTabsTrigger>
      <SlidingTabsTrigger value="design">Design</SlidingTabsTrigger>
      <SlidingTabsTrigger value="video">Video</SlidingTabsTrigger>
    </SlidingTabsList>
  );
}

export { SlidingTabs } from '@/components/ui/sliding-tabs';
