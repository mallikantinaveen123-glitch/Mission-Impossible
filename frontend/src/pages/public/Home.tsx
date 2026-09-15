import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center text-center px-4">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-sm font-medium text-muted-foreground backdrop-blur-sm mb-4">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
          Next-Gen AI Traffic System v2.0
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          Intelligent Traffic <br />
          <span className="text-primary">Surveillance Network</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Monitor, detect, and analyze traffic violations in real-time with state-of-the-art AI. Designed for modern smart cities and law enforcement.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link to="/dashboard">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300">
              Access Dashboard
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm border-border hover:bg-muted/50 transition-all duration-300">
              Authority Login
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-20 text-left">
          <FeatureCard 
            icon={<Activity className="text-primary h-6 w-6" />}
            title="Real-Time Analytics"
            desc="Live tracking of violations and traffic flow with sub-second latency."
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-emerald-500 h-6 w-6" />}
            title="Automated Enforcement"
            desc="Instantly flag and verify incidents like red-light running or no-helmet."
          />
          <FeatureCard 
            icon={<Zap className="text-amber-500 h-6 w-6" />}
            title="AI Detection Pipeline"
            desc="Deep learning models specialized in identifying complex traffic scenarios."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-border transition-all duration-300 group">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}