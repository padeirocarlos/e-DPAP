/**
 * GPS capture via the Geolocation API. Returns the coordinates plus accuracy
 * and a timestamp (the field data model records how the position was obtained).
 * Errors are normalized to codes the UI maps to localized messages.
 */

import { appConfig } from "@/config/app";

export type GpsFix = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres. */
  accuracy: number;
  /** ISO timestamp of the fix. */
  capturedAt: string;
};

export type GpsErrorCode = "UNSUPPORTED" | "DENIED" | "UNAVAILABLE";

export class GpsError extends Error {
  constructor(readonly code: GpsErrorCode) {
    super(code);
    this.name = "GpsError";
  }
}

export function capturePosition(): Promise<GpsFix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GpsError("UNSUPPORTED"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          capturedAt: new Date(pos.timestamp).toISOString(),
        }),
      (err) =>
        reject(
          new GpsError(err.code === err.PERMISSION_DENIED ? "DENIED" : "UNAVAILABLE"),
        ),
      {
        enableHighAccuracy: appConfig.gps.enableHighAccuracy,
        timeout: appConfig.gps.timeoutMs,
        maximumAge: appConfig.gps.maximumAgeMs,
      },
    );
  });
}
