import { supabase } from '../lib/supabase'

export const updateOrganization = async (id, updates) => {
  const { data, error } = await supabase
    .from('organization')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}