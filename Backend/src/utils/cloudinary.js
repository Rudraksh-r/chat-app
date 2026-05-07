import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with credentials from environment variables.
// This runs once when the module is first imported.
// process.env values are loaded by dotenv in server.js before this runs.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary.
 *
 * @param {Buffer} fileBuffer - The raw file data from Multer's memoryStorage
 * @param {string} folder - The Cloudinary folder to organize uploads (e.g. "avatars", "messages")
 * @returns {Promise<string>} - Resolves with the secure HTTPS URL of the uploaded file
 */
export const uploadToCloudinary = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        // upload_stream is Cloudinary's method for streaming a buffer.
        // It doesn't accept a file path — it accepts a readable stream or buffer.
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "auto",
            },
            (error, result) => {
                if (error) {
                    console.error("❌ Cloudinary Stream Error:", error);
                    return reject(error);
                }
                console.log("🚀 Cloudinary Stream Success!");
                resolve({
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
        );

        // .end() pipes the buffer into the stream and signals completion.
        // Without this, the stream would hang open forever waiting for data.
        uploadStream.end(fileBuffer);
    });
};

/**
 * Deletes a file from Cloudinary by its public ID.
 * Useful for replacing avatars — delete the old one to save storage.
 *
 * @param {string} publicId - The Cloudinary public ID of the file
 * @returns {Promise<void>}
 */
export const deleteFromCloudinary = async (publicId) => {
    // We wrap in try/catch here because a failed delete should never
    // crash the app — it's a background cleanup task, not critical.
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Cloudinary delete failed:", error);
    }
};
