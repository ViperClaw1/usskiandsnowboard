import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export const SignupsChart = () => {
  const { data: signups = [] } = useQuery({
    queryKey: ['user-signups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_signups_by_day')
        .select('*')
        .order('signup_date', { ascending: true });
      
      if (error) throw error;
      return data.map(d => ({
        ...d,
        date: format(new Date(d.signup_date), 'MMM dd')
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Signups</CardTitle>
        <CardDescription>Daily signups over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={signups}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="athlete_signups" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Athletes"
            />
            <Line 
              type="monotone" 
              dataKey="employer_signups" 
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              name="Employers"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
