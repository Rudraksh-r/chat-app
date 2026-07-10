import { v2 as cloudinary } from "cloudinary";
import logger from "./logger.js";

// Configure once, here, using env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary using a signed upload_stream.
 * Works with multer memoryStorage — no temp files needed.
 *
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: "chat_app/avatars",
      resource_type: "image",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
      ...options,
    };

    logger.info("☁️  Starting Cloudinary upload...");
    logger.info("   cloud_name: %s", process.env.CLOUDINARY_CLOUD_NAME ? "✅ set" : "❌ MISSING");
    logger.info("   api_key: %s", process.env.CLOUDINARY_API_KEY ? "✅ set" : "❌ MISSING");
    logger.info("   api_secret: %s", process.env.CLOUDINARY_API_SECRET ? "✅ set" : "❌ MISSING");

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error("❌ Cloudinary upload failed: %s", error.message);
          logger.error("   HTTP status: %s", error.http_code);
          return reject(error);
        }
        logger.info("✅ Cloudinary upload success: %s", result.secure_url);
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;