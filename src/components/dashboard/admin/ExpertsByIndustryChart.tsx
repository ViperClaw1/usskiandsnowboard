import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--primary-glow))",
  "hsl(var(--secondary))",
  "hsl(215 55% 45%)",
  "hsl(355 75% 60%)",
  "hsl(35 85% 55%)",
  "hsl(150 55% 45%)",
  "hsl(280 55% 55%)",
  "hsl(190 65% 45%)",
];

export const ExpertsByIndustryChart = () => {
  const { data = [] } = useQuery({
    queryKey: ["experts-by-industry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("industry");
      if (error) throw error;

      const counts = new Map<string, number>();
      (data ?? []).forEach((row: { industry: string | null }) => {
        if (!row.industry) return;
        row.industry
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((ind) => counts.set(ind, (counts.get(ind) ?? 0) + 1));
      });

      return Array.from(counts.entries())
        .map(([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experts by Industry</CardTitle>
        <CardDescription>Distribution of experts across industries</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="industry"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => entry.industry}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
