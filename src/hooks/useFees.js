import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import * as api from '../api/fees'

// ---------- Fees List ----------
export const useFees = (page, pageSize, filters, orgId) => {
  return useQuery({
    queryKey: ['fees', page, pageSize, filters, orgId],
    queryFn: () => api.fetchFees({ page, pageSize, filters, orgId }),
    keepPreviousData: true,
    enabled: !!orgId,
  })
}

// ---------- Single Fee ----------
export const useFee = (id, { orgId, branchId, financialYearId } = {}) => {
  return useQuery({
    queryKey: ['fee', id, orgId, branchId, financialYearId],
    queryFn: () => api.fetchFee(id, { orgId, branchId, financialYearId }),
    enabled: !!id && !!orgId,
  })
}

// ---------- Update Fee ----------
export const useUpdateFee = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => api.updateFee(id, updates),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['fee', variables.id] })
      qc.invalidateQueries({ queryKey: ['fees'] })
    },
  })
}

// ---------- Add Payment (collect_fee) ----------
export const useAddPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      // payload must contain: studentId, items, amount, paymentMode, branchId, financialYearId,
      //   paymentDate, remarks, placeOfSupply, organizationId
      return await api.processPayment(payload)
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      qc.invalidateQueries({ queryKey: ['fee', variables.studentId] })
      qc.invalidateQueries({ queryKey: ['fees'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['feeStats'] })
    },
  })
}

// ---------- Invoices List ----------
export const useInvoices = (page, pageSize, filters, orgId) => {
  return useQuery({
    queryKey: ['invoices', page, pageSize, filters, orgId],
    queryFn: () => api.fetchInvoices({ page, pageSize, filters, orgId }),
    keepPreviousData: true,
    enabled: !!orgId,
  })
}

// ---------- Single Invoice ----------
export const useInvoice = (id, { orgId, branchId, financialYearId } = {}) => {
  return useQuery({
    queryKey: ['invoice', id, orgId, branchId, financialYearId],
    queryFn: () => api.fetchInvoice(id, { orgId, branchId, financialYearId }),
    enabled: !!id && !!orgId,
  })
}

// ---------- Receipts List ----------
export const useReceipts = (page, pageSize, filters, orgId) => {
  return useQuery({
    queryKey: ['receipts', page, pageSize, filters, orgId],
    queryFn: () => api.fetchReceipts({ page, pageSize, filters, orgId }),
    keepPreviousData: true,
    enabled: !!orgId,
  })
}

// ---------- Fee Statistics ----------
export const useFeeStats = (orgId, branchId, financialYearId) => {
  return useQuery({
    queryKey: ['feeStats', orgId, branchId, financialYearId],
    queryFn: () => api.fetchFeeStats({ orgId, branchId, financialYearId }),
    staleTime: 60 * 1000,
    enabled: !!orgId,
  })
}

// ---------- Invoices for a Fee ----------
export const useInvoicesForFee = (feeId) => {
  return useQuery({
    queryKey: ['invoices', 'fee', feeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          fee_payments (
            payment_mode,
            receipt_number,
            payment_date,
            transaction_no
          ),
          receipts (
            receipt_no
          )
        `)
        .eq('student_fee_id', feeId)
        .order('invoice_date', { ascending: false })
      if (error) throw error
      // Flatten: take the first payment's details for display
      return data.map(inv => {
        const firstPayment = inv.fee_payments?.[0]
        return {
          ...inv,
          payment_mode: firstPayment?.payment_mode || null,
          receipt_number: firstPayment?.receipt_number || null,
          receipt_no: inv.receipts?.[0]?.receipt_no || null,
          receipt_id: inv.receipt_id || null,
        }
      })
    },
    enabled: !!feeId,
  })
}

// ---------- Single Receipt ----------
export const useReceipt = (id, { orgId, branchId, financialYearId } = {}) => {
  return useQuery({
    queryKey: ['receipt', id, orgId, branchId, financialYearId],
    queryFn: () => api.fetchReceipt(id, { orgId, branchId, financialYearId }),
    enabled: !!id && !!orgId,
  })
}