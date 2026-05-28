# Contributing

## License and provenance

By contributing, you agree your changes are licensed under GPL-3.0.

When a change reuses or ports behavior from KiCad sources, include:

- Source file path(s) from `kicad-source-mirror-master`
- A short "what was reused" summary
- Whether code was copied/adapted or behavior-only reimplemented

Use a short provenance block in PR descriptions:

```text
KiCad provenance:
- source: eeschema/...
- reuse: adapted logic / behavior-only
- notes: ...
```

## Reuse policy

- Prefer deterministic domain-model logic over UI-coupled logic.
- Reuse KiCad code only when it materially accelerates parity and is easy to test.
- If behavior is reimplemented, add fixture tests against KiCad-compatible inputs.

## Quality bar

- Keep logging at the beginning of non-trivial routines.
- Add tests/fixtures for electrical behavior changes.
- Run `npm run build` before opening a PR.
