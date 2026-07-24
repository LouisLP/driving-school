/**
 * The app's component library.
 *
 * A published-feeling boundary: features import from `@/shared/ui` and never from a file inside
 * it, which is enforced by the `no-restricted-imports` rule in `eslint.config.js` alongside the
 * rule that keeps Reka on this side of the line.
 *
 * Every component here wraps at most one Reka primitive, styles it entirely through the roles in
 * `styles/tokens/semantic.css`, and is prefixed `Ui` — not decoration, since
 * `vue/multi-word-component-names` would fail `Button.vue`, and because the prefix makes "ours or
 * the feature's?" answerable at the call site.
 *
 * **What gets a wrapper.** A component enters this folder when a screen needs it, not when we
 * expect a later one to. Combobox, Tabs, Tooltip, Popover, TagsInput and the date-range and time
 * fields are all in #5's inventory and all deliberately unbuilt: guessing an API with no caller
 * to design against is how a design system gets its first dead component. See
 * `docs/students-slice.md`, decision 1.
 *
 * Portalled parts are styled in `./portal.css`, which `styles/index.css` imports — see that file
 * for why that exception exists.
 */

export { default as UiAlertDialog } from './UiAlertDialog.vue'
export { default as UiBadge } from './UiBadge.vue'
export { default as UiButton } from './UiButton.vue'
export { default as UiCard } from './UiCard.vue'
export { default as UiDataTable } from './UiDataTable.vue'
export { default as UiDateField } from './UiDateField.vue'
export { default as UiDialog } from './UiDialog.vue'
export { default as UiDropdownMenu } from './UiDropdownMenu.vue'
export type { UiMenuItem } from './UiDropdownMenu.vue'
export { default as UiEmptyState } from './UiEmptyState.vue'
export { default as UiErrorState } from './UiErrorState.vue'
export { default as UiFormField } from './UiFormField.vue'
export { default as UiLocaleProvider } from './UiLocaleProvider.vue'
export { default as UiPagination } from './UiPagination.vue'
export { default as UiProgressBar } from './UiProgressBar.vue'
export { default as UiSelect } from './UiSelect.vue'
export type { UiSelectOption } from './UiSelect.vue'
export { default as UiSkeleton } from './UiSkeleton.vue'
export { default as UiSortableHeader } from './UiSortableHeader.vue'
export { default as UiTextArea } from './UiTextArea.vue'
export { default as UiTextField } from './UiTextField.vue'
export { default as UiToaster } from './UiToaster.vue'
