// src/api/courses.js
import { supabase } from '../lib/supabase'

// ---------- Courses (top-level programmes) ----------

/**
 * Fetch all courses for a given organization.
 * @param {number} organizationId – the current org id
 */
export const fetchCourses = async (organizationId) => {
  let query = supabase
    .from('courses')
    .select('*')
    .eq('status', true)
    .is('deleted_at', null)
    .order('name')

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createCourse = async (payload) => {
  // payload must include organization_id and optionally medium (text)
  const { data, error } = await supabase
    .from('courses')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateCourse = async (id, updates) => {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteCourse = async (id) => {
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date() })
    .eq('id', id)
  if (error) throw error
}

// ---------- Course Levels (now in course_levels table) ----------

/**
 * Fetch levels for a specific course.
 * @param {number} courseId – parent course id
 * @param {number} organizationId – optional org filter
 */
export const fetchCourseLevels = async (courseId, organizationId) => {
  let query = supabase
    .from('course_levels')
    .select('*')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('level_number')

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createCourseLevel = async (payload) => {
  // payload must include course_id, organization_id, name, level_number, etc.
  const { data, error } = await supabase
    .from('course_levels')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateCourseLevel = async (id, updates) => {
  const { data, error } = await supabase
    .from('course_levels')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteCourseLevel = async (id) => {
  const { error } = await supabase
    .from('course_levels')
    .update({ deleted_at: new Date() })
    .eq('id', id)
  if (error) throw error
}

// ---------- Fees (services from inventory_items) ----------

/**
 * Fetch fee items (services) for a course/level combination.
 * @param {number} courseId
 * @param {number} levelId – from course_levels.id (optional)
 */
export const fetchCourseFees = async (courseId, levelId = null) => {
  let query = supabase
    .from('inventory_items')
    .select('*, tax_rates(rate)')
    .eq('item_type', 'service')
    .eq('course_id', courseId)
    .is('deleted_at', null)

  if (levelId !== null) {
    query = query.eq('level_id', levelId)   // FK now references course_levels.id
  } else {
    query = query.is('level_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createOrUpdateCourseFee = async (payload) => {
  const { id, ...rest } = payload
  // Ensure organization_id is included (inventory items are org-wide)
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
  const { error } = await supabase
    .from('inventory_items')
    .update({ deleted_at: new Date() })
    .eq('id', id)
  if (error) throw error
}

export const getFeeItemForAdmission = async (courseId, levelId = null) => {
  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('item_type', 'service')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (levelId !== null) {
    query = query.eq('level_id', levelId)    // level_id now references course_levels.id
  } else {
    query = query.is('level_id', null)
  }

  const { data, error } = await query.limit(1)
  if (error) throw error
  return data?.[0] || null
}