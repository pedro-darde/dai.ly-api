import EntityNotFoundError from "../../presentation/errors/EntityNotFoundError";
import { ServerError } from "../../presentation/errors/ServerError";

export type HttpResponse = {
  statusCode: number;
  body: any;
};

export const notFound = (error: EntityNotFoundError) => ({
  statusCode: error.statusCode,
  body: error,
});

export const serverError = (e: Error) => ({
  statusCode: INTERNAL_SERVER_ERROR,
  body: new ServerError(),
});

export const ok = (data: any) => ({
  statusCode: 200,
  body: data,
});

export const badRequest = (err: Error) => ({
  statusCode: 400,
  body: err,
});

export const INTERNAL_SERVER_ERROR = 500;
