import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { copyLesson } from "@/lib/copyLesson";
import { toast } from "sonner";
import { ERAS } from "@/store/mapStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  ArrowLeft,
  Search,
  Copy,
  ExternalLink,
  Loader2,
  Layers,
  Map as MapIcon,
} from "lucide-react";

interface LibraryLesson {
  id: string;
  title: string;
  description: string | null;
  era: string | null;
  scene_count: number;
  share_token: string | null;
  thumbnail_url: string | null;
  updated_at: string;
  teacher_display_name: string | null;
}

const Library = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LibraryLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [eraFilter, setEraFilter] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "scenes">("recent");

  useEffect(() => {
    const fetchLessons = async () => {
      // Fetch public lessons
      const { data: lessonData, error } = await supabase
        .from("lessons")
        .select("id, title, description, era, scene_count, share_token, updated_at")
        .eq("is_public", true)
        .order("updated_at", { ascending: false });

      if (error) {
        toast.error("Failed to load library");
        setLoading(false);
        return;
      }

      // Fetch teacher profiles for display names
      const teacherIds = new Set<string>();
      // We need teacher_id too - re-fetch with it
      const { data: fullData } = await supabase
        .from("lessons")
        .select("id, title, description, era, scene_count, share_token, updated_at, teacher_id")
        .eq("is_public", true);

      if (fullData) {
        fullData.forEach((l) => teacherIds.add(l.teacher_id));
      }

      const profileMap = new Map<string, string>();
      if (teacherIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", Array.from(teacherIds));

        profiles?.forEach((p) => {
          if (p.display_name) profileMap.set(p.user_id, p.display_name);
        });
      }

      const mapped: LibraryLesson[] = (fullData ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        era: l.era,
        scene_count: l.scene_count,
        share_token: l.share_token,
        thumbnail_url: null,
        updated_at: l.updated_at,
        teacher_display_name: profileMap.get(l.teacher_id) ?? "Teacher",
      }));

      setLessons(mapped);
      setLoading(false);
    };

    fetchLessons();
  }, []);

  const filtered = useMemo(() => {
    let result = [...lessons];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q)
      );
    }

    // Era filter
    if (eraFilter !== "all") {
      result = result.filter((l) => l.era === eraFilter);
    }

    // Sort
    if (sort === "scenes") {
      result.sort((a, b) => b.scene_count - a.scene_count);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    return result;
  }, [lessons, search, eraFilter, sort]);

  const handleCopy = async (lessonId: string) => {
    if (!user) {
      toast.error("Sign in to copy lessons");
      navigate("/login");
      return;
    }

    setCopyingId(lessonId);
    try {
      const newId = await copyLesson(lessonId, user.id);
      toast.success("Lesson copied to your dashboard!");
      navigate(`/lesson/${newId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to copy lesson");
    } finally {
      setCopyingId(null);
    }
  };

  const eraLabel = (eraId: string | null) =>
    ERAS.find((e) => e.id === eraId)?.label ?? eraId ?? "General";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent" />
          <span className="text-xl font-serif font-bold tracking-wide text-foreground">
            Community Library
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lessons…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={eraFilter} onValueChange={setEraFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All eras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Eras</SelectItem>
              {ERAS.map((era) => (
                <SelectItem key={era.id} value={era.id}>
                  {era.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={(v) => setSort(v as "recent" | "scenes")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="scenes">Most Scenes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-muted-foreground animate-pulse font-serif py-12 text-center">
            Loading community lessons…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-card p-12 text-center space-y-4">
            <MapIcon className="h-12 w-12 text-accent mx-auto opacity-50" />
            <p className="text-muted-foreground">
              {search || eraFilter !== "all"
                ? "No lessons match your filters."
                : "No public lessons yet. Be the first to publish one!"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-lg border border-border/40 bg-card overflow-hidden flex flex-col"
              >
                {/* Thumbnail area */}
                <div className="h-32 bg-secondary/30 flex items-center justify-center">
                  {lesson.thumbnail_url ? (
                    <img
                      src={lesson.thumbnail_url}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Map className="h-10 w-10 text-muted-foreground/30" />
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-serif font-semibold text-foreground line-clamp-2">
                      {lesson.title}
                    </h3>
                    {lesson.era && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] px-1.5 py-0.5"
                      >
                        {eraLabel(lesson.era)}
                      </Badge>
                    )}
                  </div>

                  {lesson.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {lesson.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-auto pt-1">
                    <span>{lesson.teacher_display_name}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Layers size={10} />
                      {lesson.scene_count} scene
                      {lesson.scene_count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {lesson.share_token && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs gap-1"
                        onClick={() =>
                          window.open(
                            `/share/${lesson.share_token}`,
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink size={12} />
                        Preview
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1"
                      disabled={copyingId === lesson.id}
                      onClick={() => handleCopy(lesson.id)}
                    >
                      {copyingId === lesson.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Copy size={12} />
                      )}
                      Copy to My Lessons
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Library;
