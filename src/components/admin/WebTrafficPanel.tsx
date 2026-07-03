import { Card, CardContent } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export interface TrafficSeriesPoint {
  date: string;
  label: string;
  newUsers: number;
  activeUsers: number;
  visitors: number;
}

export interface TrafficData {
  visitors7d: number;
  newUsers7d: number;
  activeUsers7d: number;
  series: TrafficSeriesPoint[];
}

type MetricKey = "visitors" | "newUsers" | "activeUsers";

const METRICS: { key: MetricKey; label: string; totalKey: keyof TrafficData }[] = [
  { key: "visitors", label: "Visitors", totalKey: "visitors7d" },
  { key: "newUsers", label: "New users", totalKey: "newUsers7d" },
  { key: "activeUsers", label: "Active users", totalKey: "activeUsers7d" },
];

export const WebTrafficPanel = ({
  data,
  loading,
}: {
  data?: TrafficData | null;
  loading?: boolean;
}) => {
  const [active, setActive] = useState<MetricKey>("visitors");

  return (
    <Card className="border-0 shadow-sm bg-card">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Web traffic</h3>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 rounded-lg border border-border p-1">
          {METRICS.map((m) => {
            const isActive = active === m.key;
            const total = data ? (data[m.totalKey] as number) : 0;
            return (
              <button
                key={m.key}
                onClick={() => setActive(m.key)}
                className={`text-left px-3 py-2 rounded-md transition-colors ${
                  isActive ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {loading ? "…" : total.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>

        <div className="h-56 w-full rounded-lg border border-border bg-muted/20 p-2">
          {loading || !data ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey={active}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#trafficFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebTrafficPanel;
