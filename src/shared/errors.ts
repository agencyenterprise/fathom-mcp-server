export type ErrorType =
  | "auth"
  | "oauth"
  | "validation"
  | "session"
  | "fathom_api"
  | "server";

export class ErrorLogger extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errorType: ErrorType;
  readonly errorName: string;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    errorType: ErrorType,
    errorName?: string,
  ) {
    super(message);
    this.name = "ErrorLogger";
    this.statusCode = statusCode;
    this.code = code;
    this.errorType = errorType;
    this.errorName = errorName ?? code;
  }
}

export function authError(
  code: string,
  message: string,
  errorName?: string,
): ErrorLogger {
  return new ErrorLogger(401, code, message, "auth", errorName);
}

export function forbiddenError(
  message: string,
  errorName?: string,
): ErrorLogger {
  return new ErrorLogger(403, "forbidden", message, "auth", errorName);
}

export function oauthError(
  code: string,
  message: string,
  errorName?: string,
): ErrorLogger {
  return new ErrorLogger(400, code, message, "oauth", errorName);
}

export function validationError(
  message: string,
  errorName?: string,
): ErrorLogger {
  return new ErrorLogger(400, "invalid_request", message, "validation", errorName);
}

export function sessionError(
  code: string,
  message: string,
  errorName?: string,
): ErrorLogger {
  return new ErrorLogger(400, code, message, "session", errorName);
}

export function fathomApiError(
  message: string,
  errorName?: string,
): ErrorLogger {
  return new ErrorLogger(
    502,
    "fathom_api_error",
    message,
    "fathom_api",
    errorName,
  );
}

export function notFoundError(
  resource: string,
  errorName?: string,
): ErrorLogger {
  return new ErrorLogger(
    404,
    "not_found",
    `${resource} not found`,
    "server",
    errorName,
  );
}

export function serverError(message: string, errorName?: string): ErrorLogger {
  return new ErrorLogger(500, "server_error", message, "server", errorName);
}
