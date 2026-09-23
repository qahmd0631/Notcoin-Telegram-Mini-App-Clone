type MinerEntry = {
  level: number;
  speed: string;
  price: number;
  unlock: number;
};

type MinersViewProps = {
  currentMiningLevel: number;
  currentLevel: number;
  currentMiningSpeed: number;
  speedBoostSecondsLeft: number;
  points: number;
  minerLevels: MinerEntry[];
  handleMinerUpgrade: (level: number) => Promise<void>;
};

export function MinersView({
  currentMiningLevel,
  currentLevel,
  currentMiningSpeed,
  speedBoostSecondsLeft,
  points,
  minerLevels,
  handleMinerUpgrade,
}: MinersViewProps) {
  return (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col px-4 pb-28 pt-6 text-white">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f4d889]">Miners</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff8e1]">Upgrade Store</h1>
        </div>
      </div>

      <div className="rounded-[30px] border border-[#f7d780]/20 bg-[#181b21]/85 p-4 shadow-[0_18px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Current Level</p>
            <h2 className="mt-2 text-3xl font-black text-[#fff3c4]">Lv. {currentMiningLevel || currentLevel}</h2>
          </div>
          <div className="rounded-full border border-[#8ef0b0]/35 bg-[#0d1c17]/80 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#a8ffd0]">
            {currentMiningLevel >= 8 ? 'Peak' : 'Mining'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[#11161b] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Today&apos;s P&amp;L</div>
            <div className="mt-2 text-lg font-black text-[#a9f0b7]">+${(Math.max((currentMiningLevel || currentLevel) * 0.8, 2.4)).toFixed(1)}</div>
          </div>
          <div className="rounded-2xl bg-[#11161b] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Mining Rate</div>
            <div className="mt-2 text-lg font-black text-[#f9e6ad]">{currentMiningSpeed.toFixed(4)} AGEN/hr</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#101419] p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#d7bf73]">
            <span>Performance</span>
            <span>{Math.min(((currentMiningLevel || currentLevel) / 36) * 100, 100).toFixed(0)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1f252d]">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#f7d57a,#d4af37_35%,#f3d784_100%)]" style={{ width: `${Math.min(((currentMiningLevel || currentLevel) / 36) * 100, 100)}%` }} />
          </div>
        </div>

        {speedBoostSecondsLeft > 0 && (
          <div className="mt-4 rounded-2xl border border-[#5ee7a9]/30 bg-[#0f1d1a]/80 px-3 py-2 text-xs font-bold text-[#9ff7c3]">
            2x Speed Boost active: {speedBoostSecondsLeft}s remaining
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {minerLevels.map((entry) => {
          const isUnlocked = (currentMiningLevel || currentLevel) >= entry.level;
          const isAffordable = points >= entry.price;
          const statusText = isUnlocked
            ? 'ACTIVE'
            : isAffordable
              ? 'NEED ' + entry.price + ' tokens to unlock'
              : 'LOCKED';

          return (
            <div key={entry.level} className={`rounded-[26px] border p-3 shadow-[0_10px_24px_rgba(0,0,0,0.18)] ${isUnlocked ? 'border-[#f7d780]/40 bg-[#1b1c1f]' : 'border-[#f7d780]/15 bg-[#14181d]'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Lvl</p>
                  <h3 className="mt-1 text-xl font-black text-white">{entry.level}</h3>
                </div>
                <span className="rounded-full bg-[#f4c75b]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f8d77a]">
                  {entry.speed}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-white/75">
                <div className="flex items-center justify-between">
                  <span>Price</span>
                  <span className="font-bold text-[#f9e6ad]">{entry.price} tokens</span>
                </div>
              </div>

              <button
                className={`mt-4 w-full rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                  isUnlocked
                    ? 'bg-[#1b3a2d] text-[#9ff7c3]'
                    : isAffordable
                      ? 'bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] text-[#16130b]'
                      : 'bg-[#1d2128] text-[#d8dbe0]'
                }`}
                onClick={() => void handleMinerUpgrade(entry.level)}
                disabled={!isAffordable && !isUnlocked}
              >
                {statusText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
