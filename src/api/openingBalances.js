import { supabase } from '../lib/supabase'

export const fetchOpeningBalances = async (orgId) => {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('account_opening_balances')
    .select('*, chart_of_accounts(account_name, account_code)')
    .eq('organization_id', orgId)
    .order('as_of_date', { ascending: false })
  if (error) throw error
  return data
}

export const upsertOpeningBalance = async (payload) => {
  const { id, ...rest } = payload
  if (id) {
    const { data, error } = await supabase
      .from('account_opening_balances')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('account_opening_balances')
      .insert(rest)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const deleteOpeningBalance = async (id) => {
  const { error } = await supabase
    .from('account_opening_balances')
    .delete()
    .eq('id', id)
  if (error) throw error
}