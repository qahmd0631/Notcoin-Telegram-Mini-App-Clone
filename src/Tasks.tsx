export type TaskRecord = {
  id: string;
  title: string;
  reward: string;
  icon: string;
  type: 'ad' | 'social';
  max_daily?: number;
  link?: string;
};

export type TaskStatus = Record<string, { opened: boolean; completed: boolean; claimed: boolean }>;

type TasksViewProps = {
  tasks: TaskRecord[];
  taskStatus: TaskStatus;
  adLimitReached: boolean;
  adCount: number;
  isAdLocked: boolean;
  isAdLoading: boolean;
  handleWatchAdTask: () => Promise<void>;
  handleChannelTaskAction: (taskId: string) => Promise<void>;
};

export function TasksView({
  tasks,
  taskStatus,
  adLimitReached,
  adCount,
  isAdLocked,
  isAdLoading,
  handleWatchAdTask,
  handleChannelTaskAction,
}: TasksViewProps) {
  return (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col px-4 pb-28 pt-6 text-white">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f4d889]">Task Board</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff8e1]">Tasks</h1>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const status = taskStatus[task.id] ?? { opened: false, completed: false, claimed: false };
          const isCompleted = task.type === 'ad' ? adLimitReached || adCount >= (task.max_daily ?? 10) : status.claimed || status.completed;
          const buttonLabel = task.type === 'ad'
            ? isCompleted
              ? 'LIMIT REACHED (10/10)'
              : `WATCH (${Math.min(adCount, 10)}/10)`
            : status.claimed || status.completed
              ? 'Completed'
              : status.opened
                ? 'Claim'
                : 'Go';

          return (
            <div key={task.id} className="rounded-[28px] border border-[#f7d780]/20 bg-[#181b21]/85 p-4 shadow-[0_18px_34px_rgba(0,0,0,0.2)] backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c75b]/15 text-2xl shadow-[0_0_16px_rgba(244,199,91,0.25)]">
                    {task.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#f8d77a]">Mission</p>
                    <h2 className="mt-2 text-lg font-bold text-white">{task.title}</h2>
                    {task.type === 'ad' && (
                      <p className="mt-2 text-xs text-white/70">
                        {isAdLocked || adCount >= 10 ? 'LIMIT REACHED (10/10)' : `Watched: ${Math.min(adCount, 10)}/${task.max_daily}`}
                      </p>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-[#f4c75b]/15 px-2.5 py-1 text-xs font-bold text-[#f8d77a]">{task.reward}</span>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                    isCompleted || (task.type === 'ad' && isAdLoading)
                      ? 'bg-[#1d2128] text-[#d8dbe0]'
                      : 'bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] text-[#16130b]'
                  }`}
                  onClick={() => {
                    if (task.type === 'ad') {
                      void handleWatchAdTask();
                    } else {
                      void handleChannelTaskAction(task.id);
                    }
                  }}
                  disabled={task.type === 'ad' ? (adLimitReached || isAdLoading) : isCompleted || isAdLoading}
                >
                  {task.type === 'ad' && isAdLoading ? 'Loading...' : buttonLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
