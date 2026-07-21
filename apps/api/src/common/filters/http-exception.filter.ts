import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';

type ErrorResponseBody = {
  code?: string;
  message?: string | string[];
  details?: unknown;
  error?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const status = this.getStatus(exception);
    const body = this.getBody(exception);

    response.status(status).json({
      error: {
        code: body.code ?? this.codeFromStatus(status),
        message: this.messageFromBody(body, status),
        details: body.details ?? null
      }
    });
  }

  private getStatus(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getBody(exception: unknown): ErrorResponseBody {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { message: response };
    }

    if (response && typeof response === 'object') {
      return response as ErrorResponseBody;
    }

    return {};
  }

  private messageFromBody(body: ErrorResponseBody, status: number) {
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }

    return body.message ?? body.error ?? this.defaultMessage(status);
  }

  private codeFromStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR';
    }
  }

  private defaultMessage(status: number) {
    return status >= 500 ? 'Internal server error.' : 'Request failed.';
  }
}
