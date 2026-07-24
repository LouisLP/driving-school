import type { Database } from './database'
import type {
  AgreedPrices,
  Appointment,
  AppointmentId,
  Attendance,
  BillableItem,
  Enrolment,
  EnrolmentId,
  Instructor,
  InstructorId,
  Invoice,
  InvoiceId,
  IsoDate,
  IsoDateTime,
  LicenceClass,
  LicenceClassOffering,
  Location,
  LocationId,
  Payment,
  PaymentId,
  PaymentMethod,
  PriceList,
  Student,
  StudentId,
  Vehicle,
  VehicleId,
} from '@/shared/domain'
import {
  addMinutes,
  basicFeeItem,
  billableItemFor,
  DEFAULT_PAYMENT_TERM_DAYS,
  fromEuros,
  LEGAL_TRAINING_MINIMUMS,
  LICENCE_CLASSES,
  multiplyMoney,
  toIsoDateTime,
  totalOf,
} from '@/shared/domain'

// --- Places, people, fleet -------------------------------------------------------------------

const HQ = 'loc-hq' as LocationId
const CLASSROOM = 'loc-classroom' as LocationId
const EXAM_CENTRE = 'loc-exam' as LocationId
const MEETING_POINT = 'loc-station' as LocationId

const LOCATIONS: readonly Location[] = [
  {
    id: HQ,
    name: 'Fahrschule Ostend',
    kind: 'branch',
    address: address('Hanauer Landstraße', '112', '60314', 'Frankfurt am Main'),
  },
  {
    id: CLASSROOM,
    name: 'Theorieraum Ostend',
    kind: 'classroom',
    address: address('Hanauer Landstraße', '112', '60314', 'Frankfurt am Main'),
  },
  {
    id: EXAM_CENTRE,
    name: 'TÜV Hessen Prüfstelle',
    kind: 'examCentre',
    address: address('Rüsselsheimer Straße', '22', '60326', 'Frankfurt am Main'),
  },
  {
    id: MEETING_POINT,
    name: 'Ostbahnhof',
    kind: 'meetingPoint',
    address: address('Ostbahnhofstraße', '1', '60314', 'Frankfurt am Main'),
  },
]

const VOGEL = 'ins-01' as InstructorId
const LEHMANN = 'ins-02' as InstructorId
const YILDIZ = 'ins-03' as InstructorId
const KRUEGER = 'ins-04' as InstructorId

const INSTRUCTORS: readonly Instructor[] = [
  {
    id: VOGEL,
    firstName: 'Klaus',
    lastName: 'Vogel',
    email: 'k.vogel@fahrschule-ostend.de',
    phone: '+49 69 1234501',
    teachableClasses: ['B', 'BE', 'C', 'CE'],
    employedSince: '2011-04-01' as IsoDate,
    employedUntil: null,
  },
  {
    id: LEHMANN,
    firstName: 'Petra',
    lastName: 'Lehmann',
    email: 'p.lehmann@fahrschule-ostend.de',
    phone: '+49 69 1234502',
    teachableClasses: ['B', 'BE'],
    employedSince: '2017-09-15' as IsoDate,
    employedUntil: null,
  },
  {
    id: YILDIZ,
    firstName: 'Ahmet',
    lastName: 'Yıldız',
    email: 'a.yildiz@fahrschule-ostend.de',
    phone: '+49 69 1234503',
    teachableClasses: ['A1', 'A2', 'A', 'B'],
    employedSince: '2020-02-03' as IsoDate,
    employedUntil: null,
  },
  {
    // A leaver: still referenced by past appointments, never offered for new ones.
    id: KRUEGER,
    firstName: 'Sabine',
    lastName: 'Krüger',
    email: null,
    phone: null,
    teachableClasses: ['B'],
    employedSince: '2015-01-07' as IsoDate,
    employedUntil: '2024-06-30' as IsoDate,
  },
]

const GOLF = 'veh-01' as VehicleId
const CORSA = 'veh-02' as VehicleId
const MT07 = 'veh-03' as VehicleId
const ATEGO = 'veh-04' as VehicleId

