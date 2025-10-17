import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2, FilterX } from "lucide-react";
import { toast } from "sonner";

interface EmployerProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  hq_location: string | null;
  opportunities_offered: string | null;
  contact_person: string | null;
  contact_title: string | null;
  contact_email: string | null;
  logo_url: string | null;
  about: string | null;
  website: string | null;
  linkedin_url: string | null;
}

const EmployerDirectory = () => {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [athleteProfileId, setAthleteProfileId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [opportunityType, setOpportunityType] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [existingRequests, setExistingRequests] = useState<Set<string>>(new Set());
  
  // Filter states
  const [filterCompanySize, setFilterCompanySize] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");

  useEffect(() => {
    loadEmployers();
    loadAthleteProfile();
  }, []);

  const loadAthleteProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("athlete_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setAthleteProfileId(data.id);
      loadExistingRequests(data.id);
    }
  };

  const loadExistingRequests = async (athleteId: string) => {
    try {
      const { data, error } = await supabase
        .from("connection_requests")
        .select("employer_id")
        .eq("athlete_id", athleteId);

      if (error) throw error;

      const requestedEmployerIds = new Set(data?.map(r => r.employer_id) || []);
      setExistingRequests(requestedEmployerIds);
    } catch (error) {
      console.error("Error loading existing requests:", error);
    }
  };

  const loadEmployers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*");

      if (error) {
        toast.error("Failed to load partners");
        console.error("Error loading partners:", error);
        return;
      }

      setEmployers(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (employerId: string) => {
    if (!athleteProfileId) {
      toast.error("Please complete your athlete profile first");
      return;
    }

    if (existingRequests.has(employerId)) {
      toast.error("You have already sent a request to this partner");
      return;
    }

    if (!requestMessage.trim()) {
      toast.error("Please include a message with your request");
      return;
    }

    setSendingRequest(true);
    try {
      const { error } = await supabase
        .from("connection_requests")
        .insert({
          athlete_id: athleteProfileId,
          employer_id: employerId,
          message: requestMessage,
          opportunity_type: opportunityType || null,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Connection request sent!");
      setRequestMessage("");
      setOpportunityType("");
      setOpenDialogId(null);
      
      // Add to existing requests
      setExistingRequests(prev => new Set([...prev, employerId]));
      
      // Navigate back to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send connection request");
    } finally {
      setSendingRequest(false);
    }
  };

  // Get unique values for filters
  const uniqueCompanySizes = useMemo(() => {
    const sizes = employers.map(e => e.company_size).filter(Boolean);
    return [...new Set(sizes)];
  }, [employers]);

  const uniqueLocations = useMemo(() => {
    const locations = employers.map(e => e.hq_location).filter(Boolean);
    return [...new Set(locations)];
  }, [employers]);

  const uniqueIndustries = useMemo(() => {
    const industries = employers.map(e => e.industry).filter(Boolean);
    return [...new Set(industries)];
  }, [employers]);

  // Comprehensive industry list
  const industryOptions = [
    "Technology & Software",
    "Finance & Banking",
    "Healthcare & Medical",
    "Retail & E-commerce",
    "Manufacturing",
    "Construction & Real Estate",
    "Education & Training",
    "Hospitality & Tourism",
    "Transportation & Logistics",
    "Media & Entertainment",
    "Consulting & Professional Services",
    "Energy & Utilities",
    "Telecommunications",
    "Automotive",
    "Aerospace & Defense",
    "Agriculture & Farming",
    "Biotechnology & Pharmaceuticals",
    "Consumer Goods",
    "Fashion & Apparel",
    "Food & Beverage",
    "Insurance",
    "Legal Services",
    "Marketing & Advertising",
    "Mining & Metals",
    "Non-Profit & Social Services",
    "Publishing",
    "Sports & Recreation",
    "Government & Public Sector",
    "Environmental Services",
    "Other"
  ];

  // Filter employers based on selected filters
  const filteredEmployers = useMemo(() => {
    return employers.filter(employer => {
      if (filterCompanySize !== "all" && employer.company_size !== filterCompanySize) return false;
      if (filterLocation !== "all" && employer.hq_location !== filterLocation) return false;
      if (filterIndustry !== "all" && employer.industry !== filterIndustry) return false;
      return true;
    });
  }, [employers, filterCompanySize, filterLocation, filterIndustry]);

  const clearFilters = () => {
    setFilterCompanySize("all");
    setFilterLocation("all");
    setFilterIndustry("all");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (employers.length === 0) {
    return (
      <div className="text-center p-8">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No partners found</p>
      </div>
    );
  }

  if (filteredEmployers.length === 0 && employers.length > 0) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-card rounded-lg border">
          <div>
            <Label htmlFor="filter-size" className="text-sm font-medium mb-2 block">Company Size</Label>
            <Select value={filterCompanySize} onValueChange={setFilterCompanySize}>
              <SelectTrigger id="filter-size">
                <SelectValue placeholder="All Sizes" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Sizes</SelectItem>
                {uniqueCompanySizes.map(size => (
                  <SelectItem key={size} value={size!}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="filter-location" className="text-sm font-medium mb-2 block">Location</Label>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger id="filter-location">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map(location => (
                  <SelectItem key={location} value={location!}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="filter-industry" className="text-sm font-medium mb-2 block">Industry</Label>
            <Select value={filterIndustry} onValueChange={setFilterIndustry}>
              <SelectTrigger id="filter-industry">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Industries</SelectItem>
                {industryOptions.map(industry => (
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            No partners match your filters
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-card rounded-lg border">
        <div>
          <Label htmlFor="filter-size" className="text-sm font-medium mb-2 block">Company Size</Label>
          <Select value={filterCompanySize} onValueChange={setFilterCompanySize}>
            <SelectTrigger id="filter-size">
              <SelectValue placeholder="All Sizes" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Sizes</SelectItem>
              {uniqueCompanySizes.map(size => (
                <SelectItem key={size} value={size!}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="filter-location" className="text-sm font-medium mb-2 block">Location</Label>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger id="filter-location">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map(location => (
                <SelectItem key={location} value={location!}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="filter-industry" className="text-sm font-medium mb-2 block">Industry</Label>
          <Select value={filterIndustry} onValueChange={setFilterIndustry}>
            <SelectTrigger id="filter-industry">
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Industries</SelectItem>
              {industryOptions.map(industry => (
                <SelectItem key={industry} value={industry}>{industry}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredEmployers.length} of {employers.length} partners
        </p>
        {(filterCompanySize !== "all" || filterLocation !== "all" || filterIndustry !== "all") && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployers.map((employer) => (
          <Card key={employer.id}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {employer.logo_url ? (
                  <img 
                    src={employer.logo_url} 
                    alt={`${employer.company_name} logo`}
                    className="h-12 w-12 object-contain rounded"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-primary" />
                )}
                <div>
                  <CardTitle className="text-lg">{employer.company_name}</CardTitle>
                  {employer.industry && (
                    <p className="text-sm text-muted-foreground">{employer.industry}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {employer.about && (
                <div>
                  <p className="text-sm font-medium mb-1">About</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{employer.about}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {employer.company_size && (
                  <div>
                    <p className="font-medium">Size</p>
                    <p className="text-muted-foreground">{employer.company_size}</p>
                  </div>
                )}
                {employer.hq_location && (
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">{employer.hq_location}</p>
                  </div>
                )}
              </div>
              {employer.opportunities_offered && (
                <div>
                  <p className="text-sm font-medium mb-1">Opportunities</p>
                  <p className="text-sm text-muted-foreground">{employer.opportunities_offered}</p>
                </div>
              )}
              {(employer.contact_person || employer.contact_title || employer.contact_email) && (
                <div>
                  <p className="text-sm font-medium mb-1">Contact</p>
                  {employer.contact_person && (
                    <p className="text-sm text-muted-foreground">{employer.contact_person}</p>
                  )}
                  {employer.contact_title && (
                    <p className="text-sm text-muted-foreground">{employer.contact_title}</p>
                  )}
                  {employer.contact_email && (
                    <a 
                      href={`mailto:${employer.contact_email}`}
                      className="text-sm text-primary hover:underline block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {employer.contact_email}
                    </a>
                  )}
                </div>
              )}
              
              <Dialog open={openDialogId === employer.id} onOpenChange={(open) => setOpenDialogId(open ? employer.id : null)}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={existingRequests.has(employer.id)}
                  >
                    {existingRequests.has(employer.id) ? "Request Sent" : "Request Connection"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Connection</DialogTitle>
                    <DialogDescription>
                      Send a connection request to {employer.company_name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="opportunity-type">Opportunity Type (Optional)</Label>
                      <Textarea
                        id="opportunity-type"
                        placeholder="e.g., Internship, Full-time, Part-time..."
                        value={opportunityType}
                        onChange={(e) => setOpportunityType(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Introduce yourself and explain why you'd like to connect..."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        className="mt-2 min-h-[100px]"
                      />
                    </div>
                    <Button
                      onClick={() => handleSendRequest(employer.id)}
                      disabled={sendingRequest || !requestMessage.trim()}
                      className="w-full"
                    >
                      {sendingRequest ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Request"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EmployerDirectory;
