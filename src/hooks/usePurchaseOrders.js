// src/hooks/usePurchaseOrders.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as poApi from '../api/purchaseOrders'
import { useOrganization } from '../contexts/OrganizationContext'
import { supabase } from '../lib/supabase'   // 👈 added

export const usePurchaseOrders = () => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['purchase-orders', org?.id],
    queryFn: () => poApi.fetchPurchaseOrders(org?.id),
    enabled: !!org?.id,
  })
}

export const usePurchaseOrder = (id) => {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      // ✅ Override the API call to include tax_rates join
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items(
            *,
            inventory_items(item_name, unit),
            tax_rates(rate)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// ... rest of the mutations remain the same
export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: poApi.createPurchaseOrder,
    onSuccess: () => qc.invalidateQueries(['purchase-orders']),
  })
}

export const useUpdatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => poApi.updatePurchaseOrder(id, updates),
    onSuccess: () => qc.invalidateQueries(['purchase-orders']),
  })
}

export const useDeletePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: poApi.deletePurchaseOrder,
    onSuccess: () => qc.invalidateQueries(['purchase-orders']),
  })
}