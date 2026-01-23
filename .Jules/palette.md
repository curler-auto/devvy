# Palette's Journal

## 2026-01-23 - Systemic Missing Labels on Icon Buttons
**Learning:** The application heavily relies on icon-only buttons (using `lucide-react`) but consistently lacks `aria-label` attributes, relying only on visual cues or sometimes `title` attributes (which are insufficient for full accessibility).
**Action:** Systematically check all `Button` components containing only an icon during reviews and ensure `aria-label` is present and the icon has `aria-hidden="true"`.
