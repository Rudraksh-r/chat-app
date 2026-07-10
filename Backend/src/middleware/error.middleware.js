import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

// Error normalization middleware
export const errorNormalizer = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        if (error.name === "CastError") {
            error = new ApiError(400, "Invalid ID format");
        } else if (error.name === "ValidationError") {
            error = new ApiError(400, "Invalid input");
        } else if (error.code === 11000) {
            error = new ApiError(409, "This value is already in use");
        }
    }

    next(error);
};

// Global error handler
export const globalErrorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors || [],
        });
    }

    // Unexpected/Untrusted errors
    logger.error("Untrusted error occurred: %s", err.stack || err.message || err);

    return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Something went wrong. Please try again.",
    });
};
