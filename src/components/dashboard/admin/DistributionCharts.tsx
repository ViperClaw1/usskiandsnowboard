import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--primary-glow))', 'hsl(var(--secondary))', 'hsl(215 55% 45%)', 'hsl(355 75% 60%)'];
export const DistributionCharts = () => {
  const {
    data: athletesBySport = []
  } = useQuery({
    queryKey: ['athletes-by-sport'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('athletes_by_sport').select('*').limit(6);
      if (error) throw error;
      return data;
    }
  });
  return <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Athletes by Sport</CardTitle>
          <CardDescription>Distribution of registered athletes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={athletesBySport} dataKey="count" nameKey="sport_discipline" cx="50%" cy="50%" outerRadius={80} label={entry => entry.sport_discipline}>
                {athletesBySport.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem'
            }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>;
};
