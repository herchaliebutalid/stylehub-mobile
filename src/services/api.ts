import {
  API_BASE_URL,
  API_TIMEOUT_MS,
} from '@/src/config/api';


/* ==========================================================================
   API ERROR
   ========================================================================== */

export class ApiError extends Error {
  status: number | null;

  data: unknown;

  constructor(
    message: string,
    status: number | null = null,
    data: unknown = null,
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}


/* ==========================================================================
   REQUEST OPTIONS
   ========================================================================== */

interface ApiRequestOptions {
  method?:
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE';

  token?: string | null;

  body?: unknown;
}


/* ==========================================================================
   BUILD URL
   ========================================================================== */

function buildUrl(
  path: string,
): string {
  const normalizedPath =
    path.startsWith('/')
      ? path
      : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}


/* ==========================================================================
   VALIDATION ERROR MESSAGE
   ========================================================================== */

function extractFirstValidationError(
  data: unknown,
): string | null {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('errors' in data)
  ) {
    return null;
  }

  const errors =
    (
      data as {
        errors?: unknown;
      }
    ).errors;

  if (
    typeof errors !== 'object' ||
    errors === null
  ) {
    return null;
  }

  for (
    const value
    of Object.values(errors)
  ) {
    if (
      Array.isArray(value)
    ) {
      const firstMessage =
        value.find(
          (
            item,
          ): item is string =>
            typeof item === 'string' &&
            item.trim() !== '',
        );

      if (
        firstMessage
      ) {
        return firstMessage;
      }
    }

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      return value;
    }
  }

  return null;
}


/* ==========================================================================
   RESPONSE MESSAGE
   ========================================================================== */

function extractMessage(
  data: unknown,
  fallback: string,
): string {
  const validationMessage =
    extractFirstValidationError(
      data,
    );

  if (
    validationMessage
  ) {
    return validationMessage;
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data
  ) {
    const message =
      (
        data as {
          message?: unknown;
        }
      ).message;

    if (
      typeof message === 'string' &&
      message.trim() !== ''
    ) {
      return message;
    }
  }

  return fallback;
}


/* ==========================================================================
   API REQUEST
   ========================================================================== */

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      API_TIMEOUT_MS,
    );

  try {
    /*
    |--------------------------------------------------------------------------
    | Detect FormData
    |--------------------------------------------------------------------------
    |
    | Normal StyleHub requests use JSON.
    |
    | Profile-photo uploads use multipart FormData.
    |
    */

    const isFormDataBody =
      typeof FormData !== 'undefined' &&
      options.body instanceof FormData;


    /* ======================================================================
       HEADERS
       ====================================================================== */

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };


    /*
    |--------------------------------------------------------------------------
    | JSON Content Type
    |--------------------------------------------------------------------------
    |
    | Do NOT manually set Content-Type for FormData.
    |
    | fetch() must automatically create the multipart boundary.
    |
    */

    if (
      options.body !== undefined &&
      !isFormDataBody
    ) {
      headers['Content-Type'] =
        'application/json';
    }


    /* ======================================================================
       AUTHORIZATION
       ====================================================================== */

    if (
      options.token
    ) {
      headers.Authorization =
        `Bearer ${options.token}`;
    }


    /* ======================================================================
       REQUEST BODY
       ====================================================================== */

    let requestBody:
      | string
      | FormData
      | undefined;


    if (
      options.body === undefined
    ) {
      requestBody =
        undefined;
    } else if (
      isFormDataBody
    ) {
      requestBody =
        options.body as FormData;
    } else {
      requestBody =
        JSON.stringify(
          options.body,
        );
    }


    /* ======================================================================
       FETCH
       ====================================================================== */

    const response =
      await fetch(
        buildUrl(path),
        {
          method:
            options.method ??
            'GET',

          headers,

          body:
            requestBody,

          signal:
            controller.signal,
        },
      );


    /* ======================================================================
       RESPONSE BODY
       ====================================================================== */

    const responseText =
      await response.text();

    let responseData: unknown =
      null;


    if (
      responseText.trim() !== ''
    ) {
      try {
        responseData =
          JSON.parse(
            responseText,
          );
      } catch {
        responseData =
          null;
      }
    }


    /* ======================================================================
       HTTP ERROR
       ====================================================================== */

    if (
      !response.ok
    ) {
      throw new ApiError(
        extractMessage(
          responseData,
          'The request could not be completed.',
        ),

        response.status,

        responseData,
      );
    }


    /* ======================================================================
       SUCCESS
       ====================================================================== */

    return responseData as T;
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Known API Error
    |--------------------------------------------------------------------------
    */

    if (
      error instanceof ApiError
    ) {
      throw error;
    }


    /*
    |--------------------------------------------------------------------------
    | Timeout
    |--------------------------------------------------------------------------
    */

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new ApiError(
        'The request timed out. Please check your connection and try again.',
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Network Error
    |--------------------------------------------------------------------------
    */

    throw new ApiError(
      'Unable to connect to StyleHub. Please check your network connection.',
    );
  } finally {
    clearTimeout(
      timeout,
    );
  }
}