# Schematic Tablet — 3-stage rollout

Tablet-first features grouped by dependency and impact. The worksheet (KiCad canvas theme, grid, symbol rendering) stays stable; stages focus on gestures, chrome, and productivity around the canvas.

**Already shipped (baseline):** glass UI, KiCad tool icons, two-finger pinch/pan, screen-accurate touch placement, wire palette, wire rubber-band preview, SVG/PNG/PDF/JSON export, keyboard shortcuts, floating chrome hides when drawers open.

**Stage 1 shipped:** undo/redo stack + floating buttons + Cmd/Ctrl+Z; pencil vs finger pan mode (settings); double-tap fit view; long-press context menu (duplicate/delete); zoom-to-selection + Fit toolbar; inertial pan; snap ring + vibrate on snap; ruler HUD while drag/wire; optional placement sounds; collapsible tool palettes (wire + select/label/text); safe-area insets on toolbars/HUD/undo.

---

## Stage 1 — Core tablet feel & undo

*Goal: The app feels intentional on iPad — fewer mis-taps, obvious navigation, undo like a pro tool.*

### Gestures & navigation

| Feature | Notes |
|--------|--------|
| **Double-tap** | Reset zoom: fit selection if any, else fit full sheet |
| **Long-press context menu** | On symbol/wire/label: duplicate, delete, properties (compact sheet) |
| **Zoom to selection** | Toolbar/button + optional gesture; frame selected bbox with padding |
| **Inertial / momentum pan** | After pan-tool release, decay velocity (Maps-like glide) |

### Apple Pencil & touch precision

| Feature | Notes |
|--------|--------|
| **Pencil vs finger modes** | Pencil → active tool (wire/select/place); finger → pan only (toggle in settings) |
| **Magnetic snap indicator** | Visual pulse/ring on pin, grid, or junction when snap engages |
| **Ruler / dimension readout** | HUD: distance in grid units while dragging or wiring |

### Haptics & feedback

| Feature | Notes |
|--------|--------|
| **Vibration on snap** | `navigator.vibrate` where supported; no-op elsewhere |
| **Sound toggles** | Optional click on place wire / place symbol (settings, off by default) |

### Productivity

| Feature | Notes |
|--------|--------|
| **Undo / redo stack** | Project mutations (place, move, wire, delete, rotate, mirror) |
| **Undo/redo floating buttons** | Bottom corners on tablet; keyboard Cmd+Z where available |

### Layout & chrome

| Feature | Notes |
|--------|--------|
| **Collapsible tool palettes** | Wire-style floating cluster for label / text / rotate / mirror when those tools active |
| **Safe-area polish** | Audit toolbars, drawers, and palettes for notch / home indicator |

**Stage 1 exit criteria:** User can pan/zoom confidently, undo mistakes, open a long-press menu on canvas objects, and distinguish pencil vs finger without changing the worksheet look.

---

## Stage 2 — Navigation at scale & multi-object editing

*Goal: Comfortable on large templates; faster part placement and bulk edits.*

### Gestures & navigation

| Feature | Notes |
|--------|--------|
| **Two-finger rotate** | Rotate selected symbol(s) by twist gesture (respect 90° snap option) |
| **Minimap** | Corner overview + viewport rectangle; tap/drag to jump pan |
| **Double-tap refinements** | Cycle: selection → fit selection → fit sheet |

### Apple Pencil & touch precision

| Feature | Notes |
|--------|--------|
| **Hover preview** | Pencil hover: wire segment ghost, symbol ghost when placing (where OS reports hover) |
| **Snap indicator + haptics** | Extend Stage 1 pulse to wire junction preview and placement |

### Layout & chrome

| Feature | Notes |
|--------|--------|
| **Landscape-optimized layout** | Wider symbol strip or side-by-side library + canvas; compact status in landscape |
| **Split view** | Pin symbol library strip beside canvas on wide / Stage Manager layouts (`xl`+ custom breakpoint) |
| **Recent symbols** | Horizontal row above tool dock (last N placed or searched) |

### Productivity

| Feature | Notes |
|--------|--------|
| **Multi-select** | Tap-add selection; optional lasso; group move / delete / rotate |
| **Clipboard** | Copy/paste symbol instances (and later wire segments) within or across projects |
| **Favorites / starred parts** | Star symbols in library; favorites row in search / dock |

**Stage 2 exit criteria:** User can navigate a busy sheet via minimap, edit multiple objects, reuse favorite parts quickly, and use pencil hover where hardware allows.

---

## Stage 3 — Templates, polish & optional depth

*Goal: Repeatable workflows and delight features; pressure and advanced UX are optional.*

### Apple Pencil & touch precision

| Feature | Notes |
|--------|--------|
| **Pressure** | Optional line weight or opacity for text notes only (low priority for symbols/wires) |

### Haptics & feedback

| Feature | Notes |
|--------|--------|
| **Sound + haptic profiles** | “Quiet / standard / workshop” presets bundling snap sound and vibration |

### Productivity

| Feature | Notes |
|--------|--------|
| **Template gallery** | Starter projects: blank, power supply sketch, MCU minimal, connector page |
| **Clipboard extensions** | Paste wire polyline; duplicate selection with ref renumbering |
| **Multi-select advanced** | Align/distribute selected symbols (grid-aligned) |

### Layout & chrome

| Feature | Notes |
|--------|--------|
| **Context menu → inspector bridge** | Long-press “Properties” opens focused inspector sheet |
| **Share sheet export** | Web Share API for PNG/PDF from iPad Share menu |

### Future (post–Stage 3 candidates)

Not in the three stages above, but aligned with tablet + KiCad workflow:

- Net highlight from label tap  
- ERC-lite (floating pins, duplicate refs)  
- BOM preview from placed symbols  
- Export handoff snippet for desktop KiCad  

**Stage 3 exit criteria:** New users pick a template and finish a small sheet on tablet; power users rely on favorites, clipboard, and share/export without desktop.

---

## Summary matrix

| Area | Stage 1 | Stage 2 | Stage 3 |
|------|---------|---------|---------|
| Gestures | double-tap, long-press, zoom-to-selection, inertial pan | two-finger rotate, minimap | double-tap cycle refinements |
| Pencil | finger/pan split, snap visual, ruler HUD | hover preview | pressure on notes |
| Feedback | vibrate + optional sounds | richer snap feedback | feedback presets |
| Productivity | **undo/redo** | multi-select, clipboard, favorites, recent | templates, clipboard+ |
| Layout | palettes, safe-area | landscape, split, recent row | share sheet, properties bridge |

---

## Suggested implementation order (within Stage 1)

1. ~~Undo/redo stack + floating buttons~~  
2. ~~Pencil vs finger mode~~  
3. ~~Double-tap zoom to fit~~  
4. ~~Long-press context menu~~  
5. ~~Zoom to selection~~  
6. ~~Snap visual + haptic~~  
7. ~~Ruler readout while drag/wire~~  
8. ~~Inertial pan~~  
9. ~~Collapsible palettes for non-wire tools~~  

Stage 1 is complete in code; verify on iPad via GitHub Pages after deploy.
