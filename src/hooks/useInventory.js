import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as inventoryApi from '../api/inventory'
import { useOrganization } from '../contexts/OrganizationContext'
import { useScope } from '../contexts/ScopeContext'

export const useInventoryItems = () => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['inventory-items', org?.id],
    queryFn: () => inventoryApi.fetchInventoryItems(org?.id),
    enabled: !!org?.id,
  })
}

export const useCreateInventoryItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.createInventoryItem,
    onSuccess: () => qc.invalidateQueries(['inventory-items']),
  })
}

export const useUpdateInventoryItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => inventoryApi.updateInventoryItem(id, updates),
    onSuccess: () => qc.invalidateQueries(['inventory-items']),
  })
}

export const useDeleteInventoryItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.deleteInventoryItem,
    onSuccess: () => qc.invalidateQueries(['inventory-items']),
  })
}

export const useBranchStock = (branchId) => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['branch-stock', org?.id, branchId],
    queryFn: () => inventoryApi.fetchBranchStock(org?.id, branchId),
    enabled: !!org?.id && !!branchId,
  })
}

export const useAdjustBranchStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, branchId, quantity }) => inventoryApi.adjustBranchStock(itemId, branchId, quantity),
    onSuccess: () => qc.invalidateQueries(['branch-stock']),
  })
}