import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, LogOut, MapPin, Layers, GraduationCap, Users, Plus, Pencil, Trash2, ArrowLeft, Map } from "lucide-react";
import { format } from "date-fns";
import { ERAS } from "@/store/mapStore";
import AdminMapPicker from "@/components/Admin/AdminMapPicker";

const LOCATION_TYPES = ["city", "mountain", "river", "region", "sea", "desert", "road"];
const OVERLAY_CATEGORIES = ["route", "territory", "empire", "region"];

/* ------------------------------------------------------------------ */
/*  Locations Tab                                                      */
/* ------------------------------------------------------------------ */
function LocationsTab() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name_ancient: "", name_modern: "", location_type: "city", era_tags: [] as string[], primary_verse: "", description: "", lat: "32.0", lng: "35.5" });

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase.from("locations_with_coords").select("*").order("name_ancient");
    setLocations(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name_ancient: "", name_modern: "", location_type: "city", era_tags: [], primary_verse: "", description: "", lat: "32.0", lng: "35.5" });
    setModalOpen(true);
  };

  const openEdit = (loc: any) => {
    setEditing(loc);
    setForm({
      name_ancient: loc.name_ancient,
      name_modern: loc.name_modern ?? "",
      location_type: loc.location_type ?? "city",
      era_tags: loc.era_tags ?? [],
      primary_verse: loc.primary_verse ?? "",
      description: loc.description ?? "",
      lat: String(loc.lat ?? "32.0"),
      lng: String(loc.lng ?? "35.5"),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const pointWkt = `SRID=4326;POINT(${parseFloat(form.lng)} ${parseFloat(form.lat)})`;
    const payload: any = {
      name_ancient: form.name_ancient,
      name_modern: form.name_modern || null,
      location_type: form.location_type,
      era_tags: form.era_tags,
      primary_verse: form.primary_verse || null,
      description: form.description || null,
      coordinates: pointWkt,
    };

    if (editing) {
      const { error } = await supabase.from("locations").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Location updated" });
    } else {
      const { error } = await supabase.from("locations").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Location added" });
    }
    setModalOpen(false);
    fetchLocations();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Location deleted" });
    fetchLocations();
  };

  const toggleEra = (era: string) => {
    setForm((f) => ({
      ...f,
      era_tags: f.era_tags.includes(era) ? f.era_tags.filter((e) => e !== era) : [...f.era_tags, era],
    }));
  };

  const handleMapPointChange = useCallback((lngLat: [number, number]) => {
    setForm((f) => ({ ...f, lng: lngLat[0].toFixed(5), lat: lngLat[1].toFixed(5) }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-serif font-semibold text-foreground">Locations</h2>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Location</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ancient Name</TableHead>
              <TableHead>Modern Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Eras</TableHead>
              <TableHead>Verse</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium">{loc.name_ancient}</TableCell>
                <TableCell>{loc.name_modern ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{loc.location_type}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(loc.era_tags ?? []).map((e: string) => (
                      <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{loc.primary_verse ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(loc.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Ancient Name *</Label><Input value={form.name_ancient} onChange={(e) => setForm((f) => ({ ...f, name_ancient: e.target.value }))} /></div>
            <div><Label>Modern Name</Label><Input value={form.name_modern} onChange={(e) => setForm((f) => ({ ...f, name_modern: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.location_type} onValueChange={(v) => setForm((f) => ({ ...f, location_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Eras</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ERAS.map((era) => (
                  <Badge key={era.id} variant={form.era_tags.includes(era.id) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleEra(era.id)}>{era.label}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5 mb-1"><Map className="h-3.5 w-3.5" /> Pick on Map</Label>
              {modalOpen && (
                <AdminMapPicker
                  mode="point"
                  initialCenter={[parseFloat(form.lng) || 35.5, parseFloat(form.lat) || 32.0]}
                  onPointChange={handleMapPointChange}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Latitude</Label><Input type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} /></div>
              <div><Label>Longitude</Label><Input type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} /></div>
            </div>
            <div><Label>Primary Verse</Label><Input value={form.primary_verse} onChange={(e) => setForm((f) => ({ ...f, primary_verse: e.target.value }))} placeholder="e.g. Genesis 12:1" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name_ancient}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overlays Tab                                                       */
/* ------------------------------------------------------------------ */
function OverlaysTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [overlays, setOverlays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", era: ERAS[0].id as string, category: "route", default_color: "#c8a020", geojson: "", is_preloaded: true });

  const fetchOverlays = useCallback(async () => {
    const { data } = await supabase.from("overlays").select("*").eq("is_preloaded", true).order("name");
    setOverlays(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOverlays(); }, [fetchOverlays]);

  const openAdd = () => {
    setEditing(null);
    setDrawMode(false);
    setForm({ name: "", slug: "", era: ERAS[0].id, category: "route", default_color: "#c8a020", geojson: "", is_preloaded: true });
    setModalOpen(true);
  };

  const openEdit = (ov: any) => {
    setEditing(ov);
    setDrawMode(false);
    setForm({
      name: ov.name,
      slug: ov.slug,
      era: ov.era,
      category: ov.category,
      default_color: ov.default_color,
      geojson: JSON.stringify(ov.geojson, null, 2),
      is_preloaded: ov.is_preloaded,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let parsedGeo: any;
    try { parsedGeo = JSON.parse(form.geojson); } catch {
      toast({ title: "Invalid GeoJSON", variant: "destructive" }); return;
    }

    const payload: any = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
      era: form.era,
      category: form.category,
      default_color: form.default_color,
      geojson: parsedGeo,
      is_preloaded: form.is_preloaded,
      created_by: user?.id,
    };

    if (editing) {
      const { error } = await supabase.from("overlays").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Overlay updated" });
    } else {
      const { error } = await supabase.from("overlays").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Overlay added" });
    }
    setModalOpen(false);
    fetchOverlays();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("overlays").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Overlay deleted" });
    fetchOverlays();
  };

  const drawPickerMode = (form.category === "route") ? "line" as const : "polygon" as const;

  const handleDrawCoordinatesChange = useCallback((coords: number[][]) => {
    if (coords.length < 2) return;
    const isPolygon = drawPickerMode === "polygon";
    const geojson: any = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: isPolygon && coords.length >= 3
          ? { type: "Polygon", coordinates: [[...coords, coords[0]]] }
          : { type: "LineString", coordinates: coords },
      }],
    };
    setForm((f) => ({ ...f, geojson: JSON.stringify(geojson, null, 2) }));
  }, [drawPickerMode]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-serif font-semibold text-foreground">Preloaded Overlays</h2>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Overlay</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Era</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overlays.map((ov) => (
              <TableRow key={ov.id}>
                <TableCell className="font-medium">{ov.name}</TableCell>
                <TableCell><Badge variant="secondary">{ov.era}</Badge></TableCell>
                <TableCell>{ov.category}</TableCell>
                <TableCell><div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: ov.default_color }} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(ov)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ov.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Edit Overlay" : "Add Overlay"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto-generated if empty" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Era</Label>
                <Select value={form.era} onValueChange={(v) => setForm((f) => ({ ...f, era: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ERAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OVERLAY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.default_color} onChange={(e) => setForm((f) => ({ ...f, default_color: e.target.value }))} className="h-8 w-12 rounded border border-input cursor-pointer" />
                <span className="text-xs text-muted-foreground">{form.default_color}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>GeoJSON *</Label>
                <Button type="button" variant={drawMode ? "default" : "outline"} size="sm" onClick={() => setDrawMode((d) => !d)}>
                  <Map className="h-3.5 w-3.5 mr-1" /> {drawMode ? "Hide Map" : "Draw on Map"}
                </Button>
              </div>
              {drawMode && modalOpen && (
                <AdminMapPicker
                  mode={drawPickerMode}
                  onCoordinatesChange={handleDrawCoordinatesChange}
                  className="mb-2"
                />
              )}
              <Textarea value={form.geojson} onChange={(e) => setForm((f) => ({ ...f, geojson: e.target.value }))} rows={drawMode ? 3 : 6} placeholder='{"type":"FeatureCollection","features":[...]}' className="font-mono text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_preloaded} onCheckedChange={(v) => setForm((f) => ({ ...f, is_preloaded: v }))} />
              <Label>Preloaded (visible to all teachers)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.geojson}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lessons Tab                                                        */
/* ------------------------------------------------------------------ */
function LessonsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", description: "", era: ERAS[0].id });

  const fetchLessons = useCallback(async () => {
    const { data } = await supabase
      .from("lessons")
      .select("id, title, description, era, scene_count, is_public, is_featured, updated_at")
      .eq("is_public", true)
      .order("is_featured", { ascending: false })
      .order("updated_at", { ascending: false });
    setLessons(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);

  const toggleFeatured = async (id: string, current: boolean) => {
    const { error } = await supabase.from("lessons").update({ is_featured: !current } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: !current ? "Lesson featured" : "Lesson unfeatured" });
    fetchLessons();
  };

  const handleCreateLesson = async () => {
    if (!user) return;
    const { error } = await supabase.from("lessons").insert({
      title: newLesson.title || "Untitled Lesson",
      description: newLesson.description || null,
      era: newLesson.era,
      teacher_id: user.id,
      is_public: true,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Lesson created" });
    setCreateOpen(false);
    setNewLesson({ title: "", description: "", era: ERAS[0].id });
    fetchLessons();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-serif font-semibold text-foreground">Public Lessons</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Lesson</Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : lessons.length === 0 ? (
        <p className="text-muted-foreground text-sm">No public lessons yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Era</TableHead>
              <TableHead>Scenes</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Featured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.title}</TableCell>
                <TableCell>{l.era ? <Badge variant="secondary">{l.era}</Badge> : "—"}</TableCell>
                <TableCell>{l.scene_count}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(l.updated_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Switch checked={l.is_featured} onCheckedChange={() => toggleFeatured(l.id, l.is_featured)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Create Lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={newLesson.title} onChange={(e) => setNewLesson((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Abraham's Journey" /></div>
            <div><Label>Description</Label><Textarea value={newLesson.description} onChange={(e) => setNewLesson((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Era</Label>
              <Select value={newLesson.era} onValueChange={(v) => setNewLesson((f) => ({ ...f, era: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ERAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateLesson} disabled={!newLesson.title}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Users Tab                                                          */
/* ------------------------------------------------------------------ */
function UsersTab() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) { toast({ title: "Error loading users", description: error.message, variant: "destructive" }); return; }
    setUsers(data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const makeAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "User promoted to admin" });
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif font-semibold text-foreground">Users</h2>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>{u.display_name ?? "—"}</TableCell>
                <TableCell>{u.lesson_count}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => makeAdmin(u.user_id)}>Make Admin</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin Page                                                         */
/* ------------------------------------------------------------------ */
const Admin = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent" />
          <span className="text-xl font-serif font-bold tracking-wide text-foreground">BibleLands</span>
          <Badge variant="secondary" className="ml-2">Admin</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/login"); }}>
            <LogOut className="h-4 w-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="locations" className="space-y-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="locations" className="gap-1.5"><MapPin className="h-4 w-4" /> Locations</TabsTrigger>
            <TabsTrigger value="overlays" className="gap-1.5"><Layers className="h-4 w-4" /> Overlays</TabsTrigger>
            <TabsTrigger value="lessons" className="gap-1.5"><GraduationCap className="h-4 w-4" /> Lessons</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Users</TabsTrigger>
          </TabsList>

          <TabsContent value="locations"><LocationsTab /></TabsContent>
          <TabsContent value="overlays"><OverlaysTab /></TabsContent>
          <TabsContent value="lessons"><LessonsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
