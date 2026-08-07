// api/demos.js
import { supabase } from '../lib/supabase'

export const fetchDemos = async ({ page = 1, pageSize = 10, filters = {}, orgId }) => {
  let query = supabase
    .from('demo_sessions_view')
    .select('*', { count: 'exact' })
    .order('scheduled_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters.branch_id) {
    query = query.eq('branch_id', filters.branch_id)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.search) {
    query = query.or(
      `student_name.ilike.%${filters.search}%,` +
      `mobile_no.ilike.%${filters.search}%,` +
      `inquiry_no.ilike.%${filters.search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw error

  // The view already returns flat fields – no mapping needed
  return { data, count }
}

export const fetchDemo = async (id) => {
  const { data, error } = await supabase
    .from('demo_sessions_view')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const updateDemo = async (id, updates) => {
  const payload = {
    status: updates.status,
    outcome: updates.outcome || null,
    feedback: updates.feedback || null,
    teacher_remarks: updates.teacher_remarks || null,
    attended_by: updates.demo_attended_by || updates.attended_by || null,
    duration_minutes: updates.duration || updates.duration_minutes,
    branch_id: updates.branch_id || null,
    scheduled_at: updates.scheduled_at || undefined,
  }

  const { data, error } = await supabase
    .from('demo_sessions')       // updates still go to the table
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const cancelDemo = async (id) => {
  const { error } = await supabase
    .from('demo_sessions')
    .update({ status: 'Cancelled' })
    .eq('id', id)
  if (error) throw error
}