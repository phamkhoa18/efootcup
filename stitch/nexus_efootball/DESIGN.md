# Design System Strategy: The Kinetic Grid

## 1. Overview & Creative North Star
**The Creative North Star: "The Tactical Command Center"**

This design system moves away from the generic "sports blog" aesthetic and toward a high-performance, data-rich interface reminiscent of professional scouting software and elite gaming HUDs. We are building a "Tactical Command Center"—an environment that feels urgent, precise, and authoritative. 

To break the "template" look, we employ **Intentional Asymmetry**. Dense data tables are offset by expansive, cinematic hero sections. Overlapping elements—such as player cards breaking the bounds of their containers—create a sense of forward motion. We leverage high-contrast typography scales where massive display headers dwarf surgical label text, mirroring the intensity of a live match.

---

## 2. Colors & Surface Philosophy

The palette is rooted in deep obsidian tones, utilizing the "Electric Blue" and "Neon Green" of the eFootball heritage as high-energy kinetic accents.

### The "No-Line" Rule
**Borders are a relic of the past.** In this system, 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through:
*   **Background Shifts:** Transitioning from `surface` (#131313) to `surface-container-low` (#1C1B1B).
*   **Tonal Transitions:** Using subtle shifts in value to imply a change in content context.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical, stacked layers. 
*   **Base:** `surface` (#131313) is your pitch.
*   **Secondary Context:** Use `surface-container-low` (#1C1B1B) for large layout blocks.
*   **Interactive Components:** Use `surface-container-high` (#2A2A2A) for cards or modules that require the user’s immediate focus.
*   **The Nesting Rule:** An inner container must always be at least one tier "higher" or "lower" than its parent to define its importance without a stroke.

### The "Glass & Gradient" Rule
To inject "soul" into the dark mode, floating panels (modals, dropdowns, or hovering stat cards) should utilize **Glassmorphism**. Use `surface-variant` (#353534) at 60% opacity with a `20px` backdrop-blur. 

### Signature Textures
Main CTAs and Hero backgrounds should never be flat. Use a linear gradient (135°) transitioning from `primary` (#B8C4FF) to `primary-container` (#1E40AF). This creates a "shimmer" effect that mimics the glow of stadium floodlights.

---

## 3. Typography: Editorial Authority

We use a dual-font system to balance high-impact branding with surgical data density.

*   **Display & Headlines (Space Grotesk):** This is our "voice." It is technical, wide, and aggressive. Use `display-lg` for player names and `headline-md` for section titles. The wide apertures of Space Grotesk ensure that even at large scales, the brand feels high-tech.
*   **Body & Labels (Inter):** The "workhorse." Inter handles the dense stats, player attributes, and database entries. Its high x-height ensures readability against dark backgrounds.
*   **Hierarchy Note:** Use `label-sm` in all-caps with `0.1em` letter spacing for metadata (e.g., "MATCH MINUTE" or "PLAYER VALUE") to create an elite, "pro-scouter" feel.

---

## 4. Elevation & Depth

We convey hierarchy through **Tonal Layering** rather than traditional shadows.

*   **The Layering Principle:** Depth is "grown" from the background. A `surface-container-lowest` card placed on a `surface-container-low` section creates a recessed, "carved-out" look. Placing a `surface-container-highest` card on `surface` creates a natural lift.
*   **Ambient Shadows:** For floating elements like tooltips or modals, use extra-diffused shadows. 
    *   *Spec:* `0px 24px 48px rgba(0, 0, 0, 0.4)`. The shadow should feel like a soft atmospheric occlusion, not a hard drop shadow.
*   **The "Ghost Border" Fallback:** If a container absolutely requires a boundary for accessibility, use the **Ghost Border**: `outline-variant` (#444653) at 15% opacity. It should be felt, not seen.
*   **High-Tech Glow:** Elements in an "active" state (like a selected player) should emit a subtle outer glow using the `secondary` (#78DC77) token with a `10px` blur at 30% opacity.

---

## 5. Components

### Buttons
*   **Primary:** Sharp edges (0.25rem). Background: Gradient `primary` to `primary-container`. Text: `on-primary` (#002584). Subtle `0.5px` inner-glow on the top edge.
*   **Secondary:** Ghost style. `Ghost Border` with `primary` text. No fill until hover.
*   **Tertiary:** Text-only with `label-md` styling and an arrow icon for "View All" actions.

### Cards & Data Lists
*   **Rule:** **No Divider Lines.** Separate list items using `8px` of vertical white space or by alternating background colors between `surface-container-low` and `surface-container-lowest`.
*   **Player Cards:** Use a `surface-container-highest` background. The player image should "break" the top boundary of the card to create 3D depth.

### Input Fields
*   **State:** Default state uses `surface-container-highest` with no border. On focus, the bottom edge gains a `2px` "kinetic" underline in `tertiary` (#FABD00).

### Additional Component: The "Attribute Hex"
A custom data visualization component using `secondary` (#78DC77) lines to map player stats. It should use a `surface-variant` fill at 10% opacity to maintain the "Glassmorphism" theme.

---

## 6. Do's and Don'ts

### Do:
*   **Use Intentional Spacing:** Treat white space as a structural element. A 64px gap is more effective than a line.
*   **Embrace High Contrast:** Pair `surface-container-lowest` (#0E0E0E) with `primary-fixed` (#DDE1FF) for maximum legibility of critical stats.
*   **Sharp Edges:** Stick to the `0.25rem` (4px) border radius. Rounded corners "soften" the brand; sharp edges keep it "lethal."

### Don't:
*   **Don't use pure white text:** Always use `on-surface` (#E5E2E1) or `on-surface-variant` (#C4C5D5) to reduce eye strain in dark mode.
*   **Don't stack shadows:** If you have multiple layers, let the background color shifts do the work. Only the top-most "floating" layer gets a shadow.
*   **Don't use generic icons:** Use thin-stroke, geometric icons that match the `outline` (#8E909F) weight. Avoid "filled" icons unless in an active state.