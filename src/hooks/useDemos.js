import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as demoApi from '../api/demos'

export const useDemos = (page, pageSize, filters, orgId) => {
  return useQuery({
    queryKey: ['demos', page, pageSize, filters, orgId],
    queryFn: () => demoApi.fetchDemos({ page, pageSize, filters, orgId }),
    keepPreviousData: true,
    enabled: !!orgId, // only run when orgId is available
    onError: (error) => {
      console.error('useDemos error:', error)
    }
  })
}

export const useDemo = (id) => {
  return useQuery({
    queryKey: ['demo', id],
    queryFn: () => demoApi.fetchDemo(id),
    enabled: !!id,
  })
}

export const useUpdateDemo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => demoApi.updateDemo(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demos'] })
      queryClient.invalidateQueries({ queryKey: ['demo'] })
    },
  })
}

export const useCancelDemo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: demoApi.cancelDemo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demos'] })
    },
  })
}