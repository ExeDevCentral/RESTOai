# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: canonical definitions of financial, kitchen, tax and inventory terminology.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in (e.g., zero floats, state machine, FEFO, tamper-proof SHA-256 audit).

## File structure

Single-context repo:

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-money-as-bigint-cents.md
│   └── 0002-tamper-proof-audit-hash-chain.md
└── packages/
    ├── db/
    └── domain/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids (e.g. use `Money` as BigInt cents, not float `price` or `amount`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding.
