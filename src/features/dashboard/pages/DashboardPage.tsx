import { useState } from 'react';
import { DashboardHero } from '@/features/dashboard/components/DashboardHero';
import { HomeStatCards } from '@/features/dashboard/components/HomeStatCards';
import {
  LeaveBalanceCard,
  PromoBanner,
  QuickLinksCard,
  SecurityCard,
  WhosOffCard,
} from '@/features/dashboard/components/SidePanels';
import { DashboardTabsCard } from '@/features/dashboard/components/DashboardTabsCard';
import { UnlockAccountModal } from '@/features/dashboard/components/UnlockAccountModal';
import { useDashboardSummary } from '@/features/dashboard/hooks/useDashboard';

/**
 * Dashboard — port `_prototype/index.html` + `js/dashboard.js`.
 * Susunan: hero · lima kartu angka dua lapis (FSD-AUTH 0.7 §2.9) · mid-row (Keamanan Akun + Quick Links |
 * banner + kartu bertab | saldo cuti + Who's Off).
 * Kartu bertab sengaja berada di kolom yang sama dengan banner sehingga
 * lebarnya mengikuti banner dan duduk tepat di bawahnya.
 */
export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();
  const [unlockOpen, setUnlockOpen] = useState(false);

  return (
    <>
      <DashboardHero />

      {/* ---- Kartu angka HOME dua lapis (FSD-AUTH 0.7 §2.9) ---- */}
      <HomeStatCards />

      {/* ---- Mid row ---- */}
      <section className="grid items-start gap-4 xl:grid-cols-[260px_1fr_280px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SecurityCard lockedCount={data?.lockedAccounts.length ?? 0} onUnlock={() => setUnlockOpen(true)} />
          <QuickLinksCard />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <PromoBanner />
          <DashboardTabsCard contracts={data?.contracts ?? []} loading={isLoading} />
        </div>

        <div className="flex flex-col gap-4">
          {data && <LeaveBalanceCard leave={data.leave} />}
          <WhosOffCard entries={data?.whosOff ?? []} />
        </div>
      </section>

      <UnlockAccountModal open={unlockOpen} onOpenChange={setUnlockOpen} />
    </>
  );
}
