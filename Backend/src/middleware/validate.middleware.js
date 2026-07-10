import { ZodError } from "zod";

/**
 * Generic validation middleware factory.
 *
 * @param {import("zod").ZodSchema} schema — the Zod schema to validate against
 * @param {"body" | "params" | "query"} source — which part of the request to validate
 * @returns {import("express").RequestHandler}
 *
 * On validation failure → 400 with { errors: [{ field, message }] }
 * On success → replaces req[source] with the parsed (typed, stripped) result
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({
        statusCode: 400,
        message: "Validation failed",
        success: false,
        errors,
      });
    }

    // Replace the source with parsed data so downstream code trusts it
    // Mutate in-place since req.query has only a getter in Express
    Object.keys(req[source]).forEach((key) => delete req[source][key]);
    Object.assign(req[source], result.data);
    
    next();
  };
}

/**
 * Transforms a ZodError into a clean array of { field, message } pairs.
 * Never exposes raw Zod internals to the client.
 *
 * @param {ZodError} zodError
 * @returns {{ field: string, message: string }[]}
 */
function formatZodErrors(zodError) {
  return zodError.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "_root",
    message: issue.message,
  }));
}
