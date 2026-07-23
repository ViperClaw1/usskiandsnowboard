import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";

type Row = {
  category: string;
  athletes: number;
  experts: number;
  gap: number;
};

export const MentorshipGapChart = () => {
  const { data = [] } = useQuery<Row[]>({
    queryKey: ["mentorship-gap"],
    queryFn: async () => {
      const [athleteRes, expertRes] = await Promise.all([
        supabase.from("athlete_profiles").select("career_interests"),
        supabase.from("expert_profiles").select("industry"),
      ]);
      if (athleteRes.error) throw athleteRes.error;
      if (expertRes.error) throw expertRes.error;

      const norm = (s: string) => s.trim().toLowerCase();
      const displayFor = new Map<string, string>();

      const athleteCounts = new Map<string, number>();
      (athleteRes.data ?? []).forEach((row: { career_interests: string[] | null }) => {
        (row.career_interests ?? []).forEach((raw) => {
          const label = (raw || "").trim();
          if (!label) return;
          const key = norm(label);
          if (!displayFor.has(key)) displayFor.set(key, label);
          athleteCounts.set(key, (athleteCounts.get(key) ?? 0) + 1);
        });
      });

      const expertCounts = new Map<string, number>();
      (expertRes.data ?? []).forEach((row: { industry: string | null }) => {
        (row.industry ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((label) => {
            const key = norm(label);
            if (!displayFor.has(key)) displayFor.set(key, label);
            expertCounts.set(key, (expertCounts.get(key) ?? 0) + 1);
          });
      });

      const keys = new Set<string>([...athleteCounts.keys(), ...expertCounts.keys()]);
      const rows: Row[] = Array.from(keys).map((key) => {
        const athletes = athleteCounts.get(key) ?? 0;
        const experts = expertCounts.get(key) ?? 0;
        return {
          category: displayFor.get(key) ?? key,
          athletes,
          experts,
          gap: athletes - experts,
        };
      });

      // Only categories with at least some athlete demand, sorted by gap desc
      return rows
        .filter((r) => r.athletes > 0)
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 12);
    },
  });

  const topGaps = data.filter((r) => r.gap > 0).slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Mentorship Supply vs. Demand
        </CardTitle>
        <CardDescription>
          Where athlete career interest outpaces available expert coverage — target these
          industries for expert recruitment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topGaps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Top recruitment priorities:</span>
            {topGaps.map((r) => (
              <Badge key={r.category} variant="secondary">
                {r.category} · +{r.gap} needed
              </Badge>
            ))}
          </div>
        )}
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(320, data.length * 34)}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
              barCategoryGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                width={180}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                formatter={(value: number, name: string, props: any) => {
                  if (name === "athletes") return [value, "Athletes interested"];
                  if (name === "experts") return [value, "Experts available"];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  const row = payload?.[0]?.payload as Row | undefined;
                  if (!row) return label as string;
                  const g = row.gap;
                  const suffix =
                    g > 0
                      ? ` — gap of ${g} (recruit experts)`
                      : g < 0
                        ? ` — surplus of ${Math.abs(g)} experts`
                        : " — balanced";
                  return `${row.category}${suffix}`;
                }}
              />
              <Legend
                formatter={(v) =>
                  v === "athletes" ? "Athletes interested" : "Experts available"
                }
              />
              <Bar dataKey="athletes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="experts" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
