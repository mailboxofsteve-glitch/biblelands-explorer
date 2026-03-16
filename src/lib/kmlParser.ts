export interface ParsedKmlLocation {
  name_ancient: string;
  name_modern: string;
  location_type: string;
  lat: number;
  lng: number;
  primary_verse: string;
  description: string;
  isDuplicate?: boolean;
  selected?: boolean;
}

export interface ParsedKmlOverlay {
  name: string;
  slug: string;
  category: string;
  geojson: GeoJSON.FeatureCollection;
  default_color: string;
  primary_verse: string;
  selected?: boolean;
  vertexCount: number;
}

const STYLE_TYPE_MAP: Record<string, string> = {
  "#landpoint": "city",
  "#landrepresentativepoint": "city",
  "#waterpoint": "river",
  "#waterrepresentativepoint": "sea",
  "#water": "river",
  "#region": "region",
};

// Styles that indicate polygon/region data (isobands, region fills, water areas)
const POLYGON_STYLES = new Set([
  "#landisobands",
  "#waterisobands",
  "#region",
  "#water",
]);

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function extractVerseRef(descriptionHtml: string): string {
  const stripped = stripHtml(descriptionHtml);
  return stripped.trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePolygonCoords(coordsText: string): number[][] {
  return coordsText
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const parts = pair.split(",");
      if (parts.length < 2) return null;
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (isNaN(lng) || isNaN(lat)) return null;
      return [lng, lat];
    })
    .filter((p): p is number[] => p !== null);
}

const NS = "http://www.opengis.net/kml/2.2";

/**
 * Checks whether a folder contains polygon placemarks (region/isoband data).
 */
function folderHasPolygons(folder: Element): boolean {
  const placemarks = folder.getElementsByTagNameNS(NS, "Placemark");
  for (let j = 0; j < placemarks.length; j++) {
    const pm = placemarks[j];
    // Only consider direct-child placemarks or those within immediate sub-folders
    const polygon = pm.getElementsByTagNameNS(NS, "Polygon")[0];
    if (!polygon) continue;
    const styleUrlEl = pm.getElementsByTagNameNS(NS, "styleUrl")[0];
    const styleUrl = styleUrlEl?.textContent?.trim() ?? "";
    if (POLYGON_STYLES.has(styleUrl)) return true;
  }
  return false;
}

/**
 * Parse KML and extract point locations (excluding region/polygon entries).
 */
export function parseKml(kmlString: string): ParsedKmlLocation[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, "application/xml");
  const results: ParsedKmlLocation[] = [];

  // Get only top-level folders (direct children of Document)
  const documentEl = doc.getElementsByTagNameNS(NS, "Document")[0];
  if (!documentEl) return results;

  const topFolders: Element[] = [];
  for (let i = 0; i < documentEl.children.length; i++) {
    const child = documentEl.children[i];
    if (child.localName === "Folder") topFolders.push(child);
  }

  for (const folder of topFolders) {
    const folderNameEl = folder.querySelector(":scope > name");
    const nameAncient = folderNameEl?.textContent?.trim() ?? "";
    if (!nameAncient) continue;

    // Skip folders that are primarily polygon/region data
    if (folderHasPolygons(folder)) continue;

    const folderDescEl = folder.querySelector(":scope > description");
    const verseRef = folderDescEl ? extractVerseRef(folderDescEl.textContent || "") : "";

    // Find first Placemark with a Point
    const placemarks = folder.getElementsByTagNameNS(NS, "Placemark");

    for (let j = 0; j < placemarks.length; j++) {
      const pm = placemarks[j];
      const point = pm.getElementsByTagNameNS(NS, "Point")[0];
      if (!point) continue;

      const coordsEl = point.getElementsByTagNameNS(NS, "coordinates")[0];
      if (!coordsEl) continue;

      const coordsText = coordsEl.textContent?.trim() ?? "";
      const parts = coordsText.split(",");
      if (parts.length < 2) continue;

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (isNaN(lng) || isNaN(lat)) continue;

      const styleUrlEl = pm.getElementsByTagNameNS(NS, "styleUrl")[0];
      const styleUrl = styleUrlEl?.textContent?.trim() ?? "";
      const locationType = STYLE_TYPE_MAP[styleUrl] ?? "city";

      const pmNameEl = pm.querySelector("name");
      const pmName = pmNameEl?.textContent?.trim() ?? "";
      const slashIdx = pmName.indexOf(" / ");
      const nameModern = slashIdx >= 0 ? pmName.substring(slashIdx + 3) : "";

      const pmDescEl = pm.querySelector("description");
      const pmDesc = pmDescEl?.textContent?.trim() ?? "";

      results.push({
        name_ancient: nameAncient,
        name_modern: nameModern,
        location_type: locationType,
        lat,
        lng,
        primary_verse: verseRef,
        description: pmDesc,
        selected: true,
      });

      break; // Only first Point placemark per folder
    }
  }

  return results;
}

