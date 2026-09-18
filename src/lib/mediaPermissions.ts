import { Camera, CameraResultType, CameraSource, type PermissionStatus } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

export type MediaPermissionType = "camera" | "photos";

export interface MediaPermissionsState {
  camera: "granted" | "denied" | "prompt" | "prompt-with-rationale" | "limited";
  photos: "granted" | "denied" | "prompt" | "prompt-with-rationale" | "limited";
}

/**
 * Checks whether Trouvaille currently has access to the device camera and photo library.
 */
export async function checkMediaPermissions(): Promise<MediaPermissionsState> {
  if (!Capacitor.isNativePlatform()) {
    // In web browsers, photo input via <input type="file"> is accessible without pre-prompting
    return {
      camera: "granted",
      photos: "granted",
    };
  }

  try {
    const status: PermissionStatus = await Camera.checkPermissions();
    return {
      camera: status.camera,
      photos: status.photos,
    };
  } catch (err) {
    console.warn("[mediaPermissions] checkPermissions failed:", err);
    return {
      camera: "prompt",
      photos: "prompt",
    };
  }
}

/**
 * Explicitly requests permission to access the device photo library / gallery.
 */
export async function requestPhotosPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const status = await Camera.requestPermissions({ permissions: ["photos"] });
    return status.photos === "granted" || status.photos === "limited";
  } catch (err) {
    console.warn("[mediaPermissions] requestPhotosPermission failed:", err);
    return false;
  }
}

/**
 * Explicitly requests permission to access the device camera.
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const status = await Camera.requestPermissions({ permissions: ["camera"] });
    return status.camera === "granted";
  } catch (err) {
    console.warn("[mediaPermissions] requestCameraPermission failed:", err);
    return false;
  }
}

export interface CapturedMediaResult {
  blob: Blob;
  previewUrl: string;
}

/**
 * Captures a new photo directly from the native camera.
 * Returns null if the user cancelled the capture.
 * Throws an Error with name "CameraPermissionError" if permission is denied.
 */
export async function capturePhotoFromCamera(): Promise<CapturedMediaResult | null> {
  if (!Capacitor.isNativePlatform()) {
    // On web, signal caller to trigger HTML input fallback
    return null;
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true,
    });

    if (!photo.webPath) return null;

    const response = await fetch(photo.webPath);
    const blob = await response.blob();

    return {
      blob,
      previewUrl: photo.webPath,
    };
  } catch (err: any) {
    const message = (err?.message || "").toLowerCase();
    if (message.includes("cancelled") || message.includes("cancel")) {
      return null;
    }
    if (message.includes("denied") || message.includes("permission") || message.includes("access")) {
      const permErr = new Error("Camera permission was denied");
      permErr.name = "CameraPermissionError";
      throw permErr;
    }
    throw err;
  }
}

/**
 * Selects an existing photo directly from the native photo library / gallery.
 * Returns null if the user cancelled the picker.
 * Throws an Error with name "PhotosPermissionError" if permission is denied.
 */
export async function pickPhotoFromGallery(): Promise<CapturedMediaResult | null> {
  if (!Capacitor.isNativePlatform()) {
    // On web, signal caller to trigger HTML input fallback
    return null;
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
      correctOrientation: true,
    });

    if (!photo.webPath) return null;

    const response = await fetch(photo.webPath);
    const blob = await response.blob();

    return {
      blob,
      previewUrl: photo.webPath,
    };
  } catch (err: any) {
    const message = (err?.message || "").toLowerCase();
    if (message.includes("cancelled") || message.includes("cancel")) {
      return null;
    }
    if (message.includes("denied") || message.includes("permission") || message.includes("access")) {
      const permErr = new Error("Photo library permission was denied");
      permErr.name = "PhotosPermissionError";
      throw permErr;
    }
    throw err;
  }
}
