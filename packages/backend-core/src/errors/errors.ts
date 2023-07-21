import { LogLevel } from "@budibase/types"

// BASE

interface ErrorOpts {
  logLevel?: LogLevel
}

export abstract class BudibaseError extends Error {
  code: ErrorCode
  logLevel?: LogLevel

  constructor(
    message: string,
    code: ErrorCode,
    opts: ErrorOpts = {}
  ) {
    super(message)
    this.code = code
    this.logLevel = opts.logLevel
  }

  protected getPublicError?(): any
}

// ERROR HANDLING

export enum ErrorCode {
  USAGE_LIMIT_EXCEEDED = "usage_limit_exceeded",
  FEATURE_DISABLED = "feature_disabled",
  INVALID_API_KEY = "invalid_api_key",
  HTTP = "http",
  UNAUTHORIZED = "unauthorized",
}

/**
 * For the given error, build the public representation that is safe
 * to be exposed over an api.
 */
export const getPublicError = (err: any) => {
  let error
  if (err.code) {
    // add generic error information
    error = {
      code: err.code,
    }

    if (err.getPublicError) {
      error = {
        ...error,
        // get any additional context from this error
        ...err.getPublicError(),
      }
    }
  }

  return error
}

// HTTP

export class HTTPError extends BudibaseError {
  status: number

  constructor(
    message: string,
    httpStatus: number,
    code = ErrorCode.HTTP,
    opts: ErrorOpts = {}
  ) {
    super(message, code, opts)
    this.status = httpStatus
  }
}

// LICENSING

export class UsageLimitError extends HTTPError {
  limitName: string

  constructor(message: string, limitName: string) {
    super(message, 400, ErrorCode.USAGE_LIMIT_EXCEEDED)
    this.limitName = limitName
  }

  getPublicError() {
    return {
      limitName: this.limitName,
    }
  }
}

export class FeatureDisabledError extends HTTPError {
  featureName: string

  constructor(message: string, featureName: string) {
    super(message, 400, ErrorCode.FEATURE_DISABLED)
    this.featureName = featureName
  }

  getPublicError() {
    return {
      featureName: this.featureName,
    }
  }
}

// AUTH

export class InvalidAPIKeyError extends BudibaseError {
  constructor() {
    super(
      "Invalid API key - may need re-generated, or user doesn't exist",
      ErrorCode.INVALID_API_KEY
    )
  }
}

export class UnauthorizedError extends HTTPError {
  constructor() {
    super(
      "Unauthorized",
      403,
      ErrorCode.UNAUTHORIZED,
      { logLevel: LogLevel.DEBUG }
    )
  }
}

// USERS

export class EmailUnavailableError extends Error {
  constructor(email: string) {
    super(`Email already in use: '${email}'`)
  }
}
