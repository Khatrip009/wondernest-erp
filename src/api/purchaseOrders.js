import { supabase } from '../lib/supabase'

export const fetchPurchaseOrders = async (orgId) => {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('organization_id', orgId)
    .order('order_date', { ascending: false })
  if (error) throw error
  return data
}

export const fetchPurchaseOrder = async (id) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, purchase_order_items(*, inventory_items(item_name, unit))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createPurchaseOrder = async (payload) => {
  // payload: { header: {...}, items: [...] }
  const { header, items } = payload
  const { data: po, error } = await supabase.from('purchase_orders').insert(header).select().single()
  if (error) throw error
  if (items?.length) {
    const itemsWithPO = items.map(item => ({ ...item, purchase_order_id: po.id }))
    const { error: itemErr } = await supabase.from('purchase_order_items').insert(itemsWithPO)
    if (itemErr) throw itemErr
  }
  return po
}

export const updatePurchaseOrder = async (id, updates) => {
  const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id)
  if (error) throw error
}

export const deletePurchaseOrder = async (id) => {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
  if (error) throw error
}