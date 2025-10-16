import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";

const News = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-[50px] hover:opacity-80 transition-opacity" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/athletes" className="text-foreground hover:text-primary font-medium transition-colors">
              Athletes
            </Link>
            <Link to="/employers" className="text-foreground hover:text-primary font-medium transition-colors">
              Partners
            </Link>
            <Link to="/news" className="text-primary font-medium">
              News
            </Link>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Latest News
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stay updated on success stories, platform updates, and career insights for U.S. Ski & Snowboard athletes.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="shadow-elegant hover:shadow-hover transition-shadow">
                <CardHeader>
                  <CardTitle>2025-26 Stifel U.S. Freestyle Ski Team Announced</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">October 15, 2025 • Park City, Utah</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    U.S. Ski & Snowboard officially announced the 30 athletes who have accepted their nominations are named to the 2025-26 Stifel U.S. Freestyle Ski Team rosters for moguls and aerials.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-hover transition-shadow">
                <CardHeader>
                  <CardTitle>2025-26 Stifel U.S. Cross Country Ski Team Announced</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">2025</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    U.S. Ski & Snowboard officially announces the 21 athletes who have formally accepted their nominations to the 2025-26 Stifel U.S. Cross Country Ski Team. The team was nominated based on pre-determined selection criteria.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-hover transition-shadow">
                <CardHeader>
                  <CardTitle>2025-26 Stifel U.S. Alpine Ski Team Announced</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">2025</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    U.S. Ski & Snowboard has officially announced the 49 athletes named to the Stifel U.S. Alpine Ski Team for the 2025-26 season.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-hover transition-shadow">
                <CardHeader>
                  <CardTitle>Kate Delson is 'On The Rise'</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">2025</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Kate Delson made an immeasurable impact on the World Cup during her first full season on the circuit. Between her first podiums, first World Cup wins, and a World Championships silver medal, Kate was unstoppable. Delson got her start as a skier before transitioning to snowboarding, where her passion was in the park. Growing up in Mammoth Lakes, California, it was only a matter of time before Delson found herself on the snow.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-hover transition-shadow">
                <CardHeader>
                  <CardTitle>Two-Time Olympian Casey Larson Announces Retirement from Competitive Ski Jumping</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">2025</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    After more than a decade on the international stage, two-time Olympian Casey Larson of the Stifel U.S. Ski Jumping Team announced his retirement from competitive ski jumping.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-hover transition-shadow">
                <CardHeader>
                  <CardTitle>Kylie Kariotis is 'On The Rise'</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">2025</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    The 2024-25 season was nothing short of spectacular for Kylie Kariotis. Despite previously starting in only six World Cups, Kariotis took the circuit by storm this year and earned personal bests week after week, traveling across the world when she previously thought she was going to be competing in NorAms. Her steady rise in results led her to a fourth-place finish at the Beidahu World Cup, which was enough to earn a spot on her first World Championships team. This was not an opportunity she took lightly, and she ended up finishing fourth in dual moguls at World Championships.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant hover:shadow-hover transition-shadow">
                <CardHeader>
                  <CardTitle>Stifel U.S. Ski Team Fundraiser Raises Record $1.375 Million in St. Louis</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">2025</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    In its 10th year, Ron Kruszewski, Chairman of the Board and Chief Executive Officer of Stifel Financial Corp. and U.S. Ski & Snowboard Trustee, hosted the annual Stifel U.S. Ski Team fundraiser in St. Louis. The yearly event broke previous records, raising $1.375 million for all ski teams under the U.S. Ski & Snowboard umbrella, including alpine, cross country, freestyle, freeski, ski jumping, nordic combined and Para alpine.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 U.S. Ski & Snowboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default News;
