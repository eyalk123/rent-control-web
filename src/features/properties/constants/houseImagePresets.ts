export interface HouseImagePreset {
  key: string;
  label: string;
  filename: string;
}

const PREFIX = 'rc-house:';

// House illustrations bundled in `public/house-presets/`. Keys/labels mirror the mobile app's
// `rent-control/src/features/properties/constants/houseImagePresets.ts` so a property saved on
// one client resolves to the same illustration on the other.
export const HOUSE_IMAGE_PRESETS: HouseImagePreset[] = [
  { key: 'classic_suburban', label: 'Classic Suburban', filename: 'Classic Suburban.png' },
  { key: 'cozy_bungalow', label: 'Cozy Bungalow', filename: 'Cozy Bungalow.png' },
  { key: 'duplex', label: 'Duplex', filename: 'Duplex.png' },
  { key: 'high_rise_condo', label: 'High-Rise Condo', filename: 'High-Rise Condo.png' },
  { key: 'manufactured_home', label: 'Manufactured Home', filename: 'Manufactured Home.png' },
  { key: 'mid_rise_apartment', label: 'Mid-Rise Apartment', filename: 'Mid-Rise Apartment.png' },
  { key: 'mixed_use_building', label: 'Mixed-Use Building', filename: 'Mixed-Use Building.png' },
  { key: 'modern_minimalist', label: 'Modern Minimalist', filename: 'Modern Minimalist.png' },
  { key: 'rural_farmhouse', label: 'Rural Farmhouse', filename: 'Rural Farmhouse.png' },
  { key: 'townhouse', label: 'Townhouse', filename: 'Townhouse.png' },
  { key: 'vacation_a_frame', label: 'Vacation A-Frame', filename: 'Vacation A-Frame.png' },
  { key: 'walk_up_apartment', label: 'Walk-Up Apartment', filename: 'Walk-Up Apartment.png' },
];

/** Public URL of a preset image file served from `public/house-presets/`. */
export function housePresetSrc(filename: string): string {
  return `/house-presets/${encodeURIComponent(filename)}`;
}

/** Encode a preset key as the `image_url` sentinel value stored on a property. */
export function toImageUrlKey(key: string): string {
  return `${PREFIX}${key}`;
}

/** Extract the preset key from an `image_url`, or `null` if it isn't a preset sentinel. */
export function parseImageUrlKey(imageUrl: string): string | null {
  if (imageUrl.startsWith(PREFIX)) {
    return imageUrl.slice(PREFIX.length);
  }
  return null;
}
