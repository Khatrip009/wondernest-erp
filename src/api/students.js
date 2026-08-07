// api/courses.js
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
  // payload must include organization_id, and optionally medium (text)
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

// ---------- Helper: get fee item for admission ----------
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

// ---------- Student creation and management ----------
// (keep the existing createStudent, updateStudent, etc. – they are fine)
export const createStudent = async (payload) => {
  const { studentData, parentData, enrollmentData, feeData } = payload
  let parentId = null

  if (parentData) {
    const { data: parent, error } = await supabase.from('parents').insert(parentData).select().single()
    if (error) throw error
    parentId = parent.id
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({ ...studentData, parent_id: parentId })
    .select()
    .single()
  if (studentError) throw studentError

  if (enrollmentData) {
    const { error } = await supabase.from('student_enrollments').insert({
      ...enrollmentData,
      student_id: student.id,
    })
    if (error) throw error
  }

  if (feeData) {
    const { error } = await supabase.from('student_fees').insert({
      ...feeData,
      student_id: student.id,
    })
    if (error) throw error
  }

  return student
}

export const updateStudent = async (id, data) => {
  const { error } = await supabase.from('students').update(data).eq('id', id)
  if (error) throw error
}

export const updateParent = async (id, data) => {
  const { error } = await supabase.from('parents').update(data).eq('id', id)
  if (error) throw error
}

export const upsertEnrollment = async (studentId, data) => {
  const { data: existing } = await supabase
    .from('student_enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase.from('student_enrollments').update(data).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('student_enrollments').insert({
      ...data,
      student_id: studentId,
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'active',
    })
    if (error) throw error
  }
}

export const updateFee = async (id, data) => {
  const { error } = await supabase.from('student_fees').update(data).eq('id', id)
  if (error) throw error
}

export const addFeePayment = async (studentFeeId, amount, paymentMode, transactionNo, remarks) => {
  const { error } = await supabase.from('fee_payments').insert({
    student_fee_id: studentFeeId,
    amount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: paymentMode,
    transaction_no: transactionNo,
    remarks,
  })
  if (error) throw error
}