const PRESET_KEY_TO_FILENAME: Record<string, string> = {
  classic_suburban: 'Classic Suburban.png',
  cozy_bungalow: 'Cozy Bungalow.png',
  duplex: 'Duplex.png',
  high_rise_condo: 'High-Rise Condo.png',
  manufactured_home: 'Manufactured Home.png',
  mid_rise_apartment: 'Mid-Rise Apartment.png',
  mixed_use_building: 'Mixed-Use Building.png',
  modern_minimalist: 'Modern Minimalist.png',
  rural_farmhouse: 'Rural Farmhouse.png',
  townhouse: 'Townhouse.png',
  vacation_a_frame: 'Vacation A-Frame.png',
  walk_up_apartment: 'Walk-Up Apartment.png',
};

export function getPropertyImageSrc(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('rc-house:')) {
    const key = imageUrl.slice('rc-house:'.length);
    const file = PRESET_KEY_TO_FILENAME[key];
    return file ? `/house-presets/${encodeURIComponent(file)}` : null;
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return null;
}
