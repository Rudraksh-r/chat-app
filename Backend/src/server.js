import "dotenv/config"; // This MUST be the first import to load .env variables before other imports!

// --- ENV VALIDATION ---
const requiredEnvVars = [
    "MONGODB_URI",
    "ACCESS_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_SECRET",
    "REFRESH_TOKEN_EXPIRY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CORS_ORIGIN",
    "PORT"
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnvVars.join(", ")}`);
    process.exit(1);
}
// ----------------------

import connectDB from "./config/db.js";
import "./app.js"; // This MUST be imported so the routes attach to the app instance!
import { server } from "./socket/socket.js";
import logger from "./utils/logger.js";
import mongoose from "mongoose";

// --- PROCESS ERROR HANDLERS ---
process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at: %O, reason: %s", promise, reason);
    process.exit(1);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception: %s", error.stack || error.message || error);
    process.exit(1);
});
// ------------------------------

const listen = async () => {
    try {
        await connectDB()

        const port = process.env.PORT || 5001;
        server.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
        })
    } catch (error) {
        logger.error("Error in connecting to the database: %s", error.stack || error.message || error);
        process.exit(1);
    }
}

listen()

// --- GRACEFUL SHUTDOWN ---
process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
        logger.info("HTTP/Socket.IO server closed.");
        mongoose.connection.close(false).then(() => {
            logger.info("MongoDB connection closed.");
            process.exit(0);
        });
    });
});
