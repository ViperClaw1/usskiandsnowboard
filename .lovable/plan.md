
## Plan

The `fetchExistingRequests` function currently returns a `Set<string>` of employer IDs for both "pending" and "accepted" statuses — meaning both look the same to the UI. We need to differentiate them.

### Changes to `src/components/athlete/EmployerDirectory.tsx`

1. **Change `fetchExistingRequests` return type** from `Set<string>` (employer IDs) to `Map<string, string>` (employer ID → status), fetching the `status` field too.

2. **Update the query key and query function**:
```typescript
const fetchExistingRequests = async (athleteId: string): Promise<Map<string, string>> => {
  const { data, error } = await supabase
    .from("connection_requests")
    .select("employer_id, status")
    .eq("athlete_id", athleteId)
    .in("status", ["pending", "accepted"]);
  if (error) throw error;
  return new Map(data?.map((r) => [r.employer_id, r.status]) || []);
};
```

3. **Update all `existingRequests.has(employer.id)` usages** (there are 10 hits, mostly in the same render block) to use `existingRequests.get(employer.id)` for status checks.

4. **Update the Button** at line 566-576:
```tsx
<Button
  className="w-full"
  variant={existingRequests.get(employer.id) === "accepted" ? "default" : "outline"}
  disabled={existingRequests.has(employer.id)}
  onClick={(e) => { e.stopPropagation(); setSelectedEmployer(employer); setShowRequestDialog(true); }}
>
  {existingRequests.get(employer.id) === "accepted"
    ? "✓ Connected"
    : existingRequests.get(employer.id) === "pending"
    ? "Request Sent"
    : "Request Connection"}
</Button>
```

5. **Fix the type reference** wherever `existingRequests` is typed or initialized (e.g. `useState<Set<string>>` → `useState<Map<string, string>>`).

### Visual states
| Status | Button text | Style |
|---|---|---|
| No request | "Request Connection" | Default enabled |
| Pending | "Request Sent" | Disabled, outline |
| Accepted | "✓ Connected" | Disabled, green/default |
