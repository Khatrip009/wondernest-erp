import { supabase } from '../lib/supabase'

// ---------- Courses (unified: courses + levels) ----------
export const fetchCourses = async () => {
  // Fetch only root courses (parent_id IS NULL)
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', true)
    .is('parent_id', null)
    .is('deleted_at', null)
    .order('name') // column is 'name', not 'course_name'
  if (error) throw error
  return data
}

export const createCourse = async (payload) => {
  // payload should include: name, description, duration_months, status, medium_id, 
  // financial_year_id, organization_id, branch_id, etc.
  // parent_id is not set (NULL) for root courses.
  const { data, error } = await supabase.from('courses').insert(payload).select().single()
  if (error) throw error
  return data
}

export const updateCourse = async (id, updates) => {
  const { data, error } = await supabase.from('courses').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteCourse = async (id) => {
  const { error } = await supabase.from('courses').update({ deleted_at: new Date() }).eq('id', id)
  if (error) throw error
}

// ---------- Levels (now also in courses) ----------
export const fetchCourseLevels = async (courseId) => {
  // Fetch all levels belonging to a course (parent_id = courseId)
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('parent_id', courseId)
    .is('deleted_at', null)
    .order('level_number')
  if (error) throw error
  return data
}

export const createCourseLevel = async (payload) => {
  // payload should include: name, description, duration_months, level_number, 
  // certificate_eligible, branch_id, financial_year_id, organization_id, etc.
  // Also set parent_id = courseId (must be provided in payload)
  const { data, error } = await supabase.from('courses').insert(payload).select().single()
  if (error) throw error
  return data
}

export const updateCourseLevel = async (id, updates) => {
  const { data, error } = await supabase.from('courses').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteCourseLevel = async (id) => {
  const { error } = await supabase.from('courses').update({ deleted_at: new Date() }).eq('id', id)
  if (error) throw error
}

// ---------- Fees (now stored in inventory_items as services) ----------
export const fetchCourseFees = async (courseId, levelId = null) => {
  // Fetch inventory items (services) for a given course (and optionally level)
  let query = supabase
    .from('inventory_items')
    .select('*, tax_rates(rate)')
    .eq('item_type', 'service')
    .eq('course_id', courseId)
    .is('deleted_at', null)

  if (levelId !== null) {
    query = query.eq('level_id', levelId)
  } else {
    // If no level specified, fetch course-level fee (level_id IS NULL)
    query = query.is('level_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createOrUpdateCourseFee = async (payload) => {
  // payload: { id?, course_id, level_id, unit_price, tax_rate_id, 
  //            hsn_sac_code, branch_id, financial_year_id, organization_id, 
  //            item_name, description, is_active }
  // If id is provided, update; else insert.
  const { id, ...rest } = payload
  // Ensure item_type = 'service'
  const itemData = { ...rest, item_type: 'service', unit: 'service' }

  if (id) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    // If no id, insert new
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(itemData)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const deleteCourseFee = async (id) => {
  // Soft delete inventory item
  const { error } = await supabase
    .from('inventory_items')
    .update({ deleted_at: new Date() })
    .eq('id', id)
  if (error) throw error
}

// ---------- (Optional) Helper to get fee for a student admission ----------
export const getFeeItemForAdmission = async (courseId, levelId = null) => {
  // Returns the appropriate inventory item for the given course/level
  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('item_type', 'service')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (levelId !== null) {
    query = query.eq('level_id', levelId)
  } else {
    query = query.is('level_id', null)
  }

  const { data, error } = await query.limit(1)
  if (error) throw error
  return data?.[0] || null
}