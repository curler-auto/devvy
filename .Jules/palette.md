# Palette's Journal

## 2026-01-23 - Systemic Missing Labels on Icon Buttons
**Learning:** The application heavily relies on icon-only buttons (using `lucide-react`) but consistently lacks `aria-label` attributes, relying only on visual cues or sometimes `title` attributes (which are insufficient for full accessibility).
**Action:** Systematically check all `Button` components containing only an icon during reviews and ensure `aria-label` is present and the icon has `aria-hidden="true"`.

## 2026-05-23 - Dynamic Forms Relying on Placeholders
**Learning:** The `ArrayConfig` component in `SettingsModal` used `placeholder` attributes as the sole label for dynamic inputs. This makes the inputs inaccessible to screen readers and difficult to use for users with cognitive disabilities once text is entered (as the label disappears).
**Action:** When creating dynamic forms or list editors, ensuring every input has an associated `aria-label` (or visible label) is critical, even if a visible label is omitted for space reasons.
