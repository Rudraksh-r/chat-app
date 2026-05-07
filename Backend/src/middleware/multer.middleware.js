import multer from "multer";

// memoryStorage stores the uploaded file as a Buffer at req.file.buffer.
// No files are written to disk — critical for cloud deployment environments
// where the filesystem may be read-only or non-persistent.
const storage = multer.memoryStorage();

// File filter — only allow image file types.
// This runs before the file is stored, acting as a first line of defense.
// A second validation happens in the controller (checking MIME type).
const fileFilter = (req, file, cb) => {
  // mimetype is set by the browser based on the file's actual content.
  // Common image types: image/jpeg, image/png, image/gif, image/webp
  if (file.mimetype.startsWith("image/")) {
    // cb(null, true) means "accept this file"
    cb(null, true);
  } else {
    // cb(error, false) means "reject this file with this error"
    cb(new Error("Only image files are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    // 5MB limit in bytes (5 * 1024 * 1024).
    // Without this, a malicious user could send a 4GB file
    // and exhaust your server's RAM — a classic DoS vector.
    fileSize: 5 * 1024 * 1024,
  },
});