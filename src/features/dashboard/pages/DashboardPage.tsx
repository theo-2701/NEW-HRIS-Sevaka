import { useState } from 'react';
import { DashboardHero } from '@/features/dashboard/components/DashboardHero';
import { HomeStatCards } from '@/features/dashboard/components/HomeStatCards';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { GenderDonut, JobLevelBar, StaffActiveChart, TurnoverChart } from '@/features/dashboard/components/StatCharts';
import {
  LeaveBalanceCard,
  PromoBanner,
  QuickLinksCard,
  SecurityCard,
  WhosOffCard,
} from '@/features/dashboard/components/SidePanels';
import { DashboardTabsCard } from '@/features/dashboard/components/DashboardTabsCard';
import { UnlockAccountModal } from '@/features/dashboard/components/UnlockAccountModal';
import { useDashboardSummary, useHomeStats } from '@/features/dashboard/hooks/useDashboard';

/**
 * Dashboard — port `_prototype/index.html` + `js/dashboard.js`.
 * Susunan: hero · 4 kartu grafik · mid-row (Keamanan Akun + Quick Links |
 * banner + kartu bertab | Ringkasan dua lapis + saldo cuti + Who's Off).
 * Grafik dipertahankan atas permintaan user walau FSD-AUTH 0.7 §2.9 menggantinya
 * dengan lima kartu angka; kartu angka itu kini jadi panel Ringkasan di kolom kanan.
 * Kartu bertab sengaja berada di kolom yang sama dengan banner sehingga
 * lebarnya mengikuti banner dan duduk tepat di bawahnya.
 */
export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();
  const { data: stats } = useHomeStats();
  const [unlockOpen, setUnlockOpen] = useState(false);

  return (
    <>
      <DashboardHero />

      {/* ---- Stat grid ---- */}
      <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr_1.1fr_1.2fr]">
        <StatCard title="Gender Diversity" info="Komposisi gender karyawan aktif.">
          {data && <GenderDonut data={data.gender} />}
        </StatCard>

        <StatCard title="Staff Active" info="Jumlah karyawan aktif enam bulan terakhir.">
          {data && <StaffActiveChart data={data.staffActive} />}
        </StatCard>

        <StatCard title="Monthly Turnover" info="Persentase karyawan keluar per bulan.">
          {data && <TurnoverChart data={data.turnover} />}
        </StatCard>

        <StatCard title="Job Level" info="Distribusi jenjang jabatan terhadap total karyawan.">
          {data && <JobLevelBar data={data.jobLevels} total={data.totalEmployees} />}
        </StatCard>
      </section>

      {/* ---- Mid row ---- */}
      <section className="grid items-start gap-4 xl:grid-cols-[260px_1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <SecurityCard lockedCount={data?.lockedAccounts.length ?? 0} onUnlock={() => setUnlockOpen(true)} />
          <QuickLinksCard />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <PromoBanner />
          <DashboardTabsCard contracts={data?.contracts ?? []} loading={isLoading} />
        </div>

        <div className="flex flex-col gap-4">
          <HomeStatCards />
          {data && (
            <LeaveBalanceCard
              leave={{ ...data.leave, annualLeaveDays: stats?.leaveBalanceDays ?? data.leave.annualLeaveDays }}
            />
          )}
          <WhosOffCard entries={data?.whosOff ?? []} />
        </div>
      </section>

      <UnlockAccountModal open={unlockOpen} onOpenChange={setUnlockOpen} />
    </>
  );
}
