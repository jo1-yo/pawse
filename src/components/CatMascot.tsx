/**
 * Pawse mascot — the kawaii gray cat hugging a pink heart. Just the logo art,
 * no background.
 */

import { Image } from 'expo-image';

import catArt from '../../assets/images/pawse-cat.png';

export function CatMascot({ size = 120 }: { size?: number }) {
  return <Image source={catArt} style={{ width: size, height: size }} contentFit="contain" />;
}
