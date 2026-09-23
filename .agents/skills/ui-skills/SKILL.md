---
name: ui-skills
description: Routing layer and comprehensive guide for UI Skills (ibelick/ui-skills). Use before UI-related work to select or apply design engineering skills including baseline-ui, improve-ui, create-design-md, fixing-accessibility, fixing-metadata, fixing-motion-performance, or fetch specialized UI skills.
license: MIT
metadata:
  author: ibelick
  version: "1.0.0"
---

# UI Skills

Routing layer and catalog for UI Skills for Design Engineers.

## Installed Skills

1. **baseline-ui** (`/baseline-ui`): Quickly deslop UI code by fixing spacing, hierarchy, typography, and small layout issues. Use when the interface needs a fast cleanup or polish pass.
2. **improve-ui** (`/improve-ui`): Deeply audit an existing product surface against its design evidence, identify verified UI problems, and create clean implementation plans.
3. **create-design-md** (`/create-design-md`): Document an interface's design language into a `DESIGN.md` token specification from repository or URL evidence.
4. **fixing-accessibility** (`/fixing-accessibility`): Audit and fix HTML accessibility issues (ARIA labels, keyboard navigation, focus management, color contrast, semantic HTML).
5. **fixing-motion-performance** (`/fixing-motion-performance`): Audit and fix animation performance issues (layout thrashing, compositor properties, scroll-linked motion, blur effects).
6. **fixing-metadata** (`/fixing-metadata`): Audit and fix HTML metadata (titles, meta descriptions, canonical URLs, Open Graph, Twitter cards, favicons).

## CLI Quick Reference

Browse or fetch additional community skills dynamically from the registry:

```bash
npx ui-skills start
npx ui-skills categories
npx ui-skills list --category <category>
npx ui-skills get <slug>
```

## Selection Rules

- Prefer 1 skill per task.
- Use 2 only when the task needs two distinct angles (e.g., accessibility + baseline-ui).
- Route by topic, then stack, then specificity.
