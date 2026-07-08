import { HOUSE_IMAGE_PRESETS, housePresetSrc } from '../constants/houseImagePresets';

const PRESET_KEY_TO_FILENAME: Record<string, string> = Object.fromEntries(
  HOUSE_IMAGE_PRESETS.map((p) => [p.key, p.filename]),
);

export function getPropertyImageSrc(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('rc-house:')) {
    const key = imageUrl.slice('rc-house:'.length);
    const file = PRESET_KEY_TO_FILENAME[key];
    return file ? housePresetSrc(file) : null;
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return null;
}
