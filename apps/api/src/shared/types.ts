export type Id = string;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}
