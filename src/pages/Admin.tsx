import { useState, useEffect, useCallback, useMemo } from "react";
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
import { BookOpen, LogOut, MapPin, Layers, GraduationCap, Users, Plus, Pencil, Trash2, ArrowLeft, Map, ArrowUpDown, ArrowUp, ArrowDown, Search, Upload, CheckSquare, Square, FileUp, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { parseKml, parseKmlOverlays, type ParsedKmlLocation, type ParsedKmlOverlay } from "@/lib/kmlParser";
import { format } from "date-fns";
import { ERAS } from "@/store/mapStore";
import AdminMapPicker from "@/components/Admin/AdminMapPicker";

const LOCATION_TYPES = ["city", "mountain", "river", "region", "sea", "desert", "road", "battle", "people", "event", "poi"];
const OVERLAY_CATEGORIES = ["route", "territory", "empire", "region"];

/* ── Reusable sort header ─────────────────────────────── */
type SortDir = "asc" | "desc" | null;

function SortableHead({ label, field, sortField, sortDir, onSort, className }: {
  label: string; field: string; sortField: string | null; sortDir: SortDir; onSort: (f: string) => void; className?: string;
}) {
  const active = sortField === field;
  return (
    <TableHead className={`cursor-pointer select-none hover:text-foreground ${className ?? ""}`} onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </TableHead>
  );
}

function useTableSort<T>(data: T[], defaultField?: string) {
  const [sortField, setSortField] = useState<string | null>(defaultField ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultField ? "asc" : null);
  const [filterText, setFilterText] = useState("");

  const toggleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev !== field) { setSortDir("asc"); return field; }
      setSortDir((d) => { if (d === "asc") return "desc"; setSortField(null); return null; });
      return field;
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sortField || !sortDir) return data;
    return [...data].sort((a: any, b: any) => {
      const av = a[sortField]; const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortField, sortDir]);

  return { sortField, sortDir, toggleSort, filterText, setFilterText, sorted };
}

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

  const [filterText, setFilterText] = useState("");
  const filteredData = useMemo(() => {
    if (!filterText) return locations;
    const q = filterText.toLowerCase();
    return locations.filter((l) =>
      (l.name_ancient ?? "").toLowerCase().includes(q) ||
      (l.name_modern ?? "").toLowerCase().includes(q) ||
      (l.location_type ?? "").toLowerCase().includes(q) ||
      (l.primary_verse ?? "").toLowerCase().includes(q)
    );
  }, [locations, filterText]);

  const { sortField, sortDir, toggleSort, sorted } = useTableSort(filteredData, "name_ancient");

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

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter locations…" value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9 max-w-sm" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Ancient Name" field="name_ancient" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Modern Name" field="name_modern" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Type" field="location_type" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <TableHead>Eras</TableHead>
              <SortableHead label="Verse" field="primary_verse" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((loc: any) => (
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
  const [editShapes, setEditShapes] = useState<number[][][] | undefined>(undefined);
  const [form, setForm] = useState({ name: "", slug: "", era: ERAS[0].id as string, category: "route", default_color: "#c8a020", geojson: "", is_preloaded: true });

  const [filterText, setFilterText] = useState("");
  const filteredData = useMemo(() => {
    if (!filterText) return overlays;
    const q = filterText.toLowerCase();
    return overlays.filter((o) =>
      (o.name ?? "").toLowerCase().includes(q) ||
      (o.era ?? "").toLowerCase().includes(q) ||
      (o.category ?? "").toLowerCase().includes(q)
    );
  }, [overlays, filterText]);
  const { sortField, sortDir, toggleSort, sorted } = useTableSort(filteredData, "name");

  const fetchOverlays = useCallback(async () => {
    const { data } = await supabase.from("overlays").select("*").eq("is_preloaded", true).order("name");
    setOverlays(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOverlays(); }, [fetchOverlays]);

  const openAdd = () => {
    setEditing(null);
    setDrawMode(false);
    setEditShapes(undefined);
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
    setEditShapes(parseGeoJSONToShapes(ov.geojson));
    setModalOpen(true);
  };

  function parseGeoJSONToShapes(geo: any): number[][][] {
    if (!geo) return [[]];
    try {
      if (geo.type === "FeatureCollection" && Array.isArray(geo.features)) {
        const shapes: number[][][] = [];
        for (const f of geo.features) {
          const g = f.geometry;
          if (!g) continue;
          if (g.type === "Polygon" && g.coordinates?.[0]) {
            const ring = g.coordinates[0];
            const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
              ? ring.slice(0, -1) : ring;
            shapes.push(pts);
          } else if (g.type === "LineString" && g.coordinates) {
            shapes.push(g.coordinates);
          }
        }
        return shapes.length > 0 ? shapes : [[]];
      }
      if (geo.type === "Polygon" && geo.coordinates?.[0]) {
        const ring = geo.coordinates[0];
        const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
          ? ring.slice(0, -1) : ring;
        return [pts];
      }
      if (geo.type === "LineString" && geo.coordinates) {
        return [geo.coordinates];
      }
    } catch { /* fallback */ }
    return [[]];
  }

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

  const handleDrawShapesChange = useCallback((shapes: number[][][]) => {
    const isPolygon = drawPickerMode === "polygon";
    const features = shapes
      .filter(s => s.length >= 2)
      .map(coords => ({
        type: "Feature" as const,
        properties: {},
        geometry: isPolygon && coords.length >= 3
          ? { type: "Polygon" as const, coordinates: [[...coords, coords[0]]] }
          : { type: "LineString" as const, coordinates: coords },
      }));
    if (features.length === 0) return;
    const geojson = { type: "FeatureCollection", features };
    setForm((f) => ({ ...f, geojson: JSON.stringify(geojson, null, 2) }));
  }, [drawPickerMode]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-serif font-semibold text-foreground">Preloaded Overlays</h2>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Overlay</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter overlays…" value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9 max-w-sm" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Era" field="era" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Category" field="category" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <TableHead>Color</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((ov: any) => (
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
                  color={form.default_color || "#6366f1"}
                  initialShapes={editShapes}
                  onShapesChange={handleDrawShapesChange}
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
  const [newLesson, setNewLesson] = useState({ title: "", description: "", era: ERAS[0].id as string });

  const [filterText, setFilterText] = useState("");
  const filteredData = useMemo(() => {
    if (!filterText) return lessons;
    const q = filterText.toLowerCase();
    return lessons.filter((l) =>
      (l.title ?? "").toLowerCase().includes(q) ||
      (l.era ?? "").toLowerCase().includes(q)
    );
  }, [lessons, filterText]);
  const { sortField, sortDir, toggleSort, sorted } = useTableSort(filteredData, "title");

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

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter lessons…" value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9 max-w-sm" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">No public lessons yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Title" field="title" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Era" field="era" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Scenes" field="scene_count" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Updated" field="updated_at" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <TableHead>Featured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((l: any) => (
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

  const [filterText, setFilterText] = useState("");
  const filteredData = useMemo(() => {
    if (!filterText) return users;
    const q = filterText.toLowerCase();
    return users.filter((u) =>
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q)
    );
  }, [users, filterText]);
  const { sortField, sortDir, toggleSort, sorted } = useTableSort(filteredData, "email");

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

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter users…" value={filterText} onChange={(e) => setFilterText(e.target.value)} className="pl-9 max-w-sm" />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Display Name" field="display_name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Lessons" field="lesson_count" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead label="Joined" field="created_at" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((u: any) => (
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
/*  KML Import Tab                                                     */
/* ------------------------------------------------------------------ */
function ImportTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [parsed, setParsed] = useState<ParsedKmlLocation[]>([]);
  const [parsedOverlays, setParsedOverlays] = useState<ParsedKmlOverlay[]>([]);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [defaultEra, setDefaultEra] = useState<string>(ERAS[0].id);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    supabase.from("locations_with_coords").select("name_ancient").then(({ data }) => {
      const names = new Set((data ?? []).map((d: any) => (d.name_ancient ?? "").toLowerCase()));
      setExistingNames(names);
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();

    const locations = parseKml(text);
    const withDuplicates = locations.map((loc) => ({
      ...loc,
      isDuplicate: existingNames.has(loc.name_ancient.toLowerCase()),
      selected: !existingNames.has(loc.name_ancient.toLowerCase()),
    }));
    setParsed(withDuplicates);

    const overlays = parseKmlOverlays(text);
    setParsedOverlays(overlays);
  };

  const toggleSelect = (idx: number) => {
    setParsed((prev) => prev.map((loc, i) => i === idx ? { ...loc, selected: !loc.selected } : loc));
  };
  const toggleOverlaySelect = (idx: number) => {
    setParsedOverlays((prev) => prev.map((o, i) => i === idx ? { ...o, selected: !o.selected } : o));
  };

  const selectAll = () => setParsed((prev) => prev.map((loc) => ({ ...loc, selected: true })));
  const deselectAll = () => setParsed((prev) => prev.map((loc) => ({ ...loc, selected: false })));
  const selectAllOverlays = () => setParsedOverlays((prev) => prev.map((o) => ({ ...o, selected: true })));
  const deselectAllOverlays = () => setParsedOverlays((prev) => prev.map((o) => ({ ...o, selected: false })));

  const selectedCount = parsed.filter((l) => l.selected).length;
  const selectedOverlayCount = parsedOverlays.filter((o) => o.selected).length;

  const handleImport = async () => {
    const toImportLocs = parsed.filter((l) => l.selected);
    const toImportOverlays = parsedOverlays.filter((o) => o.selected);
    if (toImportLocs.length === 0 && toImportOverlays.length === 0) return;

    setImporting(true);
    setProgress(0);

    const totalItems = toImportLocs.length + toImportOverlays.length;
    let completed = 0;
    let totalInserted = 0;

    // Import locations in chunks
    const chunkSize = 50;
    for (let i = 0; i < toImportLocs.length; i += chunkSize) {
      const chunk = toImportLocs.slice(i, i + chunkSize).map((loc) => ({
        name_ancient: loc.name_ancient,
        name_modern: loc.name_modern,
        location_type: loc.location_type,
        era_tags: [defaultEra],
        primary_verse: loc.primary_verse,
        description: loc.description,
        lng: loc.lng,
        lat: loc.lat,
      }));

      const { data, error } = await supabase.rpc("bulk_insert_locations", {
        locations: chunk as any,
      });

      if (error) {
        toast({ title: "Import error", description: error.message, variant: "destructive" });
        break;
      }
      totalInserted += (data as number) ?? chunk.length;
      completed += chunk.length;
      setProgress(Math.round((completed / totalItems) * 100));
    }

    // Import overlays
    let overlaysInserted = 0;
    for (const overlay of toImportOverlays) {
      const { error } = await supabase.from("overlays").insert({
        name: overlay.name,
        slug: overlay.slug,
        category: overlay.category,
        era: defaultEra,
        geojson: overlay.geojson as any,
        default_color: overlay.default_color,
        default_style: {} as any,
        is_preloaded: true,
        created_by: user?.id,
      });

      if (error) {
        toast({ title: "Overlay import error", description: `${overlay.name}: ${error.message}`, variant: "destructive" });
      } else {
        overlaysInserted++;
      }
      completed++;
      setProgress(Math.round((completed / totalItems) * 100));
    }

    setImporting(false);
    setProgress(100);

    const parts: string[] = [];
    if (totalInserted > 0) parts.push(`${totalInserted} locations`);
    if (overlaysInserted > 0) parts.push(`${overlaysInserted} overlays`);
    toast({ title: `Imported ${parts.join(" and ")}` });

    // Update existing names & reset selection
    const newNames = new Set(existingNames);
    toImportLocs.forEach((l) => newNames.add(l.name_ancient.toLowerCase()));
    setExistingNames(newNames);
    setParsed((prev) =>
      prev.map((loc) => ({
        ...loc,
        isDuplicate: newNames.has(loc.name_ancient.toLowerCase()),
        selected: false,
      }))
    );
    setParsedOverlays((prev) => prev.map((o) => ({ ...o, selected: false })));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif font-semibold text-foreground">Import KML</h2>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex-1">
          <Label>KML File</Label>
          <div className="mt-1">
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-md p-4 hover:bg-muted/50 transition-colors">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {fileName || "Choose a .kml file…"}
              </span>
              <input type="file" accept=".kml" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>
        <div>
          <Label>Default Era</Label>
          <Select value={defaultEra} onValueChange={setDefaultEra}>
            <SelectTrigger className="mt-1 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ERAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(parsed.length > 0 || parsedOverlays.length > 0) && (
        <>
          {/* Locations Table */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />Locations</Badge>
                  <p className="text-sm text-muted-foreground">
                    {parsed.length} found · {selectedCount} selected
                    {parsed.filter((l) => l.isDuplicate).length > 0 && (
                      <span className="text-amber-600 ml-2">
                        ({parsed.filter((l) => l.isDuplicate).length} already in database)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    <CheckSquare className="h-3.5 w-3.5 mr-1" /> Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    <Square className="h-3.5 w-3.5 mr-1" /> Deselect All
                  </Button>
                </div>
              </div>

              <div className="max-h-[300px] overflow-auto border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Ancient Name</TableHead>
                      <TableHead>Modern Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Verse</TableHead>
                      <TableHead>Coordinates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((loc, idx) => (
                      <TableRow
                        key={idx}
                        className={loc.isDuplicate ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                      >
                        <TableCell>
                          <Checkbox checked={loc.selected} onCheckedChange={() => toggleSelect(idx)} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {loc.name_ancient}
                          {loc.isDuplicate && (
                            <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300 text-xs">exists</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{loc.name_modern || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{loc.location_type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{loc.primary_verse || "—"}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Overlays Table */}
          {parsedOverlays.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary"><Layers className="h-3 w-3 mr-1" />Overlays (Regions)</Badge>
                  <p className="text-sm text-muted-foreground">
                    {parsedOverlays.length} found · {selectedOverlayCount} selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllOverlays}>
                    <CheckSquare className="h-3.5 w-3.5 mr-1" /> Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllOverlays}>
                    <Square className="h-3.5 w-3.5 mr-1" /> Deselect All
                  </Button>
                </div>
              </div>

              <div className="max-h-[250px] overflow-auto border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Region Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Polygons</TableHead>
                      <TableHead>Vertices</TableHead>
                      <TableHead>Verse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedOverlays.map((overlay, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Checkbox checked={overlay.selected} onCheckedChange={() => toggleOverlaySelect(idx)} />
                        </TableCell>
                        <TableCell className="font-medium">{overlay.name}</TableCell>
                        <TableCell><Badge variant="outline">{overlay.category}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {overlay.geojson.features.length}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{overlay.vertexCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{overlay.primary_verse || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Importing…
              </p>
            </div>
          )}

          <Button onClick={handleImport} disabled={(selectedCount === 0 && selectedOverlayCount === 0) || importing}>
            <Upload className="h-4 w-4 mr-1" />
            Import {selectedCount > 0 ? `${selectedCount} Location${selectedCount !== 1 ? "s" : ""}` : ""}
            {selectedCount > 0 && selectedOverlayCount > 0 ? " + " : ""}
            {selectedOverlayCount > 0 ? `${selectedOverlayCount} Overlay${selectedOverlayCount !== 1 ? "s" : ""}` : ""}
          </Button>
        </>
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
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="locations" className="gap-1.5"><MapPin className="h-4 w-4" /> Locations</TabsTrigger>
            <TabsTrigger value="overlays" className="gap-1.5"><Layers className="h-4 w-4" /> Overlays</TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5"><Upload className="h-4 w-4" /> Import</TabsTrigger>
            <TabsTrigger value="lessons" className="gap-1.5"><GraduationCap className="h-4 w-4" /> Lessons</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Users</TabsTrigger>
          </TabsList>

          <TabsContent value="locations"><LocationsTab /></TabsContent>
          <TabsContent value="overlays"><OverlaysTab /></TabsContent>
          <TabsContent value="import"><ImportTab /></TabsContent>
          <TabsContent value="lessons"><LessonsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
