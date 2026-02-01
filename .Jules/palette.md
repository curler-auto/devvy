# Palette's Journal

## 2026-01-23 - Systemic Missing Labels on Icon Buttons
**Learning:** The application heavily relies on icon-only buttons (using `lucide-react`) but consistently lacks `aria-label` attributes, relying only on visual cues or sometimes `title` attributes (which are insufficient for full accessibility).
**Action:** Systematically check all `Button` components containing only an icon during reviews and ensure `aria-label` is present and the icon has `aria-hidden="true"`.

## 2026-05-23 - Dynamic Forms Relying on Placeholders
**Learning:** The `ArrayConfig` component in `SettingsModal` used `placeholder` attributes as the sole label for dynamic inputs. This makes the inputs inaccessible to screen readers and difficult to use for users with cognitive disabilities once text is entered (as the label disappears).
**Action:** When creating dynamic forms or list editors, ensuring every input has an associated `aria-label` (or visible label) is critical, even if a visible label is omitted for space reasons.

## 2026-05-24 - Disconnected Labels in Custom Settings Forms
**Learning:** Custom form layouts in modals (like `SettingsModal`'s `LLMConfig`) often use visual proximity for labels (`<div><label>...<input>...</div>`) without programmatic association (`htmlFor` + `id`). This fails WCAG 1.3.1 and breaks click-to-focus behavior.
**Action:** Always enforce explicit `htmlFor` and `id` pairing on custom form inputs, especially when not using the standardized `Form` components which handle this automatically.

## 2026-05-25 - Disconnected Labels in Auth Forms
**Learning:** The `AuthScreen` component used `<label>` elements that were visually positioned near inputs but lacked `htmlFor` attributes, and inputs lacked `id` attributes. This breaks accessibility relationships and click-to-focus behavior.
**Action:** Ensure all form labels have `htmlFor` matching the `id` of their corresponding input, even when using custom UI components.
