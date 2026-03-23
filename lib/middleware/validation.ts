import { NextRequest } from "next/server";
import { ZodSchema } from "zod";
import { errors } from "./errorHandler";

// ─── Validation Middleware ────────────────────────────────────────────────────

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ valid: true; data: T } | { valid: false; error: Error }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const details = result.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join(".");
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );
      return {
        valid: false,
        error: errors.validationFailed(details),
      };
    }

    return { valid: true, data: result.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON";
    return {
      valid: false,
      error: errors.badRequest(`Invalid request body: ${message}`),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { valid: true; data: T } | { valid: false; error: Error } {
  try {
    const params: Record<string, string | string[]> = {};

    for (const [key, value] of searchParams) {
      if (params[key]) {
        if (Array.isArray(params[key])) {
          (params[key] as string[]).push(value);
        } else {
          params[key] = [params[key] as string, value];
        }
      } else {
        params[key] = value;
      }
    }

    const result = schema.safeParse(params);

    if (!result.success) {
      const details = result.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join(".");
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );
      return {
        valid: false,
        error: errors.validationFailed(details),
      };
    }

    return { valid: true, data: result.data };
  } catch (e) {
    return {
      valid: false,
      error: errors.badRequest("Invalid query parameters"),
    };
  }
}

/**
 * Sanitize and validate an email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Sanitize a string (remove XSS patterns)
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit?: string | number,
  offset?: string | number
): { limit: number; offset: number } {
  const maxLimit = 100;
  const defaultLimit = 20;

  let parsedLimit = parseInt(String(limit || defaultLimit), 10);
  if (Number.isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = defaultLimit;
  if (parsedLimit > maxLimit) parsedLimit = maxLimit;

  let parsedOffset = parseInt(String(offset || 0), 10);
  if (Number.isNaN(parsedOffset) || parsedOffset < 0) parsedOffset = 0;

  return { limit: parsedLimit, offset: parsedOffset };
}
