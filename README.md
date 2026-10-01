# n8n-nodes-doc-cheap

An [n8n](https://n8n.io/) community node for [doc.cheap](https://doc.cheap): it
reads a photo or scan of a passport, national ID card or driving licence and
returns the printed fields – name, date of birth, document number, expiry, the
machine-readable zone – as structured workflow data.

One recognised document costs one credit, $0.01. Registering gives 100 free
documents every month. An unreadable image, an empty frame or an unsupported
document type costs nothing, and every answer says whether it was billed.

[Installation](#installation) ·
[Credentials](#credentials) ·
[Operations](#operations) ·
[Compatibility](#compatibility) ·
[Usage](#usage) ·
[Resources](#resources) ·
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
in the n8n community nodes documentation. In the n8n editor: **Settings →
Community Nodes → Install**, then enter:

```text
@doc-cheap/n8n-nodes-doc-cheap
```

## Credentials

Create a **doc.cheap API** credential.

- **API Key** – a live key (`sk_live_…`) from the
  [doc.cheap cabinet](https://doc.cheap/docs/concepts/api-keys-and-sessions),
  or the public sandbox key `sk_sandbox_public` to try the node without an
  account. The sandbox key gives 10 free recognised documents per address in
  all, and at most 10 requests per address an hour, whatever their answer.
- **Base URL** – leave it at `https://api.doc.cheap`.

n8n tests the credential by reading the balance, which spends nothing.

## Operations

**Scan**

- **Scan Document** – recognises the image in an input binary field (JPEG or
  PNG). Options: the country you expect (a three-letter code such as `GRC`),
  your own reference, an idempotency key (sending the same key again returns
  the first answer instead of charging a second scan), how many hours the
  result can be read back, and whether to return the holder's photo crop.
- **Get** – reads back a stored scan result, picked from a list or by its ID.
- **Get Many** – lists the account's stored scans, newest first, with
  **Return All** or a **Limit**.
- **Delete** – deletes a stored scan result for good.

**Account**

- **Get Balance** – this month's free credits, the paid credits, the credits
  spent and this period's scan counters. With the public sandbox key there is
  no account behind the call, so the balance comes back empty.

**Simplify.** Scan Document and Get return a flat summary by default: the scan
ID, status, confidence, whether it was billed, your reference, the document
kind, country, number and expiry, and the holder's surname, given names, date
of birth, sex and nationality. Turn **Simplify** off for the full answer –
per-field readings, the machine-readable zone, image crops, quality and
authenticity checks.

**Stored results.** A result is stored only when the scan was made with a live
key under a non-zero retention window, and only until that window ends. Under a
sandbox key nothing is stored, so Get Many returns nothing and Get or Delete
find nothing. None of Get, Get Many, Delete or Get Balance charges a credit.

The node can also be used as a tool by an n8n agent node.

## Compatibility

Built with `@n8n/node-cli` and `n8n-workflow` 2.x. Tested with n8n 2.41.5.
The package has no runtime dependencies.

## Usage

A typical workflow: a trigger that receives a file (a form upload, an e-mail
attachment, a cloud-storage watcher) → **doc.cheap: Scan Document** with
**Input Binary Field** set to the field holding the image → a node that writes
the simplified fields into a spreadsheet, a database row or a CRM record.

An API error stops the workflow with the API's own message and a link to the
matching page of the documentation. Turn on **Continue On Fail** to receive the
error as an item instead.

## Resources

- [doc.cheap documentation](https://doc.cheap/docs)
- [Your first recognition](https://doc.cheap/docs/start/first-recognition)
- [From the sandbox to a live key](https://doc.cheap/docs/start/from-sandbox-to-live)
- [API reference](https://doc.cheap/docs/reference)
- [Handling errors](https://doc.cheap/docs/guides/handle-errors)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Version history

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
