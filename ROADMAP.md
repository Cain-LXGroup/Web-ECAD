# Schematic Tablet — roadmap

Tablet-first schematic editing. The worksheet (KiCad canvas theme, grid, symbol rendering) stays stable; work focuses on gestures, chrome, and productivity around the canvas.

**Already shipped (baseline):** glass UI, KiCad tool icons, two-finger pinch/pan, screen-accurate touch placement, wire palette, wire rubber-band preview, SVG/PNG/PDF/JSON export, keyboard shortcuts, floating chrome hides when drawers open.

**Tablet feel (shipped):** undo/redo stack + floating buttons + Cmd/Ctrl+Z; pencil vs finger pan mode (settings); double-tap fit view; long-press context menu (duplicate/delete); zoom-to-selection + Fit toolbar; inertial pan; snap ring + vibrate on snap; ruler HUD while drag/wire; optional placement sounds; collapsible tool palettes (wire + select/label/text); safe-area insets on toolbars/HUD/undo.

---

## Current priorities (in active development)

These replace the former “Stage 2 / Stage 3” buckets — implement in the product rather than deferring to a later rollout phase.

| Priority | Feature | Notes |
|----------|---------|--------|
| 1 | **Multi-select** | Shift/meta tap-add; second tap toggles on tablet; move/delete/rotate apply to all selected |
| 2 | **Clipboard** | Copy/cut/paste selection (symbols, wires, labels) with offset on paste |
| 3 | **Favourites / starred parts** | Star symbols in library; favourites section in search panel |
| 4 | **Global and sheet labels** | KiCad-style hierarchical labels (`global` vs `sheet` scope); distinct rendering |
| 5 | **Multiple sheets** | Per-sheet content; sheet tabs in chrome; migration from single-sheet projects |
| 6 | **Highlight nets** | Visual highlight of connected net when selecting wire, pin, or label |
| 7 | **Auto save** | Debounced persist to IndexedDB on edit; manual Save remains |

---

## Later (not scheduled)

Ideas aligned with tablet + KiCad workflow, not committed to a phase:

- Minimap and two-finger rotate  
- Pencil hover preview  
- Template gallery  
- ERC-lite, BOM preview  
- Share sheet export (Web Share API)  
- Split view / landscape layout polish  

---

## Verification

After changes, run `npm run build` and smoke-test on device or GitHub Pages: multi-select drag, paste offset, sheet switch, net highlight, auto-save indicator.
