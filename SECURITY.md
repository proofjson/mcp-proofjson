# Security Policy

`mcp-proofjson` is a **local stdio** MCP client. It exposes exactly three tools and calls only the
ProofJSON HTTPS API (`/v1/assess/invoice`, `/a2a/card`). It does NOT include any engine, scoring logic,
secrets, arbitrary fetch, browser, shell, filesystem access or generic HTTP proxy.

## Scope
- v1 invoice assessment is `supplied_data_only`: it does not independently verify supplier IBAN ownership,
  sanctions status, bank account ownership or external payment history unless external trust adapters are configured.
- There is **no public remote MCP** yet. Use it locally (stdio) only.

## Reporting a vulnerability
Email **contact@adholding.eu** with details. Please do not open public issues for security reports.
We aim to acknowledge within a reasonable time. No bug-bounty is offered at this stage.