const VEHICLES: readonly Vehicle[] = [
  {
    id: GOLF,
    licencePlate: 'F-FS 101',
    make: 'Volkswagen',
    model: 'Golf VIII',
    transmission: 'manual',
    suitableFor: ['B', 'BE'],
    homeLocationId: HQ,
    inServiceSince: '2022-03-01' as IsoDate,
    retiredAt: null,
  },
  {
    id: CORSA,
    licencePlate: 'F-FS 102',
    make: 'Opel',
    model: 'Corsa',
    transmission: 'automatic',
    suitableFor: ['B'],
    homeLocationId: HQ,
    inServiceSince: '2023-08-15' as IsoDate,
    retiredAt: null,
  },
  {
    id: MT07,
    licencePlate: 'F-FS 103',
    make: 'Yamaha',
    model: 'MT-07',
    transmission: 'manual',
    suitableFor: ['A1', 'A2', 'A'],
    homeLocationId: HQ,
    inServiceSince: '2021-05-20' as IsoDate,
    retiredAt: null,
  },
  {
    id: ATEGO,
    licencePlate: 'F-FS 104',
    make: 'Mercedes-Benz',
    model: 'Atego',
    transmission: 'manual',
    suitableFor: ['C', 'CE'],
    homeLocationId: HQ,
    inServiceSince: '2019-11-02' as IsoDate,
    retiredAt: null,
  },
]

// --- Prices ----------------------------------------------------------------------------------

/** `[basic fee, lesson unit, special-drive unit, theory exam, practical exam]`, in euros. */
type PriceRow = readonly [number, number, number, number, number]

const PRICES: Partial<Record<LicenceClass, PriceRow>> = {
  B: [399, 62, 75, 35, 130],
  BE: [290, 70, 80, 25, 140],
  A1: [349, 60, 72, 35, 130],
  A2: [349, 60, 72, 35, 130],
  A: [369, 64, 76, 35, 130],
  C: [590, 95, 110, 45, 210],
  CE: [690, 105, 120, 45, 240],
}

const NOT_OFFERED: PriceRow = [0, 0, 0, 0, 0]

function priceList([basic, lesson, special, theoryExam, practicalExam]: PriceRow): PriceList {
  return {
    basicFee: fromEuros(basic),
    practicalLessonUnit: fromEuros(lesson),
    specialDriveUnit: fromEuros(special),
    theoryExamFee: fromEuros(theoryExam),
    practicalExamFee: fromEuros(practicalExam),
  }
}

/** The school put its prices up on 1 January 2025. Anyone who signed before pays the old ones. */
const PRICE_RISE = '2025-01-01T00:00:00.000Z' as IsoDateTime
const PRE_RISE_FACTOR = 0.9

/**
 * The prices an enrolment agreed to, which is what every invoice on it quotes.
 *
 * The pre-rise discount is here so the seed actually demonstrates the property the model exists
 * to protect: Tim's 2024 enrolment bills at 2024 prices however often the offering is edited.
 */
function agreedPricesFor(licenceClass: LicenceClass, agreedAt: IsoDateTime): AgreedPrices {
  const current = priceList(PRICES[licenceClass] ?? NOT_OFFERED)

  if (agreedAt >= PRICE_RISE)
    return { agreedAt, ...current }

  return {
    agreedAt,
    basicFee: multiplyMoney(current.basicFee, PRE_RISE_FACTOR),
    practicalLessonUnit: multiplyMoney(current.practicalLessonUnit, PRE_RISE_FACTOR),
    specialDriveUnit: multiplyMoney(current.specialDriveUnit, PRE_RISE_FACTOR),
    theoryExamFee: multiplyMoney(current.theoryExamFee, PRE_RISE_FACTOR),
    practicalExamFee: multiplyMoney(current.practicalExamFee, PRE_RISE_FACTOR),
  }
}

// --- Students & enrolments -------------------------------------------------------------------

const STUDENTS: readonly Student[] = [
  student('stu-01', 'Lena', 'Müller', '2006-03-12', '2025-09-02'),
  student('stu-02', 'Jonas', 'Schneider', '2005-07-30', '2025-06-18'),
  student('stu-03', 'Mia', 'Fischer', '2008-01-24', '2026-07-06'),
  student('stu-04', 'Tim', 'Weber', '2004-11-05', '2024-10-11'),
  student('stu-05', 'Sophie', 'Wagner', '2003-02-17', '2024-08-23'),
  student('stu-06', 'Elias', 'Becker', '2002-05-09', '2026-01-15'),
  student('stu-07', 'Hannah', 'Hoffmann', '2007-09-28', '2025-11-30'),
  student('stu-08', 'Yusuf', 'Şahin', '1998-12-03', '2026-02-09'),
  // The walk-in who left a phone number and nothing else. Both empty states the contact column
  // and the identity panel have to render honestly, on one row.
  withoutContactDetails(student('stu-09', 'Clara', 'Schäfer', '2008-06-21', '2026-07-20')),
  student('stu-10', 'Noah', 'Bauer', '2001-04-14', '2024-03-05'),
]

