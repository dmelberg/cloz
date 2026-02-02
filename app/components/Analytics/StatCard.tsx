import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}

export default function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3">
        <div className="flex flex-col items-center text-center gap-1">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
            <span className="size-4 [&>svg]:size-4">{icon}</span>
          </div>
          <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
