import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  TrendingUp,
  Network,
  Gauge,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Zap,
  Clock,
  Truck,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: "GFA",
      description: "Green Field Analysis",
      details: "Optimize facility placement with advanced location intelligence and cost-to-serve analysis",
      route: "/gfa",
      color: "primary",
    },
    {
      icon: TrendingUp,
      title: "Demand Forecasting",
      description: "Predictive Analytics",
      details: "Leverage statistical models and machine learning for accurate demand planning",
      route: "/demand-forecasting",
      color: "secondary",
    },
    {
      icon: Network,
      title: "Network Analysis",
      description: "Supply Chain Optimization",
      details: "Visualize and optimize your entire supply network with real-time flow analysis",
      route: "/network",
      color: "accent",
      comingSoon: true,
    },
    {
      icon: Gauge,
      title: "Simulation-based Inventory",
      description: "Monte Carlo Optimization",
      details: "Service-level aware inventory policies using advanced stochastic modeling",
      route: "/inventory-optimization-v2",
      color: "primary",
    },
    {
      icon: Truck,
      title: "Transportation Optimization",
      description: "Route & Load Planning",
      details: "Optimize transportation routes, loads, and logistics for cost-efficient delivery",
      route: "/transportation",
      color: "secondary",
      comingSoon: true,
    },
  ];

  const benefits = [
    "Multi-echelon network optimization",
    "Real-time scenario analysis",
    "Advanced statistical modeling",
    "Integrated decision support",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Zap className="h-4 w-4" />
              <span>Enterprise Supply Chain Intelligence</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Optimize Your Supply Chain
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground mb-12 leading-relaxed animate-fade-in">
              Advanced analytics platform for network design, demand planning, and inventory optimization
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in">
              <Button
                size="lg"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                onClick={() => navigate("/auth")}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm rounded-lg p-3 border"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-left">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Integrated Supply Chain Suite</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            End-to-end optimization tools built for supply chain professionals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={`group relative overflow-hidden border-2 transition-all duration-300 bg-card/80 backdrop-blur-sm ${
                  feature.comingSoon
                    ? "opacity-75 cursor-not-allowed"
                    : "hover:border-primary/50 hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                }`}
                onClick={() => !feature.comingSoon && navigate("/auth")}
              >
                {feature.comingSoon && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">Coming Soon</span>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`p-4 rounded-xl bg-${feature.color}/10 text-${feature.color} transition-transform duration-300 shadow-sm ${
                        !feature.comingSoon && "group-hover:scale-110"
                      }`}
                    >
                      <Icon className="h-8 w-8" />
                    </div>
                    {!feature.comingSoon && (
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-1">{feature.title}</CardTitle>
                  <CardDescription className="text-base font-medium text-primary/70">
                    {feature.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative">
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{feature.details}</p>
                  <Button
                    variant="ghost"
                    className={`w-full justify-between ${
                      feature.comingSoon ? "cursor-not-allowed" : "group-hover:bg-primary/10"
                    } transition-colors`}
                    disabled={feature.comingSoon}
                  >
                    {feature.comingSoon ? "Coming Soon" : "Launch Tool"}
                    {!feature.comingSoon && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <BarChart3 className="h-8 w-8 mx-auto text-primary mb-3" />
              <div className="text-4xl font-bold text-primary">5</div>
              <div className="text-sm text-muted-foreground">Optimization Modules</div>
            </div>
            <div className="space-y-2">
              <Network className="h-8 w-8 mx-auto text-secondary mb-3" />
              <div className="text-4xl font-bold text-secondary">Multi-Echelon</div>
              <div className="text-sm text-muted-foreground">Network Analysis</div>
            </div>
            <div className="space-y-2">
              <Gauge className="h-8 w-8 mx-auto text-accent mb-3" />
              <div className="text-4xl font-bold text-accent">Real-Time</div>
              <div className="text-sm text-muted-foreground">Simulation Engine</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
