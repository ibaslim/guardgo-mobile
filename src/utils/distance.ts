/** Metres between two points on the earth (haversine). */
export function distanceMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLng = rad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** "85 m", "1.4 km". */
export function distanceText(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10 || 10} m` : `${(meters / 1000).toFixed(1)} km`;
}
