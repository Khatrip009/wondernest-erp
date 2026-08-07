import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as piApi from '../api/purchaseInvoices'
import { useOrganization } from '../contexts/OrganizationContext'

export const usePurchaseInvoices = () => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['purchase-invoices', org?.id],
    queryFn: () => piApi.fetchPurchaseInvoices(org?.id),
    enabled: !!org?.id,
  })
}

export const usePurchaseInvoice = (id) => {
  return useQuery({
    queryKey: ['purchase-invoice', id],
    queryFn: () => piApi.fetchPurchaseInvoice(id),
    enabled: !!id,
  })
}

export const useCreatePurchaseInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: piApi.createPurchaseInvoice,
    onSuccess: () => qc.invalidateQueries(['purchase-invoices']),
  })
}

export const useFinalizePurchaseInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: piApi.finalizePurchaseInvoice,
    onSuccess: () => qc.invalidateQueries(['purchase-invoices']),
  })
}