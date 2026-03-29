'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: Record<string, number>;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'markdowns', label: 'Markdowns' },
];

export default function TabNav({ activeTab, onTabChange, counts }: TabNavProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList>
        {tabs.map((tab) => {
          const count = counts[tab.id];
          return (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-secondary text-secondary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
