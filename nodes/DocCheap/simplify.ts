import type { IDataObject } from "n8n-workflow";

function section(scan: IDataObject, key: string): IDataObject {
  const value = scan[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as IDataObject)
    : {};
}

function pick(source: IDataObject, key: string): IDataObject[string] {
  return source[key] === undefined ? null : source[key];
}

/**
 * The flat view of a scan that most workflows map into a form or a row: who
 * the holder is, which document it was and whether the reading can be
 * trusted. Crops, per-field readings, quality and authenticity checks stay in
 * the full answer, which the Simplify switch turns off.
 */
export function simplifyScan(scan: IDataObject): IDataObject {
  const meta = section(scan, "meta");
  const document = section(scan, "document");
  const holder = section(scan, "holder");
  const mrz = section(scan, "mrz");
  return {
    id: pick(meta, "id"),
    status: pick(meta, "status"),
    confidence: pick(meta, "confidence"),
    billed: pick(meta, "billed"),
    reference: pick(meta, "reference"),
    document_kind: pick(document, "kind"),
    document_country: pick(document, "country"),
    document_number: pick(document, "number"),
    expiry_date: pick(document, "expiry_date"),
    is_expired: pick(document, "is_expired"),
    surname: pick(holder, "surname"),
    given_names: pick(holder, "given_names"),
    birth_date: pick(holder, "birth_date"),
    sex: pick(holder, "sex"),
    nationality: pick(holder, "nationality"),
    mrz_status: pick(mrz, "status"),
  };
}
