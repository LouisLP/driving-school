/**
 * The EU driving licence categories, in the order they are conventionally listed.
 *
 * A closed vocabulary: these codes are defined by law, not by the school. Which of them the
 * school actually teaches is configuration — see `LicenceClassOffering`.
 */
export const LICENCE_CLASSES = [
  'AM',
  'A1',
  'A2',
  'A',
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'L',
  'T',
] as const