/**
 * Parse KML and extract polygon/region entries as overlay candidates.
 * Uses the highest-confidence isoband polygon (first one) per folder.
 */
export function parseKmlOverlays(kmlString: string): ParsedKmlOverlay[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, "application/xml");
  const results: ParsedKmlOverlay[] = [];

  const documentEl = doc.getElementsByTagNameNS(NS, "Document")[0];
  if (!documentEl) return results;

  const topFolders: Element[] = [];
  for (let i = 0; i < documentEl.children.length; i++) {
    const child = documentEl.children[i];
    if (child.localName === "Folder") topFolders.push(child);
  }

  for (const folder of topFolders) {
    const folderNameEl = folder.querySelector(":scope > name");
    const name = folderNameEl?.textContent?.trim() ?? "";
    if (!name) continue;

    if (!folderHasPolygons(folder)) continue;

    const folderDescEl = folder.querySelector(":scope > description");
    const verseRef = folderDescEl ? extractVerseRef(folderDescEl.textContent || "") : "";

    // Collect all polygon features from this folder (including sub-folders)
    const features: GeoJSON.Feature[] = [];
    const allPlacemarks = folder.getElementsByTagNameNS(NS, "Placemark");

    // We'll take only the first (highest confidence) polygon per sub-folder grouping
    const seenSubFolders = new Set<string>();

    for (let j = 0; j < allPlacemarks.length; j++) {
      const pm = allPlacemarks[j];
      const polygon = pm.getElementsByTagNameNS(NS, "Polygon")[0];
      if (!polygon) continue;

      const styleUrlEl = pm.getElementsByTagNameNS(NS, "styleUrl")[0];
      const styleUrl = styleUrlEl?.textContent?.trim() ?? "";
      if (!POLYGON_STYLES.has(styleUrl)) continue;

      // Get the parent sub-folder name to group by candidate
      const parentFolder = pm.parentElement;
      const parentName = parentFolder?.querySelector(":scope > name")?.textContent?.trim() ?? "";
      if (seenSubFolders.has(parentName)) continue;
      seenSubFolders.add(parentName);

      const outerBoundary = polygon.getElementsByTagNameNS(NS, "outerBoundaryIs")[0];
      if (!outerBoundary) continue;
      const linearRing = outerBoundary.getElementsByTagNameNS(NS, "LinearRing")[0];
      if (!linearRing) continue;
      const coordsEl = linearRing.getElementsByTagNameNS(NS, "coordinates")[0];
      if (!coordsEl) continue;

      const coords = parsePolygonCoords(coordsEl.textContent ?? "");
      if (coords.length < 3) continue;

      // Ensure ring is closed
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([...first]);
      }

      features.push({
        type: "Feature",
        properties: { name: parentName || name },
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      });
    }

    if (features.length === 0) continue;

    const totalVertices = features.reduce((sum, f) => {
      const geom = f.geometry as GeoJSON.Polygon;
      return sum + (geom.coordinates[0]?.length ?? 0);
    }, 0);

    results.push({
      name,
      slug: slugify(name),
      category: "region",
      geojson: { type: "FeatureCollection", features },
      default_color: "#c8a020",
      primary_verse: verseRef,
      selected: true,
      vertexCount: totalVertices,
    });
  }

  return results;
}
