# mcp-proofjson

A **local** [MCP](https://modelcontextprotocol.io) server (stdio) that lets AI agents produce and verify **structured JSON outputs** — with explicit scope, checks performed, checks not performed and human-confirmation requirements, instead of opaque yes/no answers.

The first live pack focuses on **invoice assessment before payment**: given supplied invoice data, context and policy, it returns `allow` / `review` / `block` with reasons and confidence. Works in Claude Desktop, Cursor and other MCP clients.

> **Scope (v1):** `supplied_data_only`. It assesses the supplied data and configured policy. It does **not** independently verify supplier IBAN ownership, sanctions status, bank account ownership or external payment history unless external trust adapters are configured. `allow` is not a guarantee the invoice is safe.
>
> Local stdio only — there is **no public remote MCP** until auth, rate limits, audit logs, terms and privacy are finalised.

## Tools (exactly three)
- `assess_invoice_before_payment` — returns `allow` / `review` / `block` with reasons, confidence, scope, checks_performed, checks_not_performed, human_confirmation_required.
- `verify_proofjson_proof` — verify a proof for structure, hash consistency and signature validity. Does NOT verify the real-world truth of the underlying claim, invoice, supplier identity, IBAN ownership or sanctions status.
- `list_proofjson_packs` — lists the live Pack Tasks.

This server does **not** expose arbitrary fetch, a browser, a shell, the filesystem, a generic HTTP proxy, a generic run endpoint, or any internal scoring.

## Install & build
```bash
npm install
npm run build
```

## Use in Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "proofjson": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/mcp-proofjson/dist/index.js"]
    }
  }
}
```

## Use in Cursor
Add to `.cursor/mcp.json` (or Cursor Settings → MCP):
```json
{ "mcpServers": { "proofjson": { "command": "node", "args": ["/ABSOLUTE/PATH/mcp-proofjson/dist/index.js"] } } }
```

## Config
- `PROOFJSON_BASE` (env) — defaults to `https://proofjson.org`.

## Example
Ask your agent: *"Assess this invoice before payment. Supplier ACME, amount 4250 EUR, invoice IBAN PT50…789, expected IBAN PT50…154."* → the agent calls `assess_invoice_before_payment` → ProofJSON returns `review` because the IBAN differs from the expected IBAN supplied. The agent explains the result and recommends human confirmation.
