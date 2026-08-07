import { useQuery } from '@tanstack/react-query'
import { fetchProfitLoss, fetchBalanceSheet } from '../api/reports';
import * as reportsApi from '../api/reports'

export const useFunnelData = () => useQuery({ queryKey: ['report-funnel'], queryFn: reportsApi.fetchFunnelData })
export const useSourceData = () => useQuery({ queryKey: ['report-source'], queryFn: reportsApi.fetchSourceData })
export const useCourseData = () => useQuery({ queryKey: ['report-course'], queryFn: reportsApi.fetchCourseData })
export const useConversionData = () => useQuery({ queryKey: ['report-conversion'], queryFn: reportsApi.fetchConversionData })
export const useDemoPerformance = () => useQuery({ queryKey: ['report-demo'], queryFn: reportsApi.fetchDemoPerformance })
export const useLostReasons = () => useQuery({ queryKey: ['report-lost'], queryFn: reportsApi.fetchLostReasons })
export const useDailyTrend = () => useQuery({ queryKey: ['report-daily'], queryFn: reportsApi.fetchDailyTrend })
export const useFollowupAlerts = () => useQuery({ queryKey: ['report-followup'], queryFn: reportsApi.fetchFollowupAlerts })
export const useBranchComparison = () => useQuery({ queryKey: ['report-branch'], queryFn: reportsApi.fetchBranchComparison })

export const useProfitLoss = (orgId, startDate, endDate, branchId) => {
  return useQuery({
    queryKey: ['profitLoss', orgId, startDate, endDate, branchId],
    queryFn: () => fetchProfitLoss(orgId, startDate, endDate, branchId),
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBalanceSheet = (orgId, asOnDate, branchId) => {
  return useQuery({
    queryKey: ['balanceSheet', orgId, asOnDate, branchId],
    queryFn: () => fetchBalanceSheet(orgId, asOnDate, branchId),
    enabled: !!orgId && !!asOnDate,
    staleTime: 5 * 60 * 1000,
  });
};