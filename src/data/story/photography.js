export const PHOTO_TARGET = Object.freeze({ x: 0, y: 1.68, z: 31, yaw: 0, pitch: 0.34, fov: 55 });
export const PHOTO_TOLERANCE = Object.freeze({ position: 2.5, yaw: 0.13, pitch: 0.13, fov: 8 });

// An original schematic of the in-game stupa. Each path uses world coordinates.
export const PHOTO_GUIDE_PATHS = [
  [
    [-2.5, 16.5, 2.5], [-0.9, 26, 0.9], [-0.7, 26.8, 0.6],
    [-2.15, 26.8, 0], [0, 29, 0], [2.15, 26.8, 0], [0.7, 26.8, 0.6],
    [0.9, 26, 0.9], [2.5, 16.5, 2.5], [-2.5, 16.5, 2.5],
  ],
  [[-2.5, 12.1, 2.5], [-2.5, 16, 2.5], [2.5, 16, 2.5], [2.5, 12.1, 2.5]],
  Array.from({ length: 31 }, (_, index) => {
    const angle = Math.PI * (1 - index / 30);
    return [8.8 * Math.cos(angle), 5.15 + 7.2 * Math.sin(angle), 2.6];
  }),
  [[-9.45, 5.35, 2.6], [9.45, 5.35, 2.6]],
];
