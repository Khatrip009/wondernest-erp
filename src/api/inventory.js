import { supabase } from '../lib/supabase'

// ---------- Inventory Items ----------
export const fetchInventoryItems = async (orgId) => {
  if (!orgId) return []
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, tax_rates(rate)')
    .eq('organization_id', orgId)
    .order('item_name')
  if (error) throw error
  return data
}

export const createInventoryItem = async (payload) => {
  const { data, error } = await supabase.from('inventory_items').insert(payload).select().single()
  if (error) throw error
  return data
}

export const updateInventoryItem = async (id, updates) => {
  const { data, error } = await supabase.from('inventory_items').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteInventoryItem = async (id) => {
  const { error } = await supabase.from('inventory_items').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---------- Branch Stock ----------
export const fetchBranchStock = async (orgId, branchId) => {
  if (!orgId || !branchId) return []
  // Get all items for org, then join branch stock
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, item_name, unit')
    .eq('organization_id', orgId)
    .eq('item_type', 'product')
    .eq('is_active', true)

  if (!items?.length) return []

  const { data: stocks } = await supabase
    .from('inventory_branch_stock')
    .select('item_id, quantity')
    .eq('branch_id', branchId)
    .in('item_id', items.map(i => i.id))

  const stockMap = {}
  ;(stocks || []).forEach(s => { stockMap[s.item_id] = s.quantity })

  return items.map(item => ({
    ...item,
    current_stock: stockMap[item.id] || 0,
  }))
}

export const adjustBranchStock = async (itemId, branchId, quantity) => {
  const { error } = await supabase
    .from('inventory_branch_stock')
    .upsert({ item_id: itemId, branch_id: branchId, quantity, updated_at: new Date().toISOString() }, { onConflict: 'item_id, branch_id' })
  if (error) throw error
}