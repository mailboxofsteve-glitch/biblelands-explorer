import { BookOpen, Map, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Map,
    title: "Interactive Maps",
    description: "Explore ancient lands with rich, layered maps of Bible geography.",
  },
  {
    icon: Layers,
    title: "Custom Overlays",
    description: "Toggle trade routes, kingdom borders, and journey paths by era.",
  },
  {
    icon: BookOpen,
    title: "Guided Lessons",
    description: "Create scene-by-scene lessons that bring scripture to life.",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent" />
          <span className="text-xl font-serif font-bold tracking-wide text-foreground">BibleLands</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            Lessons
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/explore")}>
            Explore
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Log In
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-foreground leading-tight">
            Walk the Lands <br />
            <span className="text-accent">of Scripture</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            An interactive geography tool for Bible class teachers. Create lessons, pin locations, and guide your
            students through the ancient world — scene by scene.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={() => navigate("/lessons")}>
              <Plus className="h-4 w-4 mr-1" />
              Create a Lesson
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/explore")}>
              Explore the Map
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-border/40 bg-card p-6 text-left space-y-3">
              <f.icon className="h-8 w-8 text-accent" />
              <h3 className="text-lg font-serif font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4 text-center text-xs text-muted-foreground">
        BibleLands — Built for teachers who love the Word.
      </footer>
    </div>
  );
};

export default Index;
