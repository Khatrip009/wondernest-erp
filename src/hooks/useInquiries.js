import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as inquiryApi from '../api/inquiries'

export const useInquiries = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['inquiries', page, pageSize, filters],
    queryFn: () => inquiryApi.fetchInquiries({ page, pageSize, filters }),
    keepPreviousData: true,
  })
}

export const useInquiry = (id) => {
  return useQuery({
    queryKey: ['inquiry', id],
    queryFn: () => inquiryApi.fetchInquiry(id),
    enabled: !!id,
  })
}

export const useInquiryHistory = (inquiryId) => {
  return useQuery({
    queryKey: ['inquiryHistory', inquiryId],
    queryFn: () => inquiryApi.fetchInquiryHistory(inquiryId),
    enabled: !!inquiryId,
  })
}

export const useCreateInquiry = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inquiryApi.createInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}

export const useUpdateInquiry = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => inquiryApi.updateInquiry(id, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inquiry', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}

export const useDeleteInquiry = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inquiryApi.deleteInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}

export const useScheduleDemo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inquiryApi.scheduleDemo,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inquiry', variables.inquiryId] })
      queryClient.invalidateQueries({ queryKey: ['inquiryHistory', variables.inquiryId] })
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}

export const useConductDemo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ demoId, inquiryId, ...rest }) => inquiryApi.conductDemo(demoId, inquiryId, rest),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inquiry', variables.inquiryId] })
      queryClient.invalidateQueries({ queryKey: ['inquiryHistory', variables.inquiryId] })
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
    },
  })
}

export const useInquiryStats = (branchId) => {
  return useQuery({
    queryKey: ['inquiryStats', branchId],
    queryFn: () => inquiryApi.fetchInquiryStats({ branchId }),
    staleTime: 60 * 1000,
  })
}

export const useUpcomingDemos = (branchId, limit = 5) => {
  return useQuery({
    queryKey: ['upcomingDemos', branchId, limit],
    queryFn: () => inquiryApi.fetchDemoSessions({ status: 'Scheduled', branchId, limit }),
    staleTime: 30 * 1000,
  })
}

export const useRecentDemos = (branchId, limit = 5) => {
  return useQuery({
    queryKey: ['recentDemos', branchId, limit],
    queryFn: () => inquiryApi.fetchDemoSessions({ status: 'Conducted', branchId, limit }),
    staleTime: 30 * 1000,
  })
}