const ENROLMENTS: readonly Enrolment[] = [
  enrolment('enr-01', 'stu-01', 'B', 'active', '2025-09-02', '2025-09-10', null),
  enrolment('enr-02', 'stu-02', 'B', 'paused', '2025-06-18', '2025-07-01', null),
  enrolment('enr-03', 'stu-03', 'B', 'enquiring', '2026-07-06', null, null),
  enrolment('enr-04', 'stu-04', 'B', 'passed', '2024-10-11', '2024-10-20', '2025-05-14'),
  enrolment('enr-05', 'stu-05', 'B', 'withdrawn', '2024-08-23', '2024-09-01', '2025-01-30'),
  enrolment('enr-06', 'stu-06', 'A2', 'active', '2026-01-15', '2026-01-22', null),
  enrolment('enr-07', 'stu-07', 'B', 'active', '2025-11-30', '2025-12-08', null),
  enrolment('enr-08', 'stu-07', 'BE', 'enquiring', '2026-07-01', null, null),
  enrolment('enr-09', 'stu-08', 'C', 'active', '2026-02-09', '2026-02-16', null),
  enrolment('enr-10', 'stu-10', 'B', 'passed', '2024-03-05', '2024-03-14', '2024-09-19'),
  enrolment('enr-11', 'stu-10', 'BE', 'active', '2026-05-04', '2026-05-11', null),
  // stu-09 has no enrolment at all: the pure prospect the CRM list must still show.
]

function buildOfferings(): LicenceClassOffering[] {
  /**
   * The school's own standard-lesson policy, in 45-minute units. The mandated counts come from
   * `LEGAL_TRAINING_MINIMUMS` — this is the only number a school actually chooses.
   */
  const housePolicyUnits: Partial<Record<LicenceClass, number>> = {
    B: 12,
    BE: 5,
    A1: 12,
    A2: 12,
    A: 12,
    C: 10,
    CE: 10,
  }

  return LICENCE_CLASSES.map((licenceClass) => {
    const standardPracticalUnits = housePolicyUnits[licenceClass]

    return {
      licenceClass,
      isOffered: standardPracticalUnits !== undefined,
      requirements: {
        ...LEGAL_TRAINING_MINIMUMS[licenceClass],
        standardPracticalUnits: standardPracticalUnits ?? 0,
      },
      prices: priceList(PRICES[licenceClass] ?? NOT_OFFERED),
    }
  })
}

// --- The calendar ----------------------------------------------------------------------------

/** `[dayOffset from Monday, hour, instructor, vehicle, enrolment, driveType]` */
type PracticalRow = readonly [number, number, InstructorId, VehicleId, string, 'standard' | 'overland' | 'autobahn' | 'night']

const PRACTICALS: readonly PracticalRow[] = [
  [-7, 9, VOGEL, GOLF, 'enr-01', 'standard'],
  [-6, 11, LEHMANN, CORSA, 'enr-07', 'standard'],
  [-5, 14, YILDIZ, MT07, 'enr-06', 'standard'],
  [-4, 8, VOGEL, ATEGO, 'enr-09', 'standard'],
  [-3, 16, LEHMANN, GOLF, 'enr-01', 'overland'],
  [-2, 10, VOGEL, GOLF, 'enr-11', 'standard'],
  [0, 9, VOGEL, GOLF, 'enr-01', 'standard'],
  [0, 11, LEHMANN, CORSA, 'enr-07', 'standard'],
  [0, 15, YILDIZ, MT07, 'enr-06', 'overland'],
  [1, 8, VOGEL, ATEGO, 'enr-09', 'standard'],
  [1, 13, LEHMANN, GOLF, 'enr-11', 'standard'],
  [2, 10, VOGEL, GOLF, 'enr-01', 'autobahn'],
  [3, 19, LEHMANN, CORSA, 'enr-07', 'night'],
  [4, 9, YILDIZ, MT07, 'enr-06', 'standard'],
  [4, 14, VOGEL, GOLF, 'enr-11', 'standard'],
  [7, 9, VOGEL, GOLF, 'enr-01', 'standard'],
  [8, 11, LEHMANN, CORSA, 'enr-07', 'standard'],
]

