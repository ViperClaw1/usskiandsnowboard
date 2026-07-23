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

// Map both athlete career interests and expert industries to a shared canonical
// bucket so close-enough labels line up (e.g. "Finance" ↔ "Finance & Banking").
const CANONICAL_MAP: Record<string, string> = {
  // Finance
  "finance": "Finance & Banking",
  "finance & banking": "Finance & Banking",
  "banking": "Finance & Banking",
  "insurance": "Finance & Banking",
  "investment management": "Finance & Banking",
  "capital markets": "Finance & Banking",
  "economics": "Finance & Banking",
  "esg investing": "Finance & Banking",
  // Real estate / construction
  "real estate": "Construction & Real Estate",
  "construction & real estate": "Construction & Real Estate",
  "construction": "Construction & Real Estate",
  // Marketing / brand / PR / social / communications
  "marketing": "Marketing & Advertising",
  "marketing & advertising": "Marketing & Advertising",
  "advertising": "Marketing & Advertising",
  "brand management": "Marketing & Advertising",
  "brand building": "Marketing & Advertising",
  "brand development": "Marketing & Advertising",
  "public relations": "Marketing & Advertising",
  "social media": "Marketing & Advertising",
  "sponsorship": "Marketing & Advertising",
  "sponsorship management": "Marketing & Advertising",
  "content creation": "Marketing & Advertising",
  "consumer goods": "Marketing & Advertising",
  "sports marketing & brand strategy": "Marketing & Advertising",
  // Media
  "media": "Media & Entertainment",
  "broadcasting": "Media & Entertainment",
  "journalism": "Media & Entertainment",
  "publishing": "Media & Entertainment",
  "media & entertainment": "Media & Entertainment",
  "sports communications & media relations": "Media & Entertainment",
  // Consulting / professional services / business operations
  "consulting": "Consulting & Professional Services",
  "consulting & professional services": "Consulting & Professional Services",
  "legal services": "Consulting & Professional Services",
  "law": "Consulting & Professional Services",
  "human resources": "Consulting & Professional Services",
  "project management": "Consulting & Professional Services",
  "entrepreneurship": "Consulting & Professional Services",
  "start-up": "Consulting & Professional Services",
  "operations": "Consulting & Professional Services",
  "business": "Consulting & Professional Services",
  // Sports
  "coaching": "Sports & Recreation",
  "coaching/mentorship": "Sports & Recreation",
  "sports management": "Sports & Recreation",
  "athlete development": "Sports & Recreation",
  "sports analytics": "Sports & Recreation",
  "sports & recreation": "Sports & Recreation",
  "athletic training": "Sports & Recreation",
  "physical fitness": "Sports & Recreation",
  "nutrition": "Sports & Recreation",
  "sports performance/sports med": "Sports & Recreation",
  "ski guiding": "Sports & Recreation",
  // Sales / BD
  "sales": "Sales & Business Development",
  "business development": "Sales & Business Development",
  "retail & e-commerce": "Sales & Business Development",
  // Tech / product
  "product management": "Technology & Software",
  "product development": "Technology & Software",
  "product design": "Technology & Software",
  "technology & software": "Technology & Software",
  "data analysis": "Technology & Software",
  // Education
  "training & development": "Education & Training",
  "education & training": "Education & Training",
  // Non-profit / community / advocacy / policy
  "non-profit management": "Non-Profit & Social Services",
  "community outreach": "Non-Profit & Social Services",
  "non-profit & social services": "Non-Profit & Social Services",
  "fundraising": "Non-Profit & Social Services",
  "advocacy": "Non-Profit & Social Services",
  "public policy": "Non-Profit & Social Services",
  "climate policy": "Non-Profit & Social Services",
  "outdoor conservation": "Non-Profit & Social Services",
  "conservation and sustainability work": "Non-Profit & Social Services",
  // Hospitality / events / tourism
  "event planning": "Hospitality & Tourism",
  "event management": "Hospitality & Tourism",
  "hospitality & tourism": "Hospitality & Tourism",
  "food & beverage": "Hospitality & Tourism",
  // Healthcare / wellness
  "healthcare & medical": "Healthcare & Wellness",
  "biotechnology & pharmaceuticals": "Healthcare & Wellness",
  "environmental services": "Healthcare & Wellness",
  "sports medicine": "Healthcare & Wellness",
  "health": "Healthcare & Wellness",
  "public health": "Healthcare & Wellness",
  // Government / public sector
  "government & public sector": "Government & Public Sector",
  "criminal justice": "Government & Public Sector",
  // Manufacturing / industrials
  "manufacturing": "Manufacturing & Industrials",
  "transportation & logistics": "Manufacturing & Industrials",
  "automotive": "Manufacturing & Industrials",
  "aerospace & defense": "Manufacturing & Industrials",
  "aviation": "Manufacturing & Industrials",
  "pilot": "Manufacturing & Industrials",
  "agriculture & farming": "Manufacturing & Industrials",
  "mining & metals": "Manufacturing & Industrials",
  "energy & utilities": "Manufacturing & Industrials",
  "telecommunications": "Manufacturing & Industrials",
  "mechanical engineering": "Manufacturing & Industrials",
  // Fashion / design
  "fashion & apparel": "Fashion & Design",
  "fashion & design": "Fashion & Design",
  "interior design": "Fashion & Design",

};

const canonicalize = (raw: string): { key: string; label: string } | null => {
  const label = (raw || "").trim();
  if (!label) return null;
  const lower = label.toLowerCase();
  const mapped = CANONICAL_MAP[lower] ?? label;
  return { key: mapped.toLowerCase(), label: mapped };
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

      const displayFor = new Map<string, string>();
      const bump = (map: Map<string, number>, raw: string) => {
        const c = canonicalize(raw);
        if (!c) return;
        if (!displayFor.has(c.key)) displayFor.set(c.key, c.label);
        map.set(c.key, (map.get(c.key) ?? 0) + 1);
      };

      const athleteCounts = new Map<string, number>();
      (athleteRes.data ?? []).forEach((row: { career_interests: string[] | null }) => {
        (row.career_interests ?? []).forEach((raw) => bump(athleteCounts, raw));
      });

      const expertCounts = new Map<string, number>();
      (expertRes.data ?? []).forEach((row: { industry: string | null }) => {
        (row.industry ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((label) => bump(expertCounts, label));
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
