#!/usr/bin/env node
// ProofJSON MCP server (stdio, LOCAL ONLY — no public remote until auth/rate-limit/audit/terms/privacy are closed).
// Exposes EXACTLY three tools. No arbitrary fetch, no shell, no filesystem, no generic HTTP proxy, no internal scoring.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const BASE = process.env.PROOFJSON_BASE || "https://proofjson.org";
const SCOPE_NOTE =
  "ProofJSON v1 is supplied_data_only: it assesses the supplied invoice data, supplied context and configured " +
  "policy. It does NOT independently verify supplier IBAN ownership, sanctions status, bank account ownership or " +
  "external payment history unless external trust adapters are configured. allow is not a guarantee the invoice is safe.";

const TOOLS = [
  {
    name: "assess_invoice_before_payment",
    description:
      "Assess invoice payment risk before paying, approving, scheduling or escalating an invoice. Returns a decision " +
      "(allow | review | block) with reasons, confidence, scope, checks_performed, checks_not_performed and " +
      "human_confirmation_required. " + SCOPE_NOTE,
    inputSchema: {
      type: "object",
      properties: {
        invoice: {
          type: "object",
          description: "supplier_name, invoice_number, amount, currency, payment_iban, payment_account, purchase_order_number",
        },
        expected: { type: "object", description: "Optional caller expectations: supplier, amount, currency, iban" },
        policy: { type: "object", description: "Optional: review_above_amount, block_unknown_supplier, require_purchase_order" },
        history: { type: "object", description: "Optional: previous_invoice_ids" },
      },
      required: ["invoice"],
    },
  },
  {
    name: "verify_proofjson_proof",
    description:
      "Verify a ProofJSON proof for structure, hash consistency and signature validity. This tool does NOT " +
      "verify the real-world truth of the underlying claim, invoice, payment, supplier identity, IBAN ownership " +
      "or sanctions status. " + SCOPE_NOTE,
    inputSchema: {
      type: "object",
      properties: {
        proof: { type: "object" },
        expected_subject: { type: "string" },
        expected_hash: { type: "string" },
        options: { type: "object" },
      },
      required: ["proof"],
    },
  },
  {
    name: "list_proofjson_packs",
    description: "List the live ProofJSON Pack Tasks (verification capabilities). " + SCOPE_NOTE,
    inputSchema: { type: "object", properties: {} },
  },
];

async function assessInvoice(args: unknown) {
  const r = await fetch(BASE + "/v1/assess/invoice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args ?? {}),
  });
  return await r.json(); // preserves scope, checks_performed, checks_not_performed, non_claims, human_confirmation_required
}

async function listPacks() {
  const r = await fetch(BASE + "/a2a/card");
  const j: any = await r.json();
  return { live_packs: j.live_packs ?? [], free_tier: j.free_tier, scope_note: SCOPE_NOTE };
}

async function verifyProof(args: unknown) {
  const r = await fetch(BASE + "/v1/proofs/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args ?? {}),
  });
  return await r.json(); // preserves valid, status, scope, checks_performed, checks_not_performed, non_claims
}

const server = new Server({ name: "proofjson", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = req.params.arguments;
  let result: unknown;
  try {
    if (name === "assess_invoice_before_payment") result = await assessInvoice(args);
    else if (name === "list_proofjson_packs") result = await listPacks();
    else if (name === "verify_proofjson_proof") result = await verifyProof(args);
    else result = { error: "unknown_tool", name };
  } catch (e) {
    result = { error: "call_failed", detail: String(e) };
  }
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("mcp-proofjson stdio server running (3 tools, supplied_data_only)");
