export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestKm(
  userLat: number,
  userLon: number,
  locations: { latitude: number; longitude: number }[],
): number {
  if (!locations?.length) return Infinity
  return Math.min(...locations.map((l) => haversineKm(userLat, userLon, l.latitude, l.longitude)))
}

export function formatDistance(km: number): string {
  if (!isFinite(km)) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}
