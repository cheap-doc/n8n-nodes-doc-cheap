import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from "n8n-workflow";
import { NodeOperationError } from "n8n-workflow";
import { simplifyScan } from "./simplify";
import { docCheapApiRequest } from "./transport";

/** The API's own ceiling on one page of the scan list. */
export const MAX_PAGE_SIZE = 100;

const COUNTRY_CODE = /^[A-Z]{3}$/;

function scanPath(id: string): string {
  return `/v1/scans/${encodeURIComponent(id)}`;
}

function readScanId(context: IExecuteFunctions, itemIndex: number): string {
  const id = String(context.getNodeParameter("scanId", itemIndex, "", { extractValue: true }));
  if (id.trim() === "") {
    throw new NodeOperationError(context.getNode(), "Choose a scan or enter its ID", {
      itemIndex,
    });
  }
  return id.trim();
}

/** Builds the scan request body from the node's options, leaving out what the user did not set. */
export function buildScanBody(
  image: string,
  options: IDataObject,
): { body: IDataObject; headers?: IDataObject } {
  const scanOptions: IDataObject = {};
  const country = typeof options.expectCountry === "string" ? options.expectCountry.trim() : "";
  if (country !== "") scanOptions.expect_country = country.toUpperCase();
  if (typeof options.returnPortrait === "boolean")
    scanOptions.return_portrait = options.returnPortrait;
  if (typeof options.retainHours === "number") scanOptions.retain_hours = options.retainHours;

  const body: IDataObject = { image };
  if (Object.keys(scanOptions).length > 0) body.options = scanOptions;
  const reference = typeof options.reference === "string" ? options.reference : "";
  if (reference !== "") body.reference = reference;

  const key = typeof options.idempotencyKey === "string" ? options.idempotencyKey : "";
  return key === "" ? { body } : { body, headers: { "Idempotency-Key": key } };
}

export async function scanDocument(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject> {
  const binaryPropertyName = this.getNodeParameter("binaryPropertyName", itemIndex) as string;
  const options = this.getNodeParameter("options", itemIndex, {}) as IDataObject;
  const simplify = this.getNodeParameter("simplify", itemIndex, true) as boolean;

  const country = typeof options.expectCountry === "string" ? options.expectCountry.trim() : "";
  if (country !== "" && !COUNTRY_CODE.test(country.toUpperCase())) {
    throw new NodeOperationError(
      this.getNode(),
      `Expected Country must be a three-letter code such as GRC, not "${country}"`,
      { itemIndex },
    );
  }

  this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
  const bytes = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
  const { body, headers } = buildScanBody(bytes.toString("base64"), options);
  const scan = await docCheapApiRequest.call(this, {
    method: "POST",
    path: "/v1/scans",
    body,
    headers,
  });
  return simplify ? simplifyScan(scan) : scan;
}

export async function getScan(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
  const simplify = this.getNodeParameter("simplify", itemIndex, true) as boolean;
  const scan = await docCheapApiRequest.call(this, {
    method: "GET",
    path: scanPath(readScanId(this, itemIndex)),
  });
  return simplify ? simplifyScan(scan) : scan;
}

export async function deleteScan(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
  return await docCheapApiRequest.call(this, {
    method: "DELETE",
    path: scanPath(readScanId(this, itemIndex)),
  });
}

export async function getManyScans(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<IDataObject[]> {
  const returnAll = this.getNodeParameter("returnAll", itemIndex, false) as boolean;
  const limit = returnAll
    ? Number.POSITIVE_INFINITY
    : (this.getNodeParameter("limit", itemIndex, 50) as number);
  const scans: IDataObject[] = [];
  let cursor: string | undefined;
  do {
    const qs: IDataObject = { limit: Math.min(MAX_PAGE_SIZE, limit - scans.length) };
    if (cursor !== undefined) qs.cursor = cursor;
    const page = await docCheapApiRequest.call(this, { method: "GET", path: "/v1/scans", qs });
    const rows = Array.isArray(page.scans) ? (page.scans as IDataObject[]) : [];
    scans.push(...rows);
    cursor = typeof page.next_cursor === "string" && rows.length > 0 ? page.next_cursor : undefined;
  } while (cursor !== undefined && scans.length < limit);
  return scans.slice(0, limit);
}

export async function getBalance(this: IExecuteFunctions): Promise<IDataObject> {
  return await docCheapApiRequest.call(this, { method: "GET", path: "/v1/usage" });
}

/** Feeds the scan picker: one page of the list per call, newest first. */
export async function searchScans(
  this: ILoadOptionsFunctions,
  filter?: string,
  paginationToken?: string,
): Promise<{ results: Array<{ name: string; value: string }>; paginationToken?: string }> {
  const qs: IDataObject = { limit: MAX_PAGE_SIZE };
  if (paginationToken) qs.cursor = paginationToken;
  const page = await docCheapApiRequest.call(this, { method: "GET", path: "/v1/scans", qs });
  const rows = Array.isArray(page.scans) ? (page.scans as IDataObject[]) : [];
  const needle = (filter ?? "").trim().toLowerCase();
  const results = rows
    .map((row) => {
      const id = String(row.id);
      const label =
        typeof row.reference === "string" && row.reference !== ""
          ? row.reference
          : String(row.status);
      return { name: `${String(row.created_at)} – ${label}`, value: id };
    })
    .filter((row) => needle === "" || `${row.name} ${row.value}`.toLowerCase().includes(needle));
  const next = typeof page.next_cursor === "string" ? page.next_cursor : undefined;
  return next === undefined ? { results } : { results, paginationToken: next };
}
