import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as hrApi from '../api/hr'

export const useEmployees = (branchId) =>
  useQuery({ queryKey: ['employees', branchId], queryFn: () => hrApi.fetchEmployees(branchId), enabled: !!branchId })

export const useEmployee = (id) =>
  useQuery({ queryKey: ['employee', id], queryFn: () => hrApi.fetchEmployee(id), enabled: !!id })

export const useCreateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: hrApi.createEmployee, onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }) })
}

export const useUpdateEmployee = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...upd }) => hrApi.updateEmployee(id, upd), onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }) })
}

export const useDeleteEmployee = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: hrApi.deleteEmployee, onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }) })
}

// Attendance
export const useAttendance = (branchId, date) =>
  useQuery({ queryKey: ['attendance', branchId, date], queryFn: () => hrApi.fetchAttendance(branchId, date), enabled: !!branchId })

export const useMarkAttendance = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: hrApi.markAttendance, onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }) })
}

// Leaves
export const useLeaves = (branchId) =>
  useQuery({ queryKey: ['leaves', branchId], queryFn: () => hrApi.fetchLeaves(branchId), enabled: !!branchId })

export const useCreateLeave = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: hrApi.createLeave, onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) })
}

export const useUpdateLeaveStatus = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, status, adminRemarks }) => hrApi.updateLeaveStatus(id, status, adminRemarks), onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }) })
}

// Salary
export const useSalaries = (branchId, month) =>
  useQuery({ queryKey: ['salaries', branchId, month], queryFn: () => hrApi.fetchSalaries(branchId, month), enabled: !!branchId })

export const usePaySalary = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: hrApi.paySalary, onSuccess: () => qc.invalidateQueries({ queryKey: ['salaries'] }) })
}