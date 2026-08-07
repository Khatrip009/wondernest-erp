import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/students'
import { supabase } from '../lib/supabase'

export const useCreateStudent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createStudent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export const useUpdateStudent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateStudent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export const useUpdateParent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateParent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export const useUpsertEnrollment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, data }) => api.upsertEnrollment(studentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export const useUpdateFee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateFee(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })
}

export const useAddFeePayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentFeeId, amount, paymentMode, transactionNo, remarks, paymentDate, branchId, financialYearId }) => {
      const { data, error } = await supabase
        .from('fee_payments')
        .insert({
          student_fee_id: studentFeeId,
          amount: amount,
          payment_mode: paymentMode,
          transaction_no: transactionNo,
          remarks: remarks,
          payment_date: paymentDate || new Date().toISOString().split('T')[0],
          base_amount: amount, // placeholder
          tax_amount: 0,       // placeholder
          branch_id: branchId,
          financial_year_id: financialYearId,
        })
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate student queries and any fee-related queries
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['student-fees'] })
      qc.invalidateQueries({ queryKey: ['fee-payments'] })
    }
  })
}