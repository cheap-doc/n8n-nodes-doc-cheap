# Changelog

## 0.1.1

- The README said nothing is stored under a sandbox key. In fact the public
  sandbox key `sk_sandbox_public` keeps a record of every scan for one year,
  with a reduced thumbnail and the address it came from, and cannot read it
  back; an account's own sandbox key stores nothing. The text now says so, and
  asks for test images only, never a real document.

## 0.1.0

First release.

- **Scan Document** – recognises a passport, ID card or driving licence image
  from an input binary field, with a simplified or full answer.
- **Get**, **Get Many** and **Delete** for stored scan results.
- **Get Balance** for the account's credits and scan counters.
- The **doc.cheap API** credential, tested by reading the balance.
- Usable as a tool by n8n agent nodes.
