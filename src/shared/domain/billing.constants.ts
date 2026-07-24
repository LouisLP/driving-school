/**
 * The unit the school sells and prices practical training in. A 90-minute overland drive is two
 * of these, not a separately priced product.
 */
export const LESSON_UNIT_MINUTES = 45

/**
 * How much notice a student must give to cancel for free. Inside the window, the appointment is
 * billed as if it had happened — the instructor's day was blocked either way.
 *
 * A domain constant rather than a field on the price list: it is the school's terms of business,
 * the same for every licence class, and a student who cancels late is not owed a discount for
 * having enrolled before the terms were written.
 */
export const LATE_CANCELLATION_NOTICE_HOURS = 48

/** Days from issue to due date, unless the office says otherwise when issuing. */
export const DEFAULT_PAYMENT_TERM_DAYS = 14
