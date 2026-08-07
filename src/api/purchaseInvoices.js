import { supabase } from '../lib/supabase'

export const fetchPurchaseInvoices = async (orgId) => {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('purchase_invoices')
    .select('*, vendors(vendor_name)')
    .eq('organization_id', orgId)
    .order('invoice_date', { ascending: false })
  if (error) throw error
  return data
}

export const fetchPurchaseInvoice = async (id) => {
  const { data, error } = await supabase
    .from('purchase_invoices')
    .select('*, vendors(*), purchase_invoice_items(*, inventory_items(item_name, unit))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createPurchaseInvoice = async (payload) => {
  const { header, items } = payload
  const { data: invoice, error } = await supabase.from('purchase_invoices').insert(header).select().single()
  if (error) throw error
  if (items?.length) {
    const itemsWithInv = items.map(item => ({ ...item, purchase_invoice_id: invoice.id }))
    const { error: itemErr } = await supabase.from('purchase_invoice_items').insert(itemsWithInv)
    if (itemErr) throw itemErr
  }
  return invoice
}

export const finalizePurchaseInvoice = async (id) => {
  const { error } = await supabase.from('purchase_invoices').update({ status: 'Final' }).eq('id', id)
  if (error) throw error
}