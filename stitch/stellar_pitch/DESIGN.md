# Visual Identity & Design System: The Stadium Atmosphere

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Arena."** 

We are not building a standard corporate interface; we are creating a high-octane, premium sports environment that feels immersive, deep, and authoritative. To move beyond a "template" look, this system utilizes **Tonal Depth** and **Intentional Asymmetry**. We break the rigid grid by allowing hero elements and cards to bleed into one another through gradients and overlapping layers, mimicking the dynamic energy of a football pitch under floodlights. The goal is a "Premium Editorial" feel where the interface recedes to let the content—the players, the stats, and the game—take center stage.

---

## 2. Colors: Deep Pitch & Neon Accents
The palette is rooted in the depth of a midnight stadium, using a spectrum of deep blues to create a multi-dimensional dark mode.

### The Palette
- **Background (`#001136`):** The foundation. A rich, deep navy that provides more soul than pure black.
- **Primary Blue (`#0A3D91`):** Used for structural importance and core brand moments.
- **Secondary Green (`#329948`):** The "Action Color." Reserved for success states, CTA highlights, and "Live" indicators.
- **Tertiary Gold (`#FFD700`):** The "Premium Accent." Use sparingly for trophies, VIP status, or highlight headers.

### Design Principles for Color
*   **The "No-Line" Rule:** Prohibit the use of 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` card sitting on a `surface` background creates a natural edge without a harsh line.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers.
    *   **Level 0:** `surface` (Main Background)
    *   **Level 1:** `surface-container-low` (Secondary content sections)
    *   **Level 2:** `surface-container-high` (Interactive cards and modals)
*   **The "Glass & Gradient" Rule:** To achieve a signature look, use Glassmorphism for floating navbars or tooltips. Utilize a `backdrop-blur` of 12px-20px combined with a 40% opacity version of `surface-bright`.
*   **Signature Textures:** Apply a subtle linear gradient (from `primary` to `primary_container` at a 135-degree angle) to main buttons and hero backgrounds to provide "visual soul."

---

## 3. Typography: The Editorial Voice
We utilize **SF Pro Display** (with **Inter** as the digital-first fallback) to convey a clean, athletic, and authoritative voice.

*   **Display (lg/md/sm):** High-impact, low letter-spacing (-0.02em). Use for major headlines and scorelines.
*   **Headline & Title:** Bold and direct. These levels establish the "Information Architecture" of the page.
*   **Body (lg/md/sm):** Optimized for readability against dark backgrounds. Always use `on-surface-variant` for secondary body text to reduce eye strain.
*   **Labels:** All-caps with increased letter-spacing (+0.05em) when used for categories or metadata to provide a technical, "pro-stat" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "web 2.0" for this system. We use **Tonal Layering** to create lift.

*   **The Layering Principle:** Place `surface-container-lowest` elements inside `surface-container-low` sections to create a "recessed" look. Place `surface-container-highest` on top of `surface` to create a "raised" look.
*   **Ambient Shadows:** If an element must float (like a FAB or Popover), use a diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow must feel like ambient light blockage, not a drawn line.
*   **The "Ghost Border":** If a container lacks contrast against its parent, use a 1px border with the `outline-variant` token at **15% opacity**. This creates a "glint" on the edge rather than a box.
*   **Glassmorphism:** For overlays, use a semi-transparent `surface_variant` with a heavy blur. This allows the vibrant blue/green accents of the background to bleed through, keeping the UI feeling integrated.

---

## 5. Components: Engineered for Performance

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`). `borderRadius: 0.5rem (md)`. Bold `label-md` text.
- **Secondary:** Transparent background with a `Ghost Border`. Text color uses the `secondary` green for high visibility.
- **States:** On hover, primary buttons should "glow" using a soft outer shadow of the same color.

### Cards & Lists
- **The Forgiveness Rule:** Absolutely no divider lines. Separate list items using `12px` of vertical white space or by alternating background tones (`surface-container-low` vs `surface-container-lowest`).
- **Cards:** Use `borderRadius: 1rem (lg)`. Content should have generous padding (min `24px`) to feel premium.

### Input Fields
- **Styling:** Use `surface-container-highest` for the input background. No border. When focused, apply a 1px `secondary` (green) "Ghost Border" to indicate activity.
- **Labels:** Floating labels using `label-sm` to maintain a compact, high-tech look.

### Additional Components: "The Match Badge"
- **Live Indicator:** A `secondary` green chip with a soft pulsing animation.
- **Stat Module:** High-contrast `display-sm` numbers paired with `label-sm` descriptors, arranged in an asymmetrical grid.

---

## 6. Do's and Don'ts

### Do
*   **DO** use deep gradients to transition between sections.
*   **DO** use "secondary" green for all primary action triggers to draw the eye.
*   **DO** leave ample white space (negative space) to let the typography breathe.
*   **DO** use high-quality imagery with a slightly desaturated, high-contrast filter to match the dark UI.

### Don't
*   **DON'T** use pure `#000000` black; it kills the "depth" of the navy brand identity.
*   **DON'T** use 100% opaque borders to separate content.
*   **DON'T** use standard "Material Design" shadows; they look muddy on deep blue surfaces.
*   **DON'T** crowd the UI. If a screen feels "busy," increase the surface nesting depth rather than adding lines.