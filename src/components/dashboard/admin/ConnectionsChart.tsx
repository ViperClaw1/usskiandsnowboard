import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export const ConnectionsChart = () => {
  const { data: connections = [] } = useQuery({
    queryKey: ['connections-by-day'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections_by_day')
        .select('*')
        .order('request_date', { ascending: true });
      
      if (error) throw error;
      return data.map(d => ({
        ...d,
        date: format(new Date(d.request_date), 'MMM dd')
      }));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Requests</CardTitle>
        <CardDescription>Request status breakdown over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={connections}>
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
            <Area 
              type="monotone" 
              dataKey="accepted" 
              stackId="1"
              stroke="hsl(var(--accent))" 
              fill="hsl(var(--accent))"
              fillOpacity={0.6}
              name="Accepted"
            />
            <Area 
              type="monotone" 
              dataKey="pending" 
              stackId="1"
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
              name="Pending"
            />
            <Area 
              type="monotone" 
              dataKey="rejected" 
              stackId="1"
              stroke="hsl(var(--muted-foreground))" 
              fill="hsl(var(--muted))"
              fillOpacity={0.4}
              name="Rejected"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
