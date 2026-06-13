import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: "node", args: ["dist/index.js"] });
const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
console.log("TOOLS:", names.join(", "));
if (names.length !== 3) throw new Error("expected exactly 3 tools, got " + names.length);
// honesty: every tool description must repeat supplied_data_only
for (const t of tools) if (!/supplied_data_only/.test(t.description)) throw new Error("tool " + t.name + " missing scope note");

async function call(name, args) {
  const r = await client.callTool({ name, arguments: args });
  return JSON.parse(r.content[0].text);
}

const review = await call("assess_invoice_before_payment", {
  invoice: { supplier_name: "ACME", amount: 100, currency: "EUR", payment_iban: "XX9" },
  expected: { supplier: "ACME", amount: 100, iban: "PT50" },
});
console.log("ASSESS(review):", review.decision, "· scope:", review.scope?.mode, "· human_conf:", review.human_confirmation_required);
if (review.decision !== "review" || review.scope?.mode !== "supplied_data_only") throw new Error("assess review failed");

const allow = await call("assess_invoice_before_payment", {
  invoice: { supplier_name: "ACME", amount: 100, currency: "EUR", payment_iban: "PT50" },
  expected: { supplier: "ACME", amount: 100, iban: "PT50" },
});
console.log("ASSESS(allow):", allow.decision);
if (allow.decision !== "allow") throw new Error("assess allow failed");

const block = await call("assess_invoice_before_payment", {
  invoice: { supplier_name: "ACME", amount: 100, currency: "EUR", invoice_number: "INV-1" },
  history: { previous_invoice_ids: ["INV-1"] },
});
console.log("ASSESS(block):", block.decision);
if (block.decision !== "block") throw new Error("assess block failed");

const packs = await call("list_proofjson_packs", {});
console.log("PACKS:", (packs.live_packs || []).length);

const verify = await call("verify_proofjson_proof", { proof: {} });
console.log("VERIFY (honest not-yet):", verify.error);
if (verify.error !== "not_yet_available") throw new Error("verify should be honest not_yet_available");

console.log("MCP TESTS: PASS — 3 tools, allow/review/block, scope preserved, honest verify, no crash");
await client.close();
process.exit(0);
