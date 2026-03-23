import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

// ─── Error Types ────────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number = 400,
    message: string = code,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Error Response Handlers ────────────────────────────────────────────────

export function errorResponse(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const fieldErrors = error.errors.reduce(
      (acc, err) => {
        const path = err.path.join(".");
        acc[path] = err.message;
        return acc;
      },
      {} as Record<string, string>
    );

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          statusCode: 400,
          details: fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    console.error("Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
          statusCode: 500,
        },
      },
      { status: 500 }
    );
  }

  console.error("Unknown error:", error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unknown error occurred",
        statusCode: 500,
      },
    },
    { status: 500 }
  );
}

export function successResponse<T>(data: T, statusCode: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

// ─── Common Error Builders ────────────────────────────────────────────────────

export const errors = {
  unauthorized: () =>
    new AppError("UNAUTHORIZED", 401, "Authentication required"),

  forbidden: () =>
    new AppError("FORBIDDEN", 403, "You do not have permission to access this resource"),

  notFound: (resource: string) =>
    new AppError("NOT_FOUND", 404, `${resource} not found`),

  validationFailed: (details?: Record<string, unknown>) =>
    new AppError("VALIDATION_ERROR", 400, "Validation failed", details),

  conflict: (message: string) =>
    new AppError("CONFLICT", 409, message),

  tooManyRequests: () =>
    new AppError("RATE_LIMIT_EXCEEDED", 429, "Too many requests, please try again later"),

  internalError: (message?: string) =>
    new AppError("INTERNAL_ERROR", 500, message || "Internal server error"),

  badRequest: (message: string) =>
    new AppError("BAD_REQUEST", 400, message),
};
