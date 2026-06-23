import multer from "multer";

// memoryStorage: file lives in RAM as buffer, no disk writes.
// This is the correct approach for a cloud-upload pipeline.
const storage = multer.memoryStorage();

// Allowed MIME types grouped by category
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Audio (Cloudinary handles these under resource_type: "video")
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  // Documents (Cloudinary handles these under resource_type: "raw")
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed`), false);
    }
  },
});