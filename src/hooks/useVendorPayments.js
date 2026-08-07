import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/vendorPayments'
import { useOrganization } from '../contexts/OrganizationContext'
import { supabase } from '../lib/supabase'

export const useVendorPayments = () => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['vendor-payments', org?.id],
    queryFn: () => api.fetchVendorPayments(org?.id),
    enabled: !!org?.id,
  })
}

export const useSettleVendorPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args) => {
      const { error, data } = await supabase.rpc('vendor_payment_settle', {
        p_purchase_invoice_id: args.p_purchase_invoice_id,
        p_amount: args.p_amount,                    // ✅ this must be exactly args.p_amount
        p_payment_mode: args.p_payment_mode,
        p_payment_date: args.p_payment_date,
        p_remarks: args.p_remarks,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-payments'])
      queryClient.invalidateQueries(['unpaid-purchase-invoices'])
    },
  })
}
