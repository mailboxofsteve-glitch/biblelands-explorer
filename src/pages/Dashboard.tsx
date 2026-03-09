// RLS Policy (applied via migration):
// CREATE POLICY "own_lessons" ON lessons FOR ALL
//   USING (auth.uid() = teacher_id);

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, LogOut, Layers, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  scene_count: number;
  updated_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Fetch profile
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? user.email ?? "Teacher");
      });

    // Fetch lessons
    supabase
      .from("lessons")
      .select("id, title, description, scene_count, updated_at")
      .eq("teacher_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error loading lessons", description: error.message, variant: "destructive" });
        }
        setLessons((data as LessonRow[]) ?? []);
        setLoading(false);
      });
  }, [user, toast]);

  const createLesson = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("lessons")
      .insert({ teacher_id: user.id, title: "Untitled Lesson" })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error creating lesson", description: error.message, variant: "destructive" });
      return;
    }
    navigate(`/lesson/${data.id}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent" />
          <span className="text-xl font-serif font-bold tracking-wide text-foreground">BibleLands</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-1" /> Sign Out
        </Button>
      </header>

      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full space-y-8">
        {/* Welcome */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Welcome back, {displayName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Your saved lessons</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/library")}>
              <Library className="h-4 w-4 mr-1" /> Community Library
            </Button>
            <Button onClick={createLesson}>
              <Plus className="h-4 w-4 mr-1" /> New Lesson
            </Button>
          </div>
        </div>

        {/* Lessons grid */}
        {loading ? (
          <div className="text-muted-foreground animate-pulse font-serif">Loading lessons…</div>
        ) : lessons.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-card p-12 text-center space-y-4">
            <Layers className="h-12 w-12 text-accent mx-auto opacity-50" />
            <p className="text-muted-foreground">No lessons yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-lg border border-border/40 bg-card p-5 space-y-3 flex flex-col"
              >
                <h3 className="text-lg font-serif font-semibold text-foreground truncate">
                  {lesson.title}
                </h3>
                {lesson.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2">
                  <span>{lesson.scene_count} scene{lesson.scene_count !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{format(new Date(lesson.updated_at), "MMM d, yyyy")}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => navigate(`/lesson/${lesson.id}`)}
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
