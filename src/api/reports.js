import { supabase } from '../lib/supabase'

export const fetchFunnelData = async () => {
  const { data, error } = await supabase
    .from('report_inquiry_funnel')
    .select('*')
    .order('month', { ascending: false })
  if (error) throw error
  return data
}

export const fetchSourceData = async () => {
  const { data, error } = await supabase.from('report_inquiry_by_source').select('*')
  if (error) throw error
  return data
}

export const fetchCourseData = async () => {
  const { data, error } = await supabase.from('report_inquiry_by_course').select('*')
  if (error) throw error
  return data
}

export const fetchConversionData = async () => {
  const { data, error } = await supabase.from('report_conversion_analysis').select('*').order('month', { ascending: false })
  if (error) throw error
  return data
}

export const fetchDemoPerformance = async () => {
  const { data, error } = await supabase.from('report_demo_performance').select('*')
  if (error) throw error
  return data
}

export const fetchLostReasons = async () => {
  const { data, error } = await supabase.from('report_lost_reasons').select('*').order('month', { ascending: false })
  if (error) throw error
  return data
}

export const fetchDailyTrend = async () => {
  const { data, error } = await supabase.from('report_daily_inquiries').select('*').order('inquiry_date', { ascending: false })
  if (error) throw error
  return data
}

export const fetchFollowupAlerts = async () => {
  const { data, error } = await supabase.from('report_followup_alerts').select('*')
  if (error) throw error
  return data
}

export const fetchBranchComparison = async () => {
  const { data, error } = await supabase.from('report_branch_comparison').select('*')
  if (error) throw error
  return data
}

/**
 * Fetch Profit & Loss statement
 * @param {number} orgId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {number|null} branchId
 * @returns {Promise<Object>} JSON data from RPC
 */
export const fetchProfitLoss = async (orgId, startDate, endDate, branchId = null) => {
  const { data, error } = await supabase
    .rpc('get_profit_loss', {
      p_org_id: orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_branch_id: branchId,
    });
  if (error) throw new Error(error.message);
  return data;
};

/**
 * Fetch Balance Sheet
 * @param {number} orgId
 * @param {string} asOnDate - YYYY-MM-DD
 * @param {number|null} branchId
 * @returns {Promise<Object>} JSON data from RPC
 */
export const fetchBalanceSheet = async (orgId, asOnDate, branchId = null) => {
  const { data, error } = await supabase
    .rpc('get_balance_sheet', {
      p_org_id: orgId,
      p_as_on_date: asOnDate,
      p_branch_id: branchId,
    });
  if (error) throw new Error(error.message);
  return data;
};