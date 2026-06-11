---
name: slides+
description: Presentations with AI to start, an editor to go deeper, and code for full control.
colors:
  ink-black: "#121212"
  surface-raised: "#282828"
  surface-hover: "#161616"
  edge-gray: "#666666"
  steel-gray: "#4A4A4A"
  paper-white: "#EAEAEA"
  text-bright: "#FFFFFF"
  text-dim: "#666666"
  ai-periwinkle: "#7182FF"
  ai-green: "#249931"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.8vw, 3.75rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  sm: "10px"
  md: "15px"
  lg: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.full}"
    padding: "8px 24px"
  card-project:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: "6px"
  input-search:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.full}"
    padding: "12px 16px"
---

# Design System: slides+

## 1. Overview

**Creative North Star: "The Dark Stage"**

slides+ is a dark theater where the decks are the performers. The interface is matte near-black (`#121212`), quiet and flat, so every 1920×1080 slide — colorful, typographic, alive — reads like a lit stage against it. The system's personality is clean, minimal, and confident: typography carries hierarchy, whitespace carries rhythm, and color is reserved for one thing only — moments where AI is present, announced by the periwinkle-to-green pair (`#7182FF` → `#249931`).

The system explicitly rejects generic AI-SaaS grammar: no uppercase tracked eyebrows over every section, no 01/02/03 scaffolding, no identical icon-card grids, no gradient text, no decorative glassmorphism. Depth comes from tonal layering, not shadows. If a surface needs to feel raised, it gets a lighter background (`#282828`) and a hairline border, never a drop shadow.

**Key Characteristics:**
- Matte near-black canvas; content (slides, decks, templates) provides all the color.
- Single sans (Inter) at multiple weights; no font pairing.
- Pill-shaped controls (`rounded-full`) for actions; soft 15px radius for content containers.
- The AI duotone (`#7182FF` + `#249931`) appears only where AI acts.
- Flat by default — tonal layering instead of shadows.

## 2. Colors

A grayscale stage with one reserved duotone accent.

