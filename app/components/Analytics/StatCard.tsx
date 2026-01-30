interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col items-center text-center gap-1">
        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
        <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
          <span className="w-3 h-3 [&>svg]:w-3 [&>svg]:h-3">{icon}</span>
          <p className="text-xs truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}
