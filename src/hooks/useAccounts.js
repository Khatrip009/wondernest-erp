import { useQuery } from '@tanstack/react-query';
import * as api from '../api/accounts';

export const useAccounts = (type, orgId, branchId, financialYearId) => {
  return useQuery({
    queryKey: ['accounts', type, orgId, branchId, financialYearId],
    queryFn: () => api.fetchAccounts({ type, orgId, branchId, financialYearId }),
    staleTime: 60 * 1000,
  });
};

export const useJournalEntries = (page, pageSize, filters) => {
  // filters may contain orgId, but we'll ignore it in the API call
  const apiFilters = { ...filters };
  delete apiFilters.orgId; // optional – just to be safe
  return useQuery({
    queryKey: ['journal-entries', page, pageSize, apiFilters],
    queryFn: () => api.fetchJournalEntries({ page, pageSize, filters: apiFilters }),
    keepPreviousData: true,
  });
};

export const useJournalEntry = (id) => {
  return useQuery({
    queryKey: ['journal-entry', id],
    queryFn: () => api.fetchJournalEntry(id),
    enabled: !!id,
  });
};

export const useLedger = (orgId, branchId, financialYearId) => {
  return useQuery({
    queryKey: ['ledger', orgId, branchId, financialYearId],
    queryFn: () => api.fetchLedger({ orgId, branchId, financialYearId }),
    staleTime: 60 * 1000,
  });
};

export const useIncomeExpenseSummary = (orgId, branchId, financialYearId) => {
  return useQuery({
    queryKey: ['income-expense', orgId, branchId, financialYearId],
    queryFn: () => api.fetchIncomeExpenseSummary({ orgId, branchId, financialYearId }),
    staleTime: 60 * 1000,
  });
};

export const useTrialBalance = (orgId, branchId, financialYearId) => {
  return useQuery({
    queryKey: ['trial-balance', orgId, branchId, financialYearId],
    queryFn: () => api.fetchTrialBalance({ orgId, branchId, financialYearId }),
    staleTime: 60 * 1000,
  });
};

export const useIncomeTransactions = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['income-transactions', page, pageSize, filters],
    queryFn: () => api.fetchIncomeTransactions({ page, pageSize, filters }),
    keepPreviousData: true,
  });
};

export const useExpenseTransactions = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['expense-transactions', page, pageSize, filters],
    queryFn: () => api.fetchExpenseTransactions({ page, pageSize, filters }),
    keepPreviousData: true,
  });
};

export const useAccountLedger = (accountId, orgId, branchId, financialYearId, fromDate, toDate) => {
  return useQuery({
    queryKey: ['account-ledger', accountId, orgId, branchId, financialYearId, fromDate, toDate],
    queryFn: () => api.fetchAccountLedger(accountId, { orgId, branchId, financialYearId, fromDate, toDate }),
    enabled: !!accountId && !!orgId,
    staleTime: 60 * 1000,
  });
};

export const useStudentLedger = (studentId, orgId, branchId, financialYearId, fromDate, toDate) => {
  return useQuery({
    queryKey: ['student-ledger', studentId, orgId, branchId, financialYearId, fromDate, toDate],
    queryFn: () => api.fetchStudentLedger(studentId, { orgId, branchId, financialYearId, fromDate, toDate }),
    enabled: !!studentId && !!orgId,
    staleTime: 60 * 1000,
  });
};

export const useGSTSummary = (orgId, branchId, financialYearId, fromDate, toDate) => {
  return useQuery({
    queryKey: ['gst-summary', orgId, branchId, financialYearId, fromDate, toDate],
    queryFn: () => api.fetchGSTSummary({ orgId, branchId, financialYearId, fromDate, toDate }),
    staleTime: 60 * 1000,
  });
};

export const useGeneralLedger = (orgId, startDate, endDate, branchId, financialYearId, accountId) => {
  return useQuery({
    queryKey: ['general-ledger', orgId, startDate, endDate, branchId, financialYearId, accountId],
    queryFn: () => api.fetchGeneralLedger({ orgId, startDate, endDate, branchId, financialYearId, accountId }),
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 60 * 1000,
  });
};

export const useGSTLedger = (orgId, startDate, endDate, branchId) => {
  return useQuery({
    queryKey: ['gst-ledger', orgId, startDate, endDate, branchId],
    queryFn: () => api.fetchGSTLedger({ orgId, startDate, endDate, branchId }),
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 60 * 1000,
  });
};