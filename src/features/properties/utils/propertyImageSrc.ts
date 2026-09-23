import { HOUSE_IMAGE_PRESETS, housePresetSrc } from '../constants/houseImagePresets';
import { storagePathOf, useStoredFileSrc } from '@/shared/utils/storedFile';

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
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || storagePathOf(imageUrl)) {
    return imageUrl;
  }
  return null;
}

/** `getPropertyImageSrc`, with an uploaded photo read as the signed-in user. */
export function usePropertyImageSrc(imageUrl: string | null | undefined): string | null {
  return useStoredFileSrc(getPropertyImageSrc(imageUrl));
}
