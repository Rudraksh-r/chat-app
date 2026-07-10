import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import { app } from "./socket/socket.js";
import { getCorsOrigins } from "./config/corsOrigins.js";
import router from "./routes/auth.routes.js";
import convoRouter from "./routes/converssation.route.js";
import messageRouter from "./routes/message.route.js";
import userRouter from "./routes/user.route.js";
import { ApiError } from "./utils/ApiError.js";
import { errorNormalizer, globalErrorHandler } from "./middleware/error.middleware.js";

// Trust proxy for rate limiters and secure cookies behind reverse proxies (Render, Railway, etc.)
app.set('trust proxy', 1);

// Helmet MUST be the first middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://ui-avatars.com"],
            mediaSrc: ["'self'", "https://res.cloudinary.com"],
            connectSrc: ["'self'", "http://localhost:5001", "ws://localhost:5001", "https://your-api-domain", "wss://your-api-domain"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: {
        action: "deny"
    },
    hidePoweredBy: true
}));

// Compress responses
app.use(compression());

// Security Note on CSRF:
// Since cookies use sameSite: 'strict' (or 'lax') in a same-site topology, 
// the primary defense against CSRF attacks is this strict CORS origin allowlist 
// combined with the cookie attributes. 
// A malicious third-party site's cross-origin fetch with credentials will be 
// blocked by CORS. If you ever add non-JSON endpoints (e.g., HTML form POSTs) 
// or widen CORS with wildcards, you MUST add separate CSRF token middleware.
app.use(cors({
    origin: getCorsOrigins(),
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Health checks
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/health/db", (req, res) => {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isConnected = mongoose.connection.readyState === 1;
    res.status(isConnected ? 200 : 503).json({
        status: isConnected ? "ok" : "error",
        readyState: mongoose.connection.readyState
    });
});

app.use("/api/auth", router)
app.use("/api/conversation", convoRouter)
app.use("/api/message", messageRouter)
app.use("/api/user", userRouter)

// Catch-all for unmatched routes
app.use((req, res, next) => {
    next(new ApiError(404, "Not found"));
});

// Error normalization middleware
app.use(errorNormalizer);

// Global error handler
app.use(globalErrorHandler);

export default app;