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

const STYLE_TYPE_MAP: Record<string, string> = {
  "#landpoint": "city",
  "#landrepresentativepoint": "city",
  "#waterpoint": "river",
  "#waterrepresentativepoint": "sea",
  "#water": "river",
  "#region": "region",
};

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function extractVerseRef(descriptionHtml: string): string {
  // Extract "Gen 50:11" style refs from description like:
  // Gen <a href="...">50:11</a>
  const stripped = stripHtml(descriptionHtml);
  // Result: "Gen 50:11"
  return stripped.trim();
}

export function parseKml(kmlString: string): ParsedKmlLocation[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, "application/xml");
  const ns = "http://www.opengis.net/kml/2.2";
  const results: ParsedKmlLocation[] = [];

  const folders = doc.getElementsByTagNameNS(ns, "Folder");

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];

    // Get folder name (= ancient name)
    const folderNameEl = folder.querySelector(":scope > name");
    const nameAncient = folderNameEl?.textContent?.trim() ?? "";
    if (!nameAncient) continue;

    // Get folder description for verse ref
    const folderDescEl = folder.querySelector(":scope > description");
    const verseRef = folderDescEl ? extractVerseRef(folderDescEl.textContent || "") : "";

    // Find first Placemark with a Point
    const placemarks = folder.getElementsByTagNameNS(ns, "Placemark");
    let found = false;

    for (let j = 0; j < placemarks.length; j++) {
      const pm = placemarks[j];
      const point = pm.getElementsByTagNameNS(ns, "Point")[0];
      if (!point) continue;

      const coordsEl = point.getElementsByTagNameNS(ns, "coordinates")[0];
      if (!coordsEl) continue;

      const coordsText = coordsEl.textContent?.trim() ?? "";
      const parts = coordsText.split(",");
      if (parts.length < 2) continue;

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (isNaN(lng) || isNaN(lat)) continue;

      // Style URL → location type
      const styleUrlEl = pm.getElementsByTagNameNS(ns, "styleUrl")[0];
      const styleUrl = styleUrlEl?.textContent?.trim() ?? "";
      const locationType = STYLE_TYPE_MAP[styleUrl] ?? "city";

      // Placemark name: "Ancient / Modern"
      const pmNameEl = pm.querySelector("name");
      const pmName = pmNameEl?.textContent?.trim() ?? "";
      const slashIdx = pmName.indexOf(" / ");
      const nameModern = slashIdx >= 0 ? pmName.substring(slashIdx + 3) : "";

      // Placemark description
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

      found = true;
      break; // Only first Point placemark per folder
    }
  }

  return results;
}