function buildAppointments(monday: Date, now: Date): Appointment[] {
  const nowIso = toIsoDateTime(now)

  const practicals: Appointment[] = PRACTICALS.map(
    ([day, hour, instructorId, vehicleId, enrolmentId, driveType], index) => {
      const startsAt = at(monday, day, hour)

      return {
        id: `apt-p${pad(index + 1)}` as AppointmentId,
        kind: 'practical',
        instructorId,
        vehicleId,
        enrolmentId: enrolmentId as EnrolmentId,
        driveType,
        meetingPointId: driveType === 'standard' ? null : MEETING_POINT,
        startsAt,
        durationMinutes: driveType === 'standard' ? 45 : 90,
        outcome: pastOutcome(startsAt, nowIso, index),
        notes: '',
      }
    },
  )

  const theory: Appointment = {
    id: 'apt-t01' as AppointmentId,
    kind: 'theory',
    instructorId: LEHMANN,
    locationId: CLASSROOM,
    topic: { scope: 'basic', number: 3 },
    capacity: 12,
    attendees: [
      attendance('enr-01', 'registered'),
      attendance('enr-07', 'registered'),
      attendance('enr-02', 'excused'),
      attendance('enr-11', 'registered'),
    ],
    startsAt: at(monday, 2, 18),
    durationMinutes: 90,
    outcome: { status: 'planned' },
    notes: '',
  }

  const exam: Appointment = {
    id: 'apt-e01' as AppointmentId,
    kind: 'exam',
    examKind: 'practical',
    instructorId: VOGEL,
    vehicleId: CORSA,
    locationId: EXAM_CENTRE,
    enrolmentId: 'enr-07' as EnrolmentId,
    result: null,
    startsAt: at(monday, 9, 10),
    durationMinutes: 60,
    outcome: { status: 'planned' },
    notes: 'Prüfer trifft am Ostbahnhof ein.',
  }

  return [...practicals, theory, exam, ...buildHistory(monday)]
}

/**
 * The back-catalogue, months before the current week.
 *
 * The rows above give the planner a week to render; these give the student record something to
 * measure. Without them every progress bar on every card sits near zero, and the two states the
 * card is designed around — past the minimum, and barely started — cannot be seen at all.
 *
 * Lena (`enr-01`) ends up past class B's standard-lesson policy, partway through the basic theory
 * course, short on every mandated special drive and with her theory exam passed — so her card has
 * a bar over 100 %, several under it, and one readiness group met and one not. Yusuf (`enr-09`) is
 * left with the two lessons of the current week, which is what "barely started" looks like.
 */
function buildHistory(monday: Date): Appointment[] {
  const drives: Appointment[] = Array.from({ length: 13 }, (_, index) => {
    const startsAt = at(monday, -12 - index * 2, 10)

    return {
      id: `apt-h${pad(index + 1)}` as AppointmentId,
      kind: 'practical',
      instructorId: VOGEL,
      vehicleId: GOLF,
      enrolmentId: 'enr-01' as EnrolmentId,
      driveType: 'standard',
      meetingPointId: null,
      startsAt,
      durationMinutes: 45,
      outcome: { status: 'completed', completedAt: startsAt },
      notes: '',
    }
  })

  // Hannah misses the second half of the course; one absence is what makes the attendance rule
  // worth having rather than a count of rows.
  const theory: Appointment[] = Array.from({ length: 7 }, (_, index) => {
    const startsAt = at(monday, -11 - index * 7, 18)

    return {
      id: `apt-th${pad(index + 1)}` as AppointmentId,
      kind: 'theory',
      instructorId: LEHMANN,
      locationId: CLASSROOM,
      topic: { scope: 'basic', number: index + 1 },
      capacity: 12,
      attendees: [
        attendance('enr-01', 'attended'),
        attendance('enr-07', index < 4 ? 'attended' : 'absent'),
        attendance('enr-02', 'attended'),
      ],
      startsAt,
      durationMinutes: 90,
      outcome: { status: 'completed', completedAt: startsAt },
      notes: '',
    }
  })

  const theoryExamAt = at(monday, -9, 9)

  const theoryExam: Appointment = {
    id: 'apt-hx1' as AppointmentId,
    kind: 'exam',
    examKind: 'theory',
    instructorId: VOGEL,
    locationId: EXAM_CENTRE,
    enrolmentId: 'enr-01' as EnrolmentId,
    result: 'passed',
    startsAt: theoryExamAt,
    durationMinutes: 60,
    outcome: { status: 'completed', completedAt: theoryExamAt },
    notes: '',
  }

  return [...drives, ...theory, theoryExam]
}

