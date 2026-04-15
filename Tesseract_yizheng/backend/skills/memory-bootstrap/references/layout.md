# Memory Bootstrap Layout Reference

## Recommended Tree

```text
docs/memory/
├── CLAUDE.md
├── MEMORY.md
├── OPERATING_RULES.md
├── daily/
│   ├── CLAUDE.md
│   ├── TEMPLATE.md
│   └── YYYY-MM-DD.md
├── bank/
│   ├── CLAUDE.md
│   ├── world.md
│   ├── experience.md
│   ├── opinions.md
│   └── entities/
│       ├── CLAUDE.md
│       └── recurring-entity.md
```

## File Intent

### MEMORY.md

- Only cross-session core
- 1-2 screens max
- rewrite-only, not append-only

### OPERATING_RULES.md

- load order
- write order
- promotion gates
- anti-bloat rules

### daily/YYYY-MM-DD.md

- high-value daily summary only
- no raw transcript
- end with `## Retain`

### bank/world.md

- objective, stable facts

### bank/experience.md

- validated lessons and repeated pitfalls

### bank/opinions.md

- preferences with confidence

### bank/entities/*.md

- only for recurring people / projects / products
- delay creation until repeated appearance is clear

## Daily Template

```md
# YYYY-MM-DD

## New Facts
- 

## Decisions
- 

## Constraints
- 

## Retain
- 
- 
```

## Promotion Heuristic

Promote `daily -> bank` when content is stable, repeated, and likely to help future work.  
Promote `bank -> MEMORY` only when the content is something every future session should know by default.
