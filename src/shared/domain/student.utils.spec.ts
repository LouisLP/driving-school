import type { Enrolment, EnrolmentStatus } from './enrolment.types'
import type { EnrolmentId, StudentId } from './identifier.types'
import type { IsoDateTime } from './time.types'
import { describe, expect, it } from 'vitest'
import { ZERO } from './money.utils'
import { deriveStudentStanding } from './student.utils'

function enrolment(status: EnrolmentStatus): Enrolment {
  return {
    id: 'enrolment-1' as EnrolmentId,
    studentId: 'student-1' as StudentId,
    licenceClass: 'B',
    status,
    agreedPrices: {
      agreedAt: '2026-01-06T09:00:00.000Z' as IsoDateTime,
      basicFee: ZERO,
      practicalLessonUnit: ZERO,
      specialDriveUnit: ZERO,
      theoryExamFee: ZERO,
      practicalExamFee: ZERO,
    },
    enquiredAt: '2026-01-06T09:00:00.000Z' as IsoDateTime,
    startedAt: null,
    closedAt: null,
  }
}

describe('deriveStudentStanding', () => {
  it('treats a student with no enrolments as a prospect', () => {
    expect(deriveStudentStanding([])).toBe('prospect')
  })

  it('treats an untouched enquiry as a prospect', () => {
    expect(deriveStudentStanding([enrolment('enquiring')])).toBe('prospect')
  })

  it('is active while any enrolment is running', () => {
    expect(deriveStudentStanding([enrolment('active')])).toBe('active')
  })

  it('counts a paused enrolment as active', () => {
    expect(deriveStudentStanding([enrolment('paused')])).toBe('active')
  })

  it('prefers active over a past pass', () => {
    expect(deriveStudentStanding([enrolment('passed'), enrolment('active')])).toBe('active')
  })

  it('is an alumnus once everything is finished and something was passed', () => {
    expect(deriveStudentStanding([enrolment('passed')])).toBe('alumnus')
  })

  it('stays an alumnus despite an abandoned second licence class', () => {
    expect(deriveStudentStanding([enrolment('passed'), enrolment('withdrawn')])).toBe('alumnus')
  })

  it('is lapsed only when every enrolment was withdrawn', () => {
    expect(deriveStudentStanding([enrolment('withdrawn'), enrolment('withdrawn')])).toBe('lapsed')
  })

  it('is a prospect again when a withdrawal sits beside a live enquiry', () => {
    expect(deriveStudentStanding([enrolment('withdrawn'), enrolment('enquiring')])).toBe('prospect')
  })
})
