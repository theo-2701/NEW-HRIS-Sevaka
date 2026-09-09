import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topnav } from '@/layouts/Topnav';
import { Sidebar } from '@/layouts/Sidebar';
import { Toaster } from '@/components/Toaster';

/**
 * Shell aplikasi — port `.app` / `.app__body` / `.app__scroll` (`css/app.css`).
 * Topnav & sidebar sticky; halaman yang scroll, bukan kotak scroll di dalam.
 */
export function AppLayout() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Topnav />
      <div className="grid flex-1 items-start" style={{ gridTemplateColumns: 'auto 1fr' }}>
        <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
        <main className="flex min-w-0 flex-col">
          <div className="flex flex-col gap-4 px-6 pb-8 pt-4">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
