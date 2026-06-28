import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Briefcase, Factory, Pencil, Trash2 } from "lucide-react";
import { isNewPost } from "@/constants/jobBoard";
import { formatDistanceToNow } from "date-fns";

export interface JobPostListItem {
  id: string;
  expert_id: string;
  source_url: string;
  job_title: string;
  company: string | null;
  location: string | null;
  remote_status: string | null;
  employment_type: string | null;
  industry: string | null;
  expert_note: string | null;
  status: string;
  created_at: string;
  expert?: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    job_title: string | null;
  } | null;
}

function initials(name: string | null | undefined) {
  if (!name) return "EX";
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

export const JobCard = ({
  job,
  onExpertClick,
}: {
  job: JobPostListItem;
  onExpertClick?: (expertId: string) => void;
}) => {
  const isNew = isNewPost(job.created_at);

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardContent className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-2">{job.job_title}</h3>
            {job.company && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.company}</p>
            )}
          </div>
          {isNew && (
            <Badge className="bg-emerald-500 text-white border-transparent hover:bg-emerald-500 shrink-0">
              New
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {job.location && (
            <Badge variant="secondary" className="text-xs gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
              {job.remote_status ? ` · ${job.remote_status}` : ""}
            </Badge>
          )}
          {!job.location && job.remote_status && (
            <Badge variant="secondary" className="text-xs">{job.remote_status}</Badge>
          )}
          {job.employment_type && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Briefcase className="h-3 w-3" />
              {job.employment_type}
            </Badge>
          )}
          {job.industry && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Factory className="h-3 w-3" />
              {job.industry}
            </Badge>
          )}
        </div>

        {job.expert_note && (
          <p className="text-sm text-muted-foreground italic line-clamp-3 whitespace-pre-line">
            "{job.expert_note}"
          </p>
        )}

        <div className="mt-auto pt-3 border-t flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onExpertClick?.(job.expert_id)}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 text-left"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={job.expert?.photo_url ?? undefined} />
              <AvatarFallback>{initials(job.expert?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{job.expert?.full_name ?? "Expert"}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </p>
            </div>
          </button>
          <Button asChild size="sm" variant="outline">
            <a href={job.source_url} target="_blank" rel="noopener noreferrer">
              View <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
