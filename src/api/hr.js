import { supabase } from '../lib/supabase'

// ---------- Employees (teachers table) ----------
export const fetchEmployees = async (branchId) => {
  let query = supabase.from('teachers').select('*').is('deleted_at', null).order('first_name')
  if (branchId) query = query.eq('branch_id', branchId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const fetchEmployee = async (id) => {
  const { data, error } = await supabase.from('teachers').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export const createEmployee = async (payload) => {
  const { data, error } = await supabase.from('teachers').insert(payload).select().single()
  if (error) throw error
  return data
}

export const updateEmployee = async (id, updates) => {
  const { data, error } = await supabase.from('teachers').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteEmployee = async (id) => {
  const { error } = await supabase.from('teachers').update({ deleted_at: new Date() }).eq('id', id)
  if (error) throw error
}

// ---------- Attendance ----------
export const fetchAttendance = async (branchId, date) => {
  let query = supabase.from('teacher_attendance').select('*, teachers(first_name, last_name)').order('attendance_date', { ascending: false })
  if (branchId) query = query.eq('branch_id', branchId)
  if (date) query = query.eq('attendance_date', date)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const markAttendance = async (records) => {
  const { data, error } = await supabase.from('teacher_attendance').insert(records).select()
  if (error) throw error
  return data
}

// ---------- Leaves ----------
export const fetchLeaves = async (branchId) => {
  let query = supabase.from('leaves').select('*, teachers(first_name, last_name)').order('created_at', { ascending: false })
  if (branchId) query = query.eq('branch_id', branchId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const createLeave = async (payload) => {
  const { data, error } = await supabase.from('leaves').insert(payload).select().single()
  if (error) throw error
  return data
}

export const updateLeaveStatus = async (id, status, adminRemarks) => {
  const { data, error } = await supabase.from('leaves').update({ status, admin_remarks: adminRemarks }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ---------- Salary ----------
export const fetchSalaries = async (branchId, month) => {
  let query = supabase.from('salary_payments').select('*, teachers(first_name, last_name)').order('payment_date', { ascending: false })
  if (branchId) query = query.eq('branch_id', branchId)
  if (month) {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().split('T')[0]
    query = query.gte('payment_date', start).lte('payment_date', end)
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export const paySalary = async (payload) => {
  const { data, error } = await supabase.from('salary_payments').insert(payload).select().single()
  if (error) throw error
  return data
}