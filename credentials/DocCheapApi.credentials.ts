import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class DocCheapApi implements ICredentialType {
  name = "docCheapApi";

  displayName = "doc.cheap API";

  icon = { light: "file:docCheap.svg", dark: "file:docCheap.dark.svg" } as const;

  documentationUrl = "https://doc.cheap/docs/concepts/api-keys-and-sessions";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      required: true,
      default: "",
      description:
        "A live key (sk_live_…) from the doc.cheap cabinet, or sk_sandbox_public to try the node without an account",
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.doc.cheap",
      description: "Change it only to reach a self-run copy of the API",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "=Bearer {{$credentials.apiKey}}",
      },
    },
  };

  // The usage endpoint answers every valid key, the public sandbox key
  // included, and spends nothing, so it proves the key without a side effect.
  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "/v1/usage",
    },
  };
}
