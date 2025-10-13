/**
 * Base class for all handler execution errors that can short-circuit request processing.
 * When thrown from handler code, processing stops and the error's statusCode is returned.
 */
export abstract class HandlerError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// AIDEV-NOTE: Client errors (4xx) - issues with the request itself

/**
 * Thrown when the request is malformed or invalid.
 * Results in HTTP 400 Bad Request.
 */
export class BadRequestError extends HandlerError {
  readonly statusCode = 400;
}

/**
 * Thrown when authentication is required but not provided.
 * Results in HTTP 401 Unauthorized.
 */
export class UnauthorizedError extends HandlerError {
  readonly statusCode = 401;
}

/**
 * Thrown when authentication is provided but insufficient for the requested resource.
 * Results in HTTP 403 Forbidden.
 */
export class ForbiddenError extends HandlerError {
  readonly statusCode = 403;
}

/**
 * Thrown when the requested resource cannot be found.
 * Results in HTTP 404 Not Found.
 */
export class NotFoundError extends HandlerError {
  readonly statusCode = 404;
}

/**
 * Thrown when the HTTP method is not allowed for the resource.
 * Results in HTTP 405 Method Not Allowed.
 */
export class MethodNotAllowedError extends HandlerError {
  readonly statusCode = 405;
}

/**
 * Thrown when the request payload is too large.
 * Results in HTTP 413 Payload Too Large.
 */
export class PayloadTooLargeError extends HandlerError {
  readonly statusCode = 413;
}

/**
 * Thrown when the request media type is not supported.
 * Results in HTTP 415 Unsupported Media Type.
 */
export class UnsupportedMediaTypeError extends HandlerError {
  readonly statusCode = 415;
}

/**
 * Thrown when the request fails validation rules.
 * Results in HTTP 422 Unprocessable Entity.
 */
export class UnprocessableEntityError extends HandlerError {
  readonly statusCode = 422;
}

/**
 * Thrown when rate limiting is exceeded.
 * Results in HTTP 429 Too Many Requests.
 */
export class TooManyRequestsError extends HandlerError {
  readonly statusCode = 429;
}

// AIDEV-NOTE: Server errors (5xx) - issues with the server or processing

/**
 * Thrown when an internal server error occurs during processing.
 * Results in HTTP 500 Internal Server Error.
 */
export class InternalServerError extends HandlerError {
  readonly statusCode = 500;
}

/**
 * Thrown when a required feature or functionality is not implemented.
 * Results in HTTP 501 Not Implemented.
 */
export class NotImplementedError extends HandlerError {
  readonly statusCode = 501;
}

/**
 * Thrown when the server is temporarily unavailable.
 * Results in HTTP 503 Service Unavailable.
 */
export class ServiceUnavailableError extends HandlerError {
  readonly statusCode = 503;
}

/**
 * Thrown when an operation times out.
 * Results in HTTP 504 Gateway Timeout.
 */
export class GatewayTimeoutError extends HandlerError {
  readonly statusCode = 504;
}

// AIDEV-NOTE: Special error that causes the socket to be aborted without sending a response
// This does NOT extend HandlerError because it requires special handling in the webhook server

/**
 * Thrown to immediately terminate the socket connection without sending any HTTP response.
 * This allows testing of scenarios where the server closes the connection prematurely.
 * Does not extend HandlerError as it requires special handling.
 */
export class AbortSocketError extends Error {
  constructor(message: string = "Socket connection aborted") {
    super(message);
    this.name = "AbortSocketError";
  }
}

// AIDEV-NOTE: Utility function to check if an error is a HandlerError
export function isHandlerError(error: unknown): error is HandlerError {
  return error instanceof HandlerError;
}

// AIDEV-NOTE: Utility function to check if an error is an AbortSocketError
export function isAbortSocketError(error: unknown): error is AbortSocketError {
  return error instanceof AbortSocketError;
}

// AIDEV-NOTE: Export all error classes for use in handler code
export const HandlerErrors = {
  HandlerError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  UnprocessableEntityError,
  TooManyRequestsError,
  InternalServerError,
  NotImplementedError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  AbortSocketError,
} as const;
