import { Response } from 'express';
import { ApiResponse as IApiResponse, HttpStatus, PaginationMeta } from '@lifeos/shared';

export class ApiResponse {
  public static success<T>(
    res: Response,
    data?: T,
    message: string = 'Operation successful',
    statusCode: number = HttpStatus.OK,
    meta?: PaginationMeta,
  ): Response {
    const responsePayload: IApiResponse<T> = {
      success: true,
      statusCode,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(responsePayload);
  }

  public static error(
    res: Response,
    message: string = 'Operation failed',
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    errors?: any[],
  ): Response {
    const responsePayload: IApiResponse = {
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(responsePayload);
  }
}
