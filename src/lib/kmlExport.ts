function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const REVERSE_TYPE_MAP: Record<string, string> = {
  city: "#landpoint",
  river: "#waterpoint",
  sea: "#waterrepresentativepoint",
  region: "#region",
  mountain: "#landpoint",
  desert: "#landpoint",
  road: "#landpoint",
  battle: "#landpoint",
  people: "#landpoint",
  event: "#landpoint",
  poi: "#landpoint",
};

export function locationsToKml(locations: any[]): string {
  const folders = locations.map((loc) => {
    const name = escapeXml(loc.name_ancient ?? "");
    const modern = loc.name_modern ? ` / ${escapeXml(loc.name_modern)}` : "";
    const verse = loc.primary_verse ? `<description>${escapeXml(loc.primary_verse)}</description>` : "";
    const styleUrl = REVERSE_TYPE_MAP[loc.location_type] ?? "#landpoint";
    const lat = loc.lat ?? 0;
    const lng = loc.lng ?? 0;

    const extData: string[] = [];
    if (loc.location_type) extData.push(`<Data name="location_type"><value>${escapeXml(loc.location_type)}</value></Data>`);
    if (loc.era_tags?.length) extData.push(`<Data name="era_tags"><value>${escapeXml(loc.era_tags.join(","))}</value></Data>`);
    if (loc.year_start != null) extData.push(`<Data name="year_start"><value>${loc.year_start}</value></Data>`);
    if (loc.year_end != null) extData.push(`<Data name="year_end"><value>${loc.year_end}</value></Data>`);
    if (loc.description) extData.push(`<Data name="description"><value>${escapeXml(loc.description)}</value></Data>`);

    return `    <Folder>
      <name>${name}</name>
      ${verse}
      <Placemark>
        <name>${name}${modern}</name>
        <styleUrl>${styleUrl}</styleUrl>
        <Point><coordinates>${lng},${lat},0</coordinates></Point>
        ${extData.length ? `<ExtendedData>${extData.join("")}</ExtendedData>` : ""}
      </Placemark>
    </Folder>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Locations Export</name>
${folders.join("\n")}
  </Document>
</kml>`;
}

function geojsonGeometryToKml(geometry: any): string {
  if (!geometry) return "";
  const { type, coordinates } = geometry;

  if (type === "Point") {
    return `<Point><coordinates>${coordinates[0]},${coordinates[1]},0</coordinates></Point>`;
  }
  if (type === "LineString") {
    const coords = coordinates.map((c: number[]) => `${c[0]},${c[1]},0`).join(" ");
    return `<LineString><coordinates>${coords}</coordinates></LineString>`;
  }
  if (type === "Polygon") {
    const rings = coordinates.map((ring: number[][], i: number) => {
      const coords = ring.map((c) => `${c[0]},${c[1]},0`).join(" ");
      return i === 0
        ? `<outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>`
        : `<innerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></innerBoundaryIs>`;
    }).join("");
    return `<Polygon>${rings}</Polygon>`;
  }
  if (type === "MultiPolygon") {
    return coordinates.map((poly: number[][][]) => {
      const rings = poly.map((ring, i) => {
        const coords = ring.map((c) => `${c[0]},${c[1]},0`).join(" ");
        return i === 0
          ? `<outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>`
          : `<innerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></innerBoundaryIs>`;
      }).join("");
      return `<Polygon>${rings}</Polygon>`;
    }).join("");
  }
  if (type === "MultiLineString") {
    return coordinates.map((line: number[][]) => {
      const coords = line.map((c) => `${c[0]},${c[1]},0`).join(" ");
      return `<LineString><coordinates>${coords}</coordinates></LineString>`;
    }).join("");
  }
  return "";
}

export function overlaysToKml(overlays: any[]): string {
  const folders = overlays.map((ov) => {
    const name = escapeXml(ov.name ?? "");
    const geojson = typeof ov.geojson === "string" ? JSON.parse(ov.geojson) : ov.geojson;
    const features: any[] = geojson?.features ?? [];

    const placemarks = features.map((f: any) => {
      const geomKml = geojsonGeometryToKml(f.geometry);
      if (!geomKml) return "";
      const pName = f.properties?.name ? escapeXml(f.properties.name) : name;
      return `      <Placemark>
        <name>${pName}</name>
        <Style><LineStyle><color>ff${(ov.default_color ?? "#c8a020").replace("#", "")}</color><width>2</width></LineStyle><PolyStyle><color>44${(ov.default_color ?? "#c8a020").replace("#", "")}</color></PolyStyle></Style>
        ${geomKml}
      </Placemark>`;
    }).filter(Boolean);

    const extData: string[] = [];
    if (ov.category) extData.push(`<Data name="category"><value>${escapeXml(ov.category)}</value></Data>`);
    if (ov.era) extData.push(`<Data name="era"><value>${escapeXml(ov.era)}</value></Data>`);
    if (ov.year_start != null) extData.push(`<Data name="year_start"><value>${ov.year_start}</value></Data>`);
    if (ov.year_end != null) extData.push(`<Data name="year_end"><value>${ov.year_end}</value></Data>`);

    return `    <Folder>
      <name>${name}</name>
      ${extData.length ? `<ExtendedData>${extData.join("")}</ExtendedData>` : ""}
${placemarks.join("\n")}
    </Folder>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Overlays Export</name>
${folders.join("\n")}
  </Document>
</kml>`;
}

export function downloadKml(kmlString: string, filename: string) {
  const blob = new Blob([kmlString], { type: "application/vnd.google-earth.kml+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
