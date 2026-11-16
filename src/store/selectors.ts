import { useMemo } from 'react'
import { useClinicState } from './ClinicStore'
import type { Patient, Visit } from './types'

export interface VisitRow {
  visit: Visit
  patient: Patient
}

/** Ghép lượt khám với hồ sơ người bệnh – dùng chung cho mọi màn hình */
export function useVisitRows(): VisitRow[] {
  const { visits, patients } = useClinicState()
  return useMemo(() => {
    const byId = new Map(patients.map((p) => [p.id, p]))
    return visits.flatMap((visit) => {
      const patient = byId.get(visit.patientId)
      return patient ? [{ visit, patient }] : []
    })
  }, [visits, patients])
}

export function usePatient(id: string | null | undefined) {
  const { patients } = useClinicState()
  return useMemo(() => patients.find((p) => p.id === id) ?? null, [patients, id])
}

export function usePatientVisits(patientId: string | null | undefined) {
  const { visits } = useClinicState()
  return useMemo(
    () =>
      visits
        .filter((v) => v.patientId === patientId)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [visits, patientId],
  )
}
