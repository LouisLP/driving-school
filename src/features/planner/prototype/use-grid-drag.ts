/**
 * PROTOTYPE — throwaway. Not production code.
 *
 * Pointer maths for the two variants that have a time grid (A and C). Deliberately not a
 * "calendar component": it converts pointer positions into `{ column, startMinute, duration }`
 * and nothing else, so each variant keeps its own layout, its own columns and its own rendering.
 *
 * Columns identify themselves through data attributes so a drag can cross them:
 * `data-col-key`, and optionally `data-col-day`.
 */

import { readonly, ref } from 'vue'

export const MINUTE_PX = 0.95
export const SNAP_MINUTES = 15

export interface GridPosition {
  /** Whatever the variant keyed its columns on — an instructor id, a vehicle id, a weekday. */
  columnKey: string
  dayIndex: number
  startMinute: number
  durationMinutes: number
}

export interface GridDragState extends GridPosition {
  mode: 'create' | 'move'
  /** Set when moving an existing block. */
  subjectId: string | null
}

interface Options {
  dayStartMinute: number
  dayEndMinute: number
  /** Length a fresh click-without-drag creates. 45 minutes: the unit the school sells. */
  defaultDuration?: number
  onUpdate: (state: GridDragState) => void
  onCommit: (state: GridDragState) => void
  onCancel: () => void
}

export function useGridDrag(options: Options) {
  const drag = ref<GridDragState | null>(null)
  const defaultDuration = options.defaultDuration ?? 45

  function positionFrom(clientX: number, clientY: number): { columnKey: string, dayIndex: number, minute: number } | null {
    const element = document.elementFromPoint(clientX, clientY)
    const column = element?.closest<HTMLElement>('[data-col-key]')

    if (!column)
      return null

    const rect = column.getBoundingClientRect()
    const raw = options.dayStartMinute + (clientY - rect.top) / MINUTE_PX

    return {
      columnKey: column.dataset.colKey ?? '',
      dayIndex: Number(column.dataset.colDay ?? '0'),
      minute: clamp(snap(raw), options.dayStartMinute, options.dayEndMinute),
    }
  }

  function begin(event: PointerEvent, mode: 'create' | 'move', subjectId: string | null, duration: number): void {
    const at = positionFrom(event.clientX, event.clientY)

    if (!at)
      return

    event.preventDefault()

    // For a move, remember where inside the block the pointer grabbed it, so the block does not
    // jump its own top edge to the cursor.
    const grabOffset = mode === 'move' ? at.minute - (currentTopMinute(event) ?? at.minute) : 0

    drag.value = {
      mode,
      subjectId,
      columnKey: at.columnKey,
      dayIndex: at.dayIndex,
      startMinute: at.minute - grabOffset,
      durationMinutes: duration,
    }

    options.onUpdate(drag.value)

    const onMove = (moveEvent: PointerEvent): void => {
      const now = positionFrom(moveEvent.clientX, moveEvent.clientY)

      if (!now || !drag.value)
        return

      drag.value = mode === 'create'
        ? {
            ...drag.value,
            columnKey: now.columnKey,
            dayIndex: now.dayIndex,
            startMinute: Math.min(drag.value.startMinute, now.minute),
            durationMinutes: Math.max(SNAP_MINUTES, Math.abs(now.minute - drag.value.startMinute)),
          }
        : {
            ...drag.value,
            columnKey: now.columnKey,
            dayIndex: now.dayIndex,
            startMinute: clamp(
              now.minute - grabOffset,
              options.dayStartMinute,
              options.dayEndMinute - drag.value.durationMinutes,
            ),
          }

      options.onUpdate(drag.value)
    }

    // One controller unsubscribes all three listeners, whichever of them ends the drag.
    const gesture = new AbortController()

    const onUp = (): void => {
      gesture.abort()

      if (!drag.value)
        return

      const finished = drag.value.mode === 'create' && drag.value.durationMinutes <= SNAP_MINUTES
        ? { ...drag.value, durationMinutes: defaultDuration }
        : drag.value

      drag.value = null
      options.onCommit(finished)
    }

    const onKey = (keyEvent: KeyboardEvent): void => {
      if (keyEvent.key !== 'Escape')
        return

      gesture.abort()
      drag.value = null
      options.onCancel()
    }

    window.addEventListener('pointermove', onMove, { signal: gesture.signal })
    window.addEventListener('pointerup', onUp, { signal: gesture.signal })
    window.addEventListener('keydown', onKey, { signal: gesture.signal })
  }

  function currentTopMinute(event: PointerEvent): number | null {
    const block = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-block-start]')

    return block ? Number(block.dataset.blockStart) : null
  }

  return {
    drag: readonly(drag),
    startCreate: (event: PointerEvent) => begin(event, 'create', null, SNAP_MINUTES),
    startMove: (event: PointerEvent, subjectId: string, duration: number) =>
      begin(event, 'move', subjectId, duration),
  }
}

export function snap(minute: number): number {
  return Math.round(minute / SNAP_MINUTES) * SNAP_MINUTES
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
