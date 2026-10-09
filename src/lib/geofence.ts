/**
 * Haversine formula calculation for geodesic distance between two points in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Return rounded to 2 decimal places
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface GeofenceValidationResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  radiusMeters: number;
  accuracyMeters: number;
  isAccuracyAcceptable: boolean;
  isMockLocationSuspected: boolean;
  mockReason?: string;
}

/**
 * Validate Geofence & Anti-Mock GPS logic
 */
export function validateGeofenceAndLocation(
  userLat: number,
  userLng: number,
  accuracyMeters: number,
  officeLat: number,
  officeLng: number,
  officeRadiusMeters: number,
  maxAccuracyMeters: number = Number(process.env.MAX_GPS_ACCURACY_METERS) || 100
): GeofenceValidationResult {
  const distanceMeters = calculateHaversineDistance(
    userLat,
    userLng,
    officeLat,
    officeLng
  );

  let isMockLocationSuspected = false;
  let mockReason: string | undefined;

  // 1. Accuracy Check
  // Synthetic mock providers often output accuracy = 0.0 or 1.0 fixed
  if (accuracyMeters === 0) {
    isMockLocationSuspected = true;
    mockReason = "Akurasi GPS tidak valid (0m - indikasi fake provider).";
  }

  // 2. Latitude / Longitude boundary check
  if (
    userLat < -90 ||
    userLat > 90 ||
    userLng < -180 ||
    userLng > 180 ||
    isNaN(userLat) ||
    isNaN(userLng)
  ) {
    isMockLocationSuspected = true;
    mockReason = "Koordinat di luar batas geografis bumi.";
  }

  const isAccuracyAcceptable = accuracyMeters <= maxAccuracyMeters;
  const isWithinGeofence = distanceMeters <= officeRadiusMeters;

  return {
    isWithinGeofence,
    distanceMeters,
    radiusMeters: officeRadiusMeters,
    accuracyMeters,
    isAccuracyAcceptable,
    isMockLocationSuspected,
    mockReason,
  };
}

/**
 * Check for speed anomaly between two successive locations
 * e.g. Distance > 100km in under 15 minutes is physically impossible without aircraft
 */
export function checkSpeedAnomaly(
  prevLat: number,
  prevLng: number,
  prevTime: Date,
  currentLat: number,
  currentLng: number,
  currentTime: Date
): { isAnomaly: boolean; speedKmh: number } {
  const distanceMeters = calculateHaversineDistance(
    prevLat,
    prevLng,
    currentLat,
    currentLng
  );
  const timeDiffSeconds = Math.max(
    1,
    (currentTime.getTime() - prevTime.getTime()) / 1000
  );
  const speedMetersPerSecond = distanceMeters / timeDiffSeconds;
  const speedKmh = (speedMetersPerSecond * 3600) / 1000;

  // Speed > 300 km/h on ground is suspicious
  const isAnomaly = speedKmh > 300;

  return {
    isAnomaly,
    speedKmh: Math.round(speedKmh * 10) / 10,
  };
}
