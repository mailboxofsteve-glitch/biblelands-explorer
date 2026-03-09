export interface Viewport {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface Location {
  id: string;
  name_ancient: string;
  name_modern: string | null;
  coordinates: [number, number];
  location_type: string;
  era_tags: string[];
  primary_verse: string | null;
  description: string | null;
}

export interface Overlay {
  id: string;
  name: string;
  slug: string;
  category: string;
  era: string;
  default_color: string;
  default_style: string;
  geojson: Record<string, unknown>;
  is_preloaded: boolean;
}

export interface Pin {
  id: string;
  location_id: string;
  lesson_id: string;
  label: string;
  icon_type: string;
  coordinates: [number, number];
  popup_title: string;
  popup_body: string | null;
  scripture_refs: string[];
}

export interface Lesson {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  era: string;
  share_token: string | null;
  is_public: boolean;
  scene_count: number;
}

export interface LessonScene {
  id: string;
  lesson_id: string;
  created_by: string;
  scene_order: number;
  title: string;
  center_lng: number;
  center_lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
  active_overlay_ids: string[];
  visible_pin_ids: string[];
  highlighted_pin_id: string | null;
  animate_on_enter: boolean;
}