### Primary
- **AI Periwinkle** (#7182FF): the voice of AI in the product. Glows around the AI prompt input, fills the "Create with AI" affordance, tints AI-loading states. Never used for ordinary chrome.
- **AI Green** (#249931): always paired with AI Periwinkle, never alone. The second hue of the AI duotone in gradients and glows.

### Neutral
- **Ink Black** (#121212): the app canvas. Every screen starts here.
- **Surface Raised** (#282828): raised surfaces — search bars, cards, panels. The "one step up" tone.
- **Surface Hover** (#161616): hover wash for interactive rows and tiles.
- **Edge Gray** (#666666): hairline borders and secondary text. The single divider tone.
- **Paper White** (#EAEAEA): inverted surfaces — primary buttons, active tab pills. Text on it is Ink Black.
- **Text Bright** (#FFFFFF): primary text on dark surfaces.

### Named Rules
**The AI Duotone Rule.** Periwinkle and green belong to AI features exclusively. If a surface has no AI in it, it stays grayscale. Their rarity is what makes AI moments feel alive.

**The Contrast Floor Rule.** Body text never drops below 4.5:1 against its background. On `#121212` that means white at ≥62% opacity (`rgba(255,255,255,0.62)`); `white/40` and `white/45` are prohibited for copy (decorative marks only).

## 3. Typography

**Display Font:** Inter (with ui-sans-serif, system-ui fallback)
**Body Font:** Inter
**Label/Mono Font:** ui-monospace for numeric/meta labels only

**Character:** One family doing all the work. Hierarchy comes from size, weight (400–600), and tight negative tracking at display sizes — never from a second typeface.

### Hierarchy
- **Display** (500, clamp(2.25rem–6rem), 0.95): hero statements on marketing surfaces only.
- **Headline** (500, clamp(2rem–3.75rem), 1.0): section titles on the landing; page titles in-app.
- **Title** (500, 1.25rem, 1.25): card titles, feature names, FAQ questions.
- **Body** (400, 0.9375rem, 1.6): copy. Max line length 65–75ch.
- **Label** (500, 0.75rem, +0.02em): buttons, tabs, meta. Sentence case — uppercase tracked labels are reserved, not default.

### Named Rules
**The One Family Rule.** Inter only. A second typeface is a redesign decision, not a page decision.

## 4. Elevation

Flat by default; depth is tonal, not cast. Raised surfaces step up the gray ramp (`#121212` → `#282828`) and take a 1px `#666666`-tinted border. Shadows exist in exactly one role: the AI glow — a soft colored bloom (`box-shadow` in periwinkle/green at low alpha) that marks AI-active elements. Black drop shadows on cards or modals are prohibited; modals separate with a `bg-black/70` backdrop blur instead.

### Shadow Vocabulary
- **AI glow, subtle** (`0 0 15px rgba(36,153,49,0.15), 0 0 30px rgba(113,130,255,0.15)`): resting state of the AI prompt input.
- **AI glow, active** (`0 0 30px rgba(36,153,49,0.4), 0 0 60px rgba(113,130,255,0.4)`): expanded/engaged AI panel.

### Named Rules
**The Glow-Is-AI Rule.** If it glows, AI is involved. Nothing else glows.

## 5. Components

### Buttons
- **Shape:** pill (`border-radius: 9999px`)
- **Primary:** Paper White background, Ink Black text (500, 0.875rem), 8px 16px padding.
- **Hover / Focus:** opacity 0.9 on hover; visible focus ring (2px Paper White at 50%) on focus-visible.
- **Ghost:** transparent with `#666666` text, brightening to white on hover.

### Cards / Containers (project tiles, template tiles)
- **Corner Style:** 15px outer, 10px inner preview.
- **Background:** Surface Raised (`#282828`) with 1px Edge Gray border.
- **Shadow Strategy:** none — tonal only (see Elevation).
- **Internal Padding:** 6px frame around a 16:9 iframe preview; title row below.

### Inputs / Fields
- **Style:** pill, Surface Raised background, no visible border until interaction; placeholder must meet the Contrast Floor.
- **Focus:** border brightens; the AI variant adds the subtle AI glow.
- **The AI prompt input** is the signature input: a pill that expands into a rounded-3xl panel (height/padding animated at 0.5s cubic-bezier(0.4,0,0.2,1)) with gradient ring and glow when active.

### Navigation
- **In-app:** top NavBar on Ink Black; tab switchers are pill groups — active tab gets Paper White pill with Ink Black text, inactive tabs are Edge Gray text.
- **Marketing:** fixed minimal bar; brand wordmark left, compact white pill cluster right.

### Slide Preview (signature component)
1920×1080 HTML sections scaled down inside sandboxed iframes (`transform: scale()`, origin top-left), framed by a 10px-radius border on `#0a0a0a`. This is the product showing itself — previews are real renders, never screenshots or mockups.

## 6. Do's and Don'ts

### Do:
- **Do** keep the canvas matte `#121212` and let slides provide the color.
- **Do** reserve `#7182FF`/`#249931` for AI features (The AI Duotone Rule).
- **Do** use tonal layering (`#282828` + hairline border) for raised surfaces.
- **Do** keep body text at or above `rgba(255,255,255,0.62)` on dark (The Contrast Floor Rule).
- **Do** use real rendered decks/templates as hero content — show, don't tell.
- **Do** give every animation a `prefers-reduced-motion` alternative.

### Don't:
- **Don't** use uppercase tracked eyebrows above sections or 01/02/03 numbered scaffolding — named in PRODUCT.md as anti-references.
- **Don't** build identical icon+heading+text card grids.
- **Don't** use gradient text (`background-clip: text`) — including the existing `.appColorFadeText` utility; phase it out.
- **Don't** use decorative glassmorphism; backdrop blur is for modal backdrops only.
- **Don't** cast black drop shadows; if it needs depth, step the gray ramp.
- **Don't** ship copy below the contrast floor (`text-white/40`, `text-white/45` on black).
- **Don't** let WebGL/gradient backgrounds compete with content — backgrounds serve the foreground.
