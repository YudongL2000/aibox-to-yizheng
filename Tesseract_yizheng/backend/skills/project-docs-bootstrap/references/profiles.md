# Profiles

Use one profile per project. Start small and expand only when the project genuinely needs more surface area.

## Selection Guide

- `minimal`: personal projects, prototypes, or small internal tools
- `opensource`: public repositories, libraries, or tools with outside contributors
- `saas`: commercial products, internal platforms, or long-lived services with deployment and operations needs

## Minimal

```text
docs/
├── README.md
├── getting-started/
│   └── quickstart.md
├── deployment/
│   └── deploy.md
└── changelog/
    └── CHANGELOG.md
```

## Open Source

```text
docs/
├── README.md
├── overview/
├── getting-started/
├── usage/
├── development/
├── security/
└── changelog/
```

## SaaS / Commercial

```text
docs/
├── README.md
├── overview/
├── getting-started/
├── usage/
├── development/
├── deployment/
├── security/
├── decisions/
└── changelog/
```

## Notes

- `decisions/` is for ADR-style records and should include its own index.
- `deployment/` matters earlier than most teams think; keep it even when other sections stay shallow.
- Do not create every optional page just because the tree allows it. Create the section, add a short placeholder, and deepen only the pages that get used.
