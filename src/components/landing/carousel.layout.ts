export interface CarouselComponent {
  id: 'accelerometer' | 'gyroscope' | 'gps' | 'esp32' | 'gsm' | 'lora' | 'antenna';
  index: number;
}

export const CAROUSEL_COMPONENTS: CarouselComponent[] = [
  { id: 'accelerometer', index: 0 },
  { id: 'gyroscope', index: 1 },
  { id: 'gps', index: 2 },
  { id: 'esp32', index: 3 },
  { id: 'gsm', index: 4 },
  { id: 'lora', index: 5 },
  { id: 'antenna', index: 6 },
];

export const INITIAL_CENTER_INDEX = 3; // ESP32

export interface FocusStyle {
  scale: number;
  opacity: number;
  blur: number; // in pixels
}

export function getFocusStyle(distance: number): FocusStyle {
  const d = Math.abs(distance);
  if (d === 0) return { scale: 1.5, opacity: 1, blur: 0 };
  if (d === 1) return { scale: 0.95, opacity: 0.55, blur: 2 };
  if (d === 2) return { scale: 0.8, opacity: 0.28, blur: 5 };
  return { scale: 0.7, opacity: 0.12, blur: 8 };
}
