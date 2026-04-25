import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser"
import router from "./routes/auth.routes.js";
import convoRouter from "./routes/converssation.route.js";
import messageRouter from "./routes/message.route.js";
import userRouter from "./routes/user.route.js";

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
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

// Global error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || [],
    });
});

export default app;