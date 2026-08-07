import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/openingBalances'
import { useOrganization } from '../contexts/OrganizationContext'

export const useOpeningBalances = () => {
  const { org } = useOrganization()
  return useQuery({
    queryKey: ['opening-balances', org?.id],
    queryFn: () => api.fetchOpeningBalances(org?.id),
    enabled: !!org?.id,
  })
}

export const useUpsertOpeningBalance = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.upsertOpeningBalance,
    onSuccess: () => queryClient.invalidateQueries(['opening-balances']),
  })
}

export const useDeleteOpeningBalance = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteOpeningBalance,
    onSuccess: () => queryClient.invalidateQueries(['opening-balances']),
  })
}