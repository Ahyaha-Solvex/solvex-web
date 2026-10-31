export interface CarouselComponent {
  id: 'accelerometer' | 'gyroscope' | 'gps' | 'esp32' | 'gsm' | 'lora';
}

export const CAROUSEL_COMPONENTS: CarouselComponent[] = [
  { id: 'accelerometer' },
  { id: 'gyroscope' },
  { id: 'gps' },
  { id: 'esp32' },
  { id: 'gsm' },
  { id: 'lora' },
];

export const INITIAL_CENTER_INDEX = 3; // ESP32

export interface FocusStyle {
  x: number;       // offset from centre, as a share of the frame width
  scale: number;
  opacity: number;
  blur: number;    // in pixels
}

const SLOTS: FocusStyle[] = [
  { x: 0, scale: 1, opacity: 1, blur: 0 },
  { x: 0.32, scale: 0.36, opacity: 0.72, blur: 1 },
  { x: 0.47, scale: 0.27, opacity: 0.3, blur: 4 },
  { x: 0.6, scale: 0.2, opacity: 0, blur: 8 },
];

/** Shortest signed distance from the active item on the endless ring. */
export function ringDistance(index: number, active: number, count: number): number {
  const d = ((index - active) % count + count) % count;
  return d > count / 2 ? d - count : d;
}

export function getFocusStyle(distance: number): FocusStyle {
  const slot = SLOTS[Math.min(Math.abs(distance), SLOTS.length - 1)];
  return { ...slot, x: slot.x * Math.sign(distance) };
}
