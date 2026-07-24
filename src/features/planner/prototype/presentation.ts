/**
 * PROTOTYPE — throwaway. Not production code.
 *
 * The few strings all three variants agree on. Everything else about how a conflict looks is the
 * variant's own business — that difference is half of what the prototype is asking about.
 *
 * Hard-coded English: the real planner goes through the typed i18n layer (issue #6). A prototype
 * that has to add a key to two locale files before it can rename a button is a prototype no one
 * iterates on.
 */

import type { Conflict } from './conflicts'

export const KIND_LABEL = {
  practical: 'lesson',
  theory: 'theory class',
  exam: 'exam',
} as const

/** The one-line summary a `title` attribute or a collapsed row shows. */
export function evaluateConflictsLabel(conflicts: readonly Conflict[]): string {
  if (conflicts.length === 0)
    return 'No conflicts'

  return conflicts.map(conflict => `${conflict.severity === 'blocking' ? '⛔' : '⚠'} ${conflict.message}`).join('\n')
}
