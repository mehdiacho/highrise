import { useState } from 'react';
import SetupScreen from './SetupScreen.js';
import OnlineSetup from './OnlineSetup.js';

type Tab = 'local' | 'online';

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('local');

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-ink">
          HIGH<span className="text-accent">RISE</span>
        </h1>
      </div>

      {/* Mode toggle */}
      <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-table-900 p-1 text-sm font-bold">
        {(['local', 'online'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-6 py-2 transition ${
              tab === t ? 'bg-accent text-white shadow-glow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t === 'local' ? 'Pass & Play' : 'Online'}
          </button>
        ))}
      </div>

      {tab === 'local' ? <SetupScreen /> : <OnlineSetup />}
    </div>
  );
}