/**
 * Past appointments need outcomes, and a calendar where everything went to plan teaches the UI
 * nothing — so one in seven is a no-show and one is a late cancellation.
 */
function pastOutcome(startsAt: IsoDateTime, now: IsoDateTime, index: number): Appointment['outcome'] {
  if (startsAt >= now)
    return { status: 'planned' }

  if (index % 7 === 3)
    return { status: 'noShow', recordedAt: startsAt }

  if (index % 7 === 5)
    return { status: 'cancelled', cancelledAt: startsAt, cancelledBy: 'student' }

  return { status: 'completed', completedAt: startsAt }
}

// --- Finance ---------------------------------------------------------------------------------

const MINUTES_PER_DAY = 24 * 60

/**
 * The school's books, built by running the billing rule over the calendar above rather than by
 * typing amounts in.
 *
 * That is the point: seed invoices whose lines were hand-written would drift from what
 * `billableItems` says the moment either changed, and the fake would be teaching the app a
 * billing rule the domain does not have. Here every line came from `billableItemFor`, so the seed
 * is data the seam itself could have produced.
 *
 * One of each interesting case: settled history, an overdue debt, a part-payment still in date, a
 * draft nobody has sent, and a deposit sitting on account with no invoice to attach to.
 */
function buildFinance(
  enrolments: readonly Enrolment[],
  appointments: readonly Appointment[],
  now: Date,
): { invoices: Invoice[], payments: Payment[] } {
  const invoices: Invoice[] = []
  const payments: Payment[] = []

  function draft(enrolmentId: string, cutDaysAgo: number): Invoice {
    const enrolment = enrolments.find(it => it.id === enrolmentId as EnrolmentId)!
    const cutAt = daysFromNow(now, cutDaysAgo)

    const lines: BillableItem[] = [
      basicFeeItem(enrolment),
      ...appointments
        .filter(it => it.kind !== 'theory' && it.enrolmentId === enrolment.id)
        .map(it => billableItemFor(it, enrolment.agreedPrices))
        .filter((it): it is BillableItem => it !== null),
    ]
      .filter(line => line.occurredAt < cutAt)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

    const invoice: Invoice = {
      id: `inv-${pad(invoices.length + 1)}` as InvoiceId,
      enrolmentId: enrolment.id,
      reference: `${cutAt.slice(0, 4)}-${pad(invoices.length + 1).padStart(4, '0')}`,
      createdAt: cutAt,
      state: { status: 'draft' },
      lines,
      total: totalOf(lines),
    }

    invoices.push(invoice)
    return invoice
  }

  function issue(invoice: Invoice, issuedDaysAgo: number): Invoice {
    const issuedAt = daysFromNow(now, issuedDaysAgo)

    invoice.state = {
      status: 'issued',
      issuedAt,
      dueAt: addMinutes(issuedAt, DEFAULT_PAYMENT_TERM_DAYS * MINUTES_PER_DAY),
    }

    return invoice
  }

  function pay(
    invoice: Invoice,
    share: number,
    method: PaymentMethod,
    receivedDaysAgo: number,
  ): void {
    payments.push({
      id: `pay-${pad(payments.length + 1)}` as PaymentId,
      enrolmentId: invoice.enrolmentId,
      invoiceId: invoice.id,
      receivedAt: daysFromNow(now, receivedDaysAgo),
      amount: multiplyMoney(invoice.total, share),
      method,
      reference: `Rechnung ${invoice.reference}`,
    })
  }

  // Tim passed last year and paid up: the settled history a balance screen must show as zero.
  pay(issue(draft('enr-04', -320), -318), 1, 'bankTransfer', -300)

  // Jonas paused his training owing money — the school's oldest debt, and well past due.
  issue(draft('enr-02', -60), -58)

  // Lena is mid-training, half paid, still inside her payment terms.
  pay(issue(draft('enr-01', -10), -9), 0.5, 'bankTransfer', -4)

  // Yusuf's truck training is expensive and he pays it down in instalments.
  const yusuf = issue(draft('enr-09', -30), -29)
  pay(yusuf, 0.3, 'bankTransfer', -25)
  pay(yusuf, 0.3, 'bankTransfer', -3)

  // Elias's bill is drafted but unsent: money the school has earned and not yet asked for.
  draft('enr-06', -2)

  // Hannah paid a deposit at the counter before anything was invoiced. It sits on account.
  payments.push({
    id: `pay-${pad(payments.length + 1)}` as PaymentId,
    enrolmentId: 'enr-07' as EnrolmentId,
    invoiceId: null,
    receivedAt: daysFromNow(now, -45),
    amount: fromEuros(300),
    method: 'cash',
    reference: 'Anzahlung, Quittung 118',
  })

  return { invoices, payments }
}

