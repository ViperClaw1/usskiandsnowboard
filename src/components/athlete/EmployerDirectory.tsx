import { useState, useEffect, useMemo, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2, FilterX, Link as LinkIcon, Search, X, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectoryCardSkeleton } from "@/components/ui/skeleton-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  connection_to_ussa: string | null;
  website: string | null;
  linkedin_url: string | null;
  job_board_url: string | null;
  individual_roles: Array<{ title: string; type: string; url: string; location: string }> | null;
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
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerProfile | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCompanySize, setFilterCompanySize] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEmployers();
    loadAthleteProfile();

    // Set up real-time subscription for connection requests
    const channel = supabase
      .channel('athlete_connection_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
        },
        () => {
          // Reload existing requests when any change happens
          if (athleteProfileId) {
            loadExistingRequests(athleteProfileId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteProfileId]);

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
        .select("employer_id, status")
        .eq("athlete_id", athleteId)
        .in("status", ["pending", "accepted"]); // Only count active requests

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

      setEmployers((data as unknown as EmployerProfile[]) || []);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const { data: insertedRequest, error } = await supabase
        .from("connection_requests")
        .insert({
          athlete_id: athleteProfileId,
          employer_id: employerId,
          message: requestMessage,
          opportunity_type: opportunityType || null,
          status: "pending",
          initiated_by_user_id: user.id
        })
        .select("id")
        .single();

      if (error) throw error;

      if (insertedRequest?.id) {
        await supabase.functions.invoke('send-connection-notification', {
          body: {
            notification_type: 'new_request',
            request_id: insertedRequest.id,
          }
        });
      }

      toast.success("Connection request sent!");
      setRequestMessage("");
      setOpportunityType("");
      setOpenDialogId(null);
      
      // Add to existing requests
      setExistingRequests(prev => new Set([...prev, employerId]));
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

  // Filter employers based on search term and selected filters
  const filteredEmployers = useMemo(() => {
    return employers.filter(employer => {
      // Filter by dropdown selections
      if (filterCompanySize !== "all" && employer.company_size !== filterCompanySize) return false;
      if (filterLocation !== "all" && employer.hq_location !== filterLocation) return false;
      if (filterIndustry !== "all" && employer.industry !== filterIndustry) return false;
      
      // Filter by search term
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const searchableFields = [
          employer.company_name,
          employer.industry,
          employer.about,
          employer.opportunities_offered,
          employer.contact_person,
        ].filter(Boolean).join(" ").toLowerCase();
        
        if (!searchableFields.includes(search)) return false;
      }
      
      return true;
    });
  }, [employers, filterCompanySize, filterLocation, filterIndustry, searchTerm]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCompanySize("all");
    setFilterLocation("all");
    setFilterIndustry("all");
  };

  // Pull to refresh functionality
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEmployers();
    setIsRefreshing(false);
    setPullDistance(0);
  };

  const pullHandlers = useSwipeable({
    onSwipedDown: (eventData) => {
      if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && eventData.deltaY > 100) {
        handleRefresh();
      }
    },
    onSwiping: (eventData) => {
      if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && eventData.deltaY > 0) {
        setPullDistance(Math.min(eventData.deltaY, 100));
      }
    },
    trackMouse: false,
    trackTouch: true,
  });

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-4"><Skeleton className="h-10 w-full" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-card rounded-lg border">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DirectoryCardSkeleton />
          <DirectoryCardSkeleton />
          <DirectoryCardSkeleton />
        </div>
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
      <div ref={scrollContainerRef} {...pullHandlers} className="relative">
        {/* Pull to refresh indicator */}
        {pullDistance > 0 && (
          <div 
            className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 bg-primary/10 transition-all duration-200"
            style={{ transform: `translateY(${pullDistance - 100}px)` }}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="ml-2 text-sm">{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by company, industry, opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

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
    <div ref={scrollContainerRef} {...pullHandlers} className="relative">
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 bg-primary/10 transition-all duration-200 z-50"
          style={{ transform: `translateY(${pullDistance - 100}px)` }}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-sm">{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by company, industry, opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

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
        {(searchTerm || filterCompanySize !== "all" || filterLocation !== "all" || filterIndustry !== "all") && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployers.map((employer) => (
          <Card key={employer.id} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50" onClick={() => setSelectedEmployer(employer)}>
            <CardHeader className="pb-3">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  {employer.logo_url ? (
                    <img 
                      src={employer.logo_url} 
                      alt={`${employer.company_name} logo`}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="h-12 w-12 text-primary" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="text-center w-full">
                  <CardTitle className="text-lg">{employer.company_name}</CardTitle>
                  {employer.industry && (
                    <p className="text-sm text-muted-foreground">{employer.industry}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {employer.about && (
                <p className="text-sm text-muted-foreground line-clamp-3">{employer.about}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {employer.company_size && (
                  <Badge variant="outline" className="text-xs">{employer.company_size}</Badge>
                )}
                {employer.hq_location && (
                  <Badge variant="outline" className="text-xs">{employer.hq_location}</Badge>
                )}
              </div>

              {employer.website && (
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-3 w-3 text-muted-foreground" />
                  <a 
                    href={employer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {employer.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              {employer.contact_person && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Contact</p>
                  <p className="text-sm text-muted-foreground">{employer.contact_person}</p>
                  {employer.contact_title && (
                    <p className="text-xs text-muted-foreground">{employer.contact_title}</p>
                  )}
                </div>
              )}
              
              <Button 
                className="w-full" 
                disabled={existingRequests.has(employer.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEmployer(employer);
                  setShowRequestDialog(true);
                }}
              >
                {existingRequests.has(employer.id) ? "Request Sent" : "Request Connection"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partner Details Dialog */}
      {selectedEmployer && !showRequestDialog && (
        <Dialog open={!!selectedEmployer} onOpenChange={(open) => !open && setSelectedEmployer(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedEmployer.company_name}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="profile" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="positions">Featured Positions</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6 mt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {selectedEmployer.logo_url ? (
                      <img
                        src={selectedEmployer.logo_url}
                        alt={`${selectedEmployer.company_name} logo`}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <AvatarFallback>
                        <Building2 className="h-12 w-12 text-primary" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedEmployer.company_name}</h3>
                    {selectedEmployer.industry && (
                      <p className="text-sm text-muted-foreground">{selectedEmployer.industry}</p>
                    )}
                  </div>
                </div>

                {selectedEmployer.about && (
                  <div>
                    <h4 className="font-medium mb-2">About our company</h4>
                    <p className="text-sm text-muted-foreground">{selectedEmployer.about}</p>
                  </div>
                )}

                {selectedEmployer.connection_to_ussa && (
                  <div>
                    <h4 className="font-medium mb-2">What's our connection to US Ski & Snowboard</h4>
                    <p className="text-sm text-muted-foreground">{selectedEmployer.connection_to_ussa}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedEmployer.company_size && (
                    <div>
                      <p className="text-sm font-medium">Company Size</p>
                      <p className="text-sm text-muted-foreground">{selectedEmployer.company_size}</p>
                    </div>
                  )}
                  {selectedEmployer.hq_location && (
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{selectedEmployer.hq_location}</p>
                    </div>
                  )}
                </div>

                {selectedEmployer.contact_person && (
                  <div>
                    <h4 className="font-medium mb-2">Contact Person</h4>
                    <p className="text-sm">{selectedEmployer.contact_person}</p>
                    {selectedEmployer.contact_title && (
                      <p className="text-sm text-muted-foreground">{selectedEmployer.contact_title}</p>
                    )}
                    {selectedEmployer.contact_email && (
                      <p className="text-sm text-muted-foreground">{selectedEmployer.contact_email}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedEmployer.website && (
                    <Button variant="outline" asChild className="flex-1">
                      <a href={selectedEmployer.website} target="_blank" rel="noopener noreferrer">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  )}
                  {selectedEmployer.linkedin_url && (
                    <Button variant="outline" asChild className="flex-1">
                      <a href={selectedEmployer.linkedin_url} target="_blank" rel="noopener noreferrer">
                        LinkedIn
                      </a>
                    </Button>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setShowRequestDialog(true);
                  }}
                  className="w-full"
                  disabled={existingRequests.has(selectedEmployer.id)}
                >
                  {existingRequests.has(selectedEmployer.id) ? "Request Sent" : "Request Connection"}
                </Button>
              </TabsContent>

              <TabsContent value="positions" className="mt-6">
                {(selectedEmployer.individual_roles && selectedEmployer.individual_roles.length > 0) || selectedEmployer.job_board_url ? (
                  <div className="space-y-4">
                    <h4 className="font-medium mb-4">Featured Positions</h4>

                    {selectedEmployer.individual_roles && selectedEmployer.individual_roles.length > 0 && (
                      <>
                        {selectedEmployer.individual_roles.map((role, index) => (
                          <Card key={index}>
                            <CardContent className="pt-6">
                              <div className="space-y-2">
                                <h5 className="font-semibold">{role.title}</h5>
                                <div className="flex flex-wrap gap-2">
                                  {role.type && (
                                    <Badge variant="secondary" className="text-xs">{role.type}</Badge>
                                  )}
                                  {role.location && (
                                    <Badge variant="outline" className="text-xs">{role.location}</Badge>
                                  )}
                                </div>
                                {role.url && (
                                  <Button variant="outline" size="sm" asChild className="mt-2">
                                    <a
                                      href={role.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <LinkIcon className="mr-2 h-3 w-3" />
                                      View Details
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </>
                    )}
                    
                    {selectedEmployer.job_board_url && (
                      <Button variant="outline" asChild className="w-full">
                        <a href={selectedEmployer.job_board_url} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="mr-2 h-4 w-4" />
                          View All Positions on Job Board
                        </a>
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setShowRequestDialog(true);
                      }}
                      className="w-full mt-4"
                      disabled={existingRequests.has(selectedEmployer.id)}
                    >
                      {existingRequests.has(selectedEmployer.id) ? "Request Sent" : "Request Connection"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No featured positions available at this time.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Request Dialog */}
      {selectedEmployer && showRequestDialog && (
        <Dialog open={showRequestDialog} onOpenChange={(open) => {
          setShowRequestDialog(open);
          if (!open) {
            setRequestMessage("");
            setOpportunityType("");
          }
        }}>
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Request Connection</DialogTitle>
              <DialogDescription>
                Send a connection request to {selectedEmployer.company_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <Label htmlFor="opportunity-type">Opportunity Type (Optional)</Label>
                <Select value={opportunityType} onValueChange={setOpportunityType}>
                  <SelectTrigger id="opportunity-type" className="mt-2">
                    <SelectValue placeholder="Select opportunity type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                    {selectedEmployer.individual_roles && selectedEmployer.individual_roles.filter(role => role.title && role.title.trim()).map((role, index) => (
                      <SelectItem key={index} value={role.title}>
                        {role.title}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
            <div className="pt-4 border-t">
              <Button
                onClick={() => handleSendRequest(selectedEmployer.id)}
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
      )}
    </div>
  );
};

export default EmployerDirectory;
