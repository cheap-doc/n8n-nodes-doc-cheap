import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from "n8n-workflow";
import {
  deleteScan,
  getBalance,
  getManyScans,
  getScan,
  scanDocument,
  searchScans,
} from "./actions";
import { nodeProperties } from "./description";

type Operation = (
  this: IExecuteFunctions,
  itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

const OPERATIONS: Record<string, Record<string, Operation>> = {
  account: { getBalance },
  scan: { scan: scanDocument, get: getScan, getAll: getManyScans, delete: deleteScan },
};

export class DocCheap implements INodeType {
  description: INodeTypeDescription = {
    displayName: "doc.cheap",
    name: "docCheap",
    icon: { light: "file:docCheap.svg", dark: "file:docCheap.dark.svg" },
    group: ["transform"],
    version: [1],
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Read passports, ID cards and driving licences into structured fields",
    defaults: { name: "doc.cheap" },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    usableAsTool: true,
    credentials: [{ name: "docCheapApi", required: true }],
    properties: nodeProperties,
  };

  methods = {
    listSearch: { searchScans },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const resource = this.getNodeParameter("resource", itemIndex) as string;
        const operation = this.getNodeParameter("operation", itemIndex) as string;
        const run = OPERATIONS[resource]?.[operation];
        if (run === undefined) {
          throw new NodeOperationError(
            this.getNode(),
            `The operation "${operation}" is not supported for "${resource}"`,
            { itemIndex },
          );
        }
        const result = await run.call(this, itemIndex);
        const executionData = this.helpers.constructExecutionMetaData(
          this.helpers.returnJsonArray(result),
          { itemData: { item: itemIndex } },
        );
        returnData.push(...executionData);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        if (error instanceof NodeApiError || error instanceof NodeOperationError) {
          // Already carries the API's message and docs link; only the failing item is added.
          const known = error;
          known.context.itemIndex = itemIndex;
          throw known;
        }
        throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
      }
    }

    return [returnData];
  }
}
