import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser"
import { app } from "./socket/socket.js";
import router from "./routes/auth.routes.js";
import convoRouter from "./routes/converssation.route.js";
import messageRouter from "./routes/message.route.js";
import userRouter from "./routes/user.route.js";
import { ApiError } from "./utils/ApiError.js";
import { errorNormalizer, globalErrorHandler } from "./middleware/error.middleware.js";

app.use(cors({
    origin: [process.env.CORS_ORIGIN, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

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