function daysFromNow(now: Date, days: number): IsoDateTime {
  return toIsoDateTime(new Date(now.getTime() + days * MINUTES_PER_DAY * 60_000))
}

// --- Small builders --------------------------------------------------------------------------

function student(
  id: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  registeredOn: string,
): Student {
  const slug = `${firstName}.${lastName}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()

  return {
    id: id as StudentId,
    firstName,
    lastName,
    dateOfBirth: dateOfBirth as IsoDate,
    email: `${slug}@example.de`,
    phone: `+49 170 ${id.replace(/\D/g, '')}0000`,
    address: address('Berger Straße', id.replace(/\D/g, ''), '60316', 'Frankfurt am Main'),
    notes: '',
    registeredAt: `${registeredOn}T09:00:00.000Z` as IsoDateTime,
  }
}

/** Not every student leaves an email. `null` is the domain's way of saying so; `''` is not. */
function withoutContactDetails(person: Student): Student {
  return { ...person, email: null, address: null }
}

function enrolment(
  id: string,
  studentId: string,
  licenceClass: Enrolment['licenceClass'],
  status: Enrolment['status'],
  enquiredOn: string,
  startedOn: string | null,
  closedOn: string | null,
): Enrolment {
  const enquiredAt = `${enquiredOn}T09:00:00.000Z` as IsoDateTime

  return {
    id: id as EnrolmentId,
    studentId: studentId as StudentId,
    licenceClass,
    status,
    agreedPrices: agreedPricesFor(licenceClass, enquiredAt),
    enquiredAt,
    startedAt: startedOn === null ? null : `${startedOn}T09:00:00.000Z` as IsoDateTime,
    closedAt: closedOn === null ? null : `${closedOn}T09:00:00.000Z` as IsoDateTime,
  }
}

function attendance(enrolmentId: string, status: Attendance['status']): Attendance {
  return { enrolmentId: enrolmentId as EnrolmentId, status }
}

function address(street: string, houseNumber: string, postalCode: string, city: string) {
  return { street, houseNumber, postalCode, city, countryCode: 'DE' }
}

/** Monday 00:00 UTC of the week `date` falls in. */
function mondayOf(date: Date): Date {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const isoWeekday = monday.getUTCDay() === 0 ? 7 : monday.getUTCDay()

  monday.setUTCDate(monday.getUTCDate() - (isoWeekday - 1))
  return monday
}

function at(monday: Date, dayOffset: number, hour: number): IsoDateTime {
  const instant = new Date(monday)
  instant.setUTCDate(instant.getUTCDate() + dayOffset)
  instant.setUTCHours(hour, 0, 0, 0)

  return toIsoDateTime(instant)
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/**
 * The school, hand-written.
 *
 * Deliberately small and deliberately *illustrative*: one of every interesting case (a paused
 * enrolment, a pure prospect, an alumnus, a leaver, an automatic car, a motorcycle) rather than
 * volume. How realistic seed data eventually gets is its own ticket.
 *
 * Ids are stable, readable strings rather than UUIDs — `stu-04` in a devtools panel is worth more
 * than realism no one reads. Records created at runtime get real UUIDs.
 *
 * Appointments are anchored to the current week so the planner always has something to show.
 */
export function seedDatabase(now: Date = new Date()): Database {
  const monday = mondayOf(now)
  const appointments = buildAppointments(monday, now)
  const { invoices, payments } = buildFinance(ENROLMENTS, appointments, now)

  return {
    locations: [...LOCATIONS],
    instructors: [...INSTRUCTORS],
    vehicles: [...VEHICLES],
    students: [...STUDENTS],
    enrolments: [...ENROLMENTS],
    offerings: buildOfferings(),
    appointments,
    invoices,
    payments,
  }
}
