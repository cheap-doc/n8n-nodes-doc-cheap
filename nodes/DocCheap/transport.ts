import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  INode,
  JsonObject,
} from "n8n-workflow";
import { NodeApiError } from "n8n-workflow";

export const DEFAULT_BASE_URL = "https://api.doc.cheap";

/** The error body every non-2xx answer of the API carries. */
export interface DocCheapApiErrorBody {
  code: string;
  message: string;
  docs_url?: string;
  request_id?: string;
}

export interface DocCheapRequest {
  method: IHttpRequestMethods;
  path: string;
  body?: IDataObject;
  qs?: IDataObject;
  headers?: IDataObject;
}

export function normalizeBaseUrl(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return (text === "" ? DEFAULT_BASE_URL : text).replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBody(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Finds the API's `{ error: { code, message } }` body inside whatever the HTTP
 * helper threw. The helper's error shape differs between n8n versions: the
 * body can sit on the error itself, on its `response`, or on the original
 * error kept as `cause`, and it can arrive parsed or as a JSON string.
 */
export function readApiError(error: unknown): DocCheapApiErrorBody | undefined {
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!isRecord(current) || seen.has(current)) continue;
    seen.add(current);
    const inner = current.error;
    if (isRecord(inner) && typeof inner.code === "string" && typeof inner.message === "string") {
      return {
        code: inner.code,
        message: inner.message,
        docs_url: typeof inner.docs_url === "string" ? inner.docs_url : undefined,
        request_id: typeof inner.request_id === "string" ? inner.request_id : undefined,
      };
    }
    const response = current.response;
    if (isRecord(response)) queue.push(parseBody(response.body), parseBody(response.data));
    queue.push(parseBody(current.body), parseBody(current.data), current.cause, current.context);
    queue.push(parseBody(current.description));
  }
  return undefined;
}

function readHttpCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const candidates = [
    error.httpCode,
    error.statusCode,
    error.status,
    isRecord(error.response) ? error.response.status : undefined,
    isRecord(error.cause) && isRecord(error.cause.response)
      ? error.cause.response.status
      : undefined,
  ];
  const found = candidates.find((value) => typeof value === "number" || typeof value === "string");
  return found === undefined ? undefined : String(found);
}

/** Turns a failed call into an error that names the API's own code and its documentation page. */
export function toNodeApiError(node: INode, error: unknown): NodeApiError {
  const body = readApiError(error);
  const httpCode = readHttpCode(error);
  if (body === undefined) {
    return new NodeApiError(node, error as JsonObject, httpCode ? { httpCode } : {});
  }
  const details = [`Error code: ${body.code}.`];
  if (body.docs_url) details.push(`What it means and what to do: ${body.docs_url}`);
  if (body.request_id) details.push(`Request ID: ${body.request_id}`);
  return new NodeApiError(node, error as JsonObject, {
    message: body.message,
    description: details.join(" "),
    ...(httpCode ? { httpCode } : {}),
  });
}

export async function docCheapApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  request: DocCheapRequest,
): Promise<IDataObject> {
  const credentials = await this.getCredentials("docCheapApi");
  const options: IHttpRequestOptions = {
    method: request.method,
    url: `${normalizeBaseUrl(credentials.baseUrl)}${request.path}`,
    json: true,
  };
  if (request.body !== undefined) options.body = request.body;
  if (request.qs !== undefined) options.qs = request.qs;
  if (request.headers !== undefined) options.headers = request.headers;
  try {
    return (await this.helpers.httpRequestWithAuthentication.call(
      this,
      "docCheapApi",
      options,
    )) as IDataObject;
  } catch (error) {
    throw toNodeApiError(this.getNode(), error);
  }
}
