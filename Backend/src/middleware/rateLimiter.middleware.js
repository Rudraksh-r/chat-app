import rateLimit from "express-rate-limit";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

// =========================================================================
// PRODUCTION SCALING CONSIDERATIONS
// =========================================================================
// WARNING: The current implementation uses in-memory storage (RateLimiterMemory
// and express-rate-limit's default MemoryStore). In-memory rate limiting only
// works correctly on a single server instance.
//
// BEFORE scaling horizontally, you must switch to a distributed store (like Redis):
//
// Example configuration for Redis Store:
// 
// import Redis from "ioredis";
// import { RateLimiterRedis } from "rate-limiter-flexible";
// import RedisStore from "rate-limit-redis";
//
// const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
//
// // For rate-limiter-flexible:
// const failCounterLimiter = new RateLimiterRedis({
//   storeClient: redisClient,
//   keyPrefix: "auth_fail_count",
//   points: 99999,
//   duration: 24 * 60 * 60,
// });
//
// // For express-rate-limit:
// const moderateLimiter = rateLimit({
//   store: new RedisStore({
//     sendCommand: (...args) => redisClient.call(...args),
//   }),
//   ...
// });
// =========================================================================

// Chained Fail Counter and Lockout Limiters using rate-limiter-flexible
const failCounterLimiter = new RateLimiterMemory({
  keyPrefix: "auth_fail_count",
  points: 99999, // Used purely as a counter; manual lockout threshold checks are done below
  duration: 24 * 60 * 60, // Keep fail counts for 24 hours to enforce progressive lockouts
});

const blockLimiter = new RateLimiterMemory({
  keyPrefix: "auth_block",
  points: 1,
  duration: 1, // Dynamically blocked with specific block durations
});

/**
 * Helper to build express-rate-limit configurations with consistent ApiError JSON format.
 */
const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true, // Return rate limit info in standard headers
    legacyHeaders: false,  // Disable legacy headers
    handler: (req, res, next) => {
      const retryAfter = Math.ceil(options.windowMs / 1000);
      res.set("Retry-After", String(retryAfter));
      next(new ApiError(429, options.message || "Too many requests. Please try again later."));
    },
  });
};

// 1. Strict Auth IP Limiter (counts ALL attempts - success or fail)
const authIpLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_IP_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_IP_MAX) || 20,
  message: "Too many login/registration attempts from this IP. Please try again later.",
});

// 2. Strict Auth Account-Based Limiter (only counts FAILED attempts, progressive backoff)
const authAccountLimiter = async (req, res, next) => {
  const email = req.body?.email;
  if (!email) {
    return next();
  }

  const key = email.toLowerCase().trim();

  // Check if account is currently locked out
  try {
    const blockRes = await blockLimiter.get(key);
    if (blockRes && blockRes.remainingPoints <= 0) {
      const retryAfter = Math.ceil(blockRes.msBeforeNext / 1000);
      res.set("Retry-After", String(retryAfter));
      return next(
        new ApiError(
          429,
          `Too many failed login attempts. Please try again in ${retryAfter} seconds.`
        )
      );
    }
  } catch (err) {
    logger.error("Rate limiter check error: %s", err.stack || err.message || err);
  }

  // Intercept the response to track successful vs failed attempts
  const originalJson = res.json;
  res.json = function (body) {
    // Check status code to determine success/failure
    if (res.statusCode >= 400) {
      // Failed attempt: increment fails and apply progressive delay block
      failCounterLimiter
        .consume(key)
        .then(async (resLimiter) => {
          const failCount = resLimiter.consumedPoints;
          const maxFails = parseInt(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX) || 5;

          if (failCount >= maxFails) {
            const extraFails = failCount - maxFails;
            const windowMs = parseInt(process.env.RATE_LIMIT_AUTH_ACCOUNT_WINDOW_MS) || 60000;
            // Progressive backoff: 2^extraFails * base window (e.g. 60s, 120s, 240s, 480s...)
            const backoffFactor = Math.pow(2, extraFails);
            const blockSecs = Math.min(
              Math.round((windowMs / 1000) * backoffFactor),
              86400 // Max lockout of 24 hours
            );

            logger.warn(
              `🔒 Account lockout: ${key} blocked for ${blockSecs}s after ${failCount} failures.`
            );
            await blockLimiter.block(key, blockSecs);
          }
        })
        .catch((err) => {
          logger.error("Failed to increment failed auth count: %s", err.stack || err.message || err);
        });
    } else {
      // Successful login/register: reset fail counter and clear blocks
      Promise.all([
        failCounterLimiter.delete(key),
        blockLimiter.delete(key),
      ]).catch((err) => {
        logger.error("Failed to reset auth limiter: %s", err.stack || err.message || err);
      });
    }

    return originalJson.apply(this, arguments);
  };

  next();
};

// Chained authLimiter middleware combining IP and Account-based limits
export const authLimiter = [authIpLimiter, authAccountLimiter];

// 3. Moderate Limiter: Applied to search, convo, and group management endpoints
export const moderateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_MODERATE_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MODERATE_MAX) || 30,
  message: "Too many requests. Please slow down.",
});

// 4. Loose Limiter: Applied to chat interactions (send/read/edit/react/delete message)
export const looseLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_LOOSE_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_LOOSE_MAX) || 120,
  message: "Message rate limit exceeded. Please try again in a moment.",
});
