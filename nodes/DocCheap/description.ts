import type { INodeProperties } from "n8n-workflow";

/** The shape of a scan id: a lower-case UUID version 7. */
export const SCAN_ID_REGEX = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export const resourceProperty: INodeProperties = {
  displayName: "Resource",
  name: "resource",
  type: "options",
  noDataExpression: true,
  options: [
    { name: "Account", value: "account" },
    { name: "Scan", value: "scan" },
  ],
  default: "scan",
};

const accountOperation: INodeProperties = {
  displayName: "Operation",
  name: "operation",
  type: "options",
  noDataExpression: true,
  displayOptions: { show: { resource: ["account"] } },
  options: [
    {
      name: "Get Balance",
      value: "getBalance",
      action: "Get the account balance",
      description: "Get the credits left and how many were spent this period",
    },
  ],
  default: "getBalance",
};

const scanOperation: INodeProperties = {
  displayName: "Operation",
  name: "operation",
  type: "options",
  noDataExpression: true,
  displayOptions: { show: { resource: ["scan"] } },
  options: [
    {
      name: "Delete",
      value: "delete",
      action: "Delete a scan",
      description: "Delete a stored scan result for good",
    },
    {
      name: "Get",
      value: "get",
      action: "Get a scan",
      description: "Read back a stored scan result",
    },
    {
      name: "Get Many",
      value: "getAll",
      action: "Get many scans",
      description: "List the account's scans, most recent first",
    },
    {
      name: "Scan Document",
      value: "scan",
      action: "Scan a document",
      description: "Read a passport, ID card or driving licence image into fields",
    },
  ],
  default: "scan",
};

const scanDocumentFields: INodeProperties[] = [
  {
    displayName: "Input Binary Field",
    name: "binaryPropertyName",
    type: "string",
    required: true,
    default: "data",
    hint: "The name of the input binary field that holds the document image (JPEG or PNG)",
    displayOptions: { show: { resource: ["scan"], operation: ["scan"] } },
  },
  {
    displayName: "Options",
    name: "options",
    type: "collection",
    placeholder: "Add Option",
    default: {},
    displayOptions: { show: { resource: ["scan"], operation: ["scan"] } },
    options: [
      {
        displayName: "Expected Country",
        name: "expectCountry",
        type: "string",
        default: "",
        placeholder: "e.g. GRC",
        description:
          "Three-letter ISO 3166-1 alpha-3 code of the country you expect the document to be from. Leave empty for any country.",
      },
      {
        displayName: "Idempotency Key",
        name: "idempotencyKey",
        type: "string",
        default: "",
        description:
          "A unique string for this document. Sending the same key again returns the first answer instead of charging a second scan.",
      },
      {
        displayName: "Reference",
        name: "reference",
        type: "string",
        default: "",
        description:
          "Your own label for this scan, such as an order number. It is returned with the result.",
      },
      {
        displayName: "Retain Hours",
        name: "retainHours",
        type: "number",
        typeOptions: { minValue: 0, maxValue: 8760 },
        default: 24,
        description:
          "How many hours the result can be read back with Get. 0 keeps nothing. Leave this option out to use the account's own history setting.",
      },
      {
        displayName: "Return Portrait",
        name: "returnPortrait",
        type: "boolean",
        default: true,
        description: "Whether to return the holder's photo crop in the full answer",
      },
    ],
  },
];

const scanLocator: INodeProperties = {
  displayName: "Scan",
  name: "scanId",
  type: "resourceLocator",
  required: true,
  default: { mode: "list", value: "" },
  displayOptions: { show: { resource: ["scan"], operation: ["get", "delete"] } },
  modes: [
    {
      displayName: "From List",
      name: "list",
      type: "list",
      typeOptions: { searchListMethod: "searchScans", searchable: true },
    },
    {
      displayName: "By ID",
      name: "id",
      type: "string",
      placeholder: "e.g. 01a0af18-cd8d-7a61-9f2d-4c7b8e105da3",
      validation: [
        {
          type: "regex",
          properties: { regex: SCAN_ID_REGEX, errorMessage: "Not a valid scan ID" },
        },
      ],
    },
  ],
};

const simplifyField: INodeProperties = {
  displayName: "Simplify",
  name: "simplify",
  type: "boolean",
  default: true,
  description:
    "Whether to return a flat summary of the holder and the document instead of the full answer",
  displayOptions: { show: { resource: ["scan"], operation: ["scan", "get"] } },
};

const getManyFields: INodeProperties[] = [
  {
    displayName: "Return All",
    name: "returnAll",
    type: "boolean",
    default: false,
    description: "Whether to return all results or only up to a given limit",
    displayOptions: { show: { resource: ["scan"], operation: ["getAll"] } },
  },
  {
    displayName: "Limit",
    name: "limit",
    type: "number",
    typeOptions: { minValue: 1 },
    default: 50,
    description: "Max number of results to return",
    displayOptions: { show: { resource: ["scan"], operation: ["getAll"], returnAll: [false] } },
  },
];

export const nodeProperties: INodeProperties[] = [
  resourceProperty,
  accountOperation,
  scanOperation,
  ...scanDocumentFields,
  scanLocator,
  simplifyField,
  ...getManyFields,
];
