import { supabase } from '../lib/supabase'

export const fetchVendorPayments = async (orgId) => {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('vendor_payments')
    .select('*, vendors(vendor_name), purchase_invoices(invoice_number, grand_total)')
    .eq('organization_id', orgId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data
}

export const settleVendorPayment = async (payload) => {
  const { data, error } = await supabase.rpc('vendor_payment_settle', payload)
  if (error) throw error
  return data
}