import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkMediaPermissions,
  requestPhotosPermission,
  requestCameraPermission,
  capturePhotoFromCamera,
  pickPhotoFromGallery,
} from "../src/lib/mediaPermissions";
import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

vi.mock("@capacitor/camera", () => ({
  Camera: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    Uri: "uri",
  },
  CameraSource: {
    Camera: "CAMERA",
    Photos: "PHOTOS",
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

describe("mediaPermissions utility suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Web Platform Behavior", () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    });

    it("returns granted by default for web environment", async () => {
      const perms = await checkMediaPermissions();
      expect(perms).toEqual({
        camera: "granted",
        photos: "granted",
      });
    });

    it("returns true on web for requestPhotosPermission", async () => {
      const result = await requestPhotosPermission();
      expect(result).toBe(true);
    });

    it("returns true on web for requestCameraPermission", async () => {
      const result = await requestCameraPermission();
      expect(result).toBe(true);
    });

    it("returns null on web for capturePhotoFromCamera to signal HTML fallback", async () => {
      const result = await capturePhotoFromCamera();
      expect(result).toBeNull();
    });

    it("returns null on web for pickPhotoFromGallery to signal HTML fallback", async () => {
      const result = await pickPhotoFromGallery();
      expect(result).toBeNull();
    });
  });

  describe("Native Platform Behavior", () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    });

    it("retrieves permissions status from native Camera plugin", async () => {
      vi.mocked(Camera.checkPermissions).mockResolvedValue({
        camera: "prompt",
        photos: "granted",
      });

      const perms = await checkMediaPermissions();
      expect(perms).toEqual({
        camera: "prompt",
        photos: "granted",
      });
      expect(Camera.checkPermissions).toHaveBeenCalled();
    });

    it("handles native photos permission granting", async () => {
      vi.mocked(Camera.requestPermissions).mockResolvedValue({
        camera: "prompt",
        photos: "granted",
      });

      const granted = await requestPhotosPermission();
      expect(granted).toBe(true);
      expect(Camera.requestPermissions).toHaveBeenCalledWith({
        permissions: ["photos"],
      });
    });

    it("handles native photos limited access as granted", async () => {
      vi.mocked(Camera.requestPermissions).mockResolvedValue({
        camera: "prompt",
        photos: "limited",
      });

      const granted = await requestPhotosPermission();
      expect(granted).toBe(true);
    });

    it("handles native camera permission rejection", async () => {
      vi.mocked(Camera.requestPermissions).mockResolvedValue({
        camera: "denied",
        photos: "prompt",
      });

      const granted = await requestCameraPermission();
      expect(granted).toBe(false);
      expect(Camera.requestPermissions).toHaveBeenCalledWith({
        permissions: ["camera"],
      });
    });

    it("returns null when user cancels camera capture without throwing", async () => {
      vi.mocked(Camera.getPhoto).mockRejectedValue(new Error("User cancelled photos app"));

      const result = await capturePhotoFromCamera();
      expect(result).toBeNull();
    });

    it("throws CameraPermissionError when camera permission is denied", async () => {
      vi.mocked(Camera.getPhoto).mockRejectedValue(new Error("Permission denied for camera"));

      await expect(capturePhotoFromCamera()).rejects.toThrow("Camera permission was denied");
    });

    it("throws PhotosPermissionError when photo library access is denied", async () => {
      vi.mocked(Camera.getPhoto).mockRejectedValue(new Error("Access to photos was denied"));

      await expect(pickPhotoFromGallery()).rejects.toThrow("Photo library permission was denied");
    });
  });
});
