import { supabase } from '../lib/supabase'

// ---------- Courses (unified: courses + levels) ----------
export const fetchCourses = async () => {
  // Only root courses (parent_id IS NULL)
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', true)
    .is('parent_id', null)
    .is('deleted_at', null)
    .order('name') // column is 'name' (not 'course_name')
  if (error) throw error
  return data
}

export const createCourse = async (payload) => {
  // payload: name, description, duration_months, status, medium_id, financial_year_id,
  // organization_id, branch_id (parent_id is NOT set, NULL by default)
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

// ---------- Levels (now stored in courses with parent_id = courseId) ----------
export const fetchCourseLevels = async (courseId) => {
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
  // payload must include: parent_id (course id), name, description, level_number,
  // certificate_eligible, branch_id, financial_year_id, organization_id, etc.
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

// ---------- Fees (stored as inventory_items of type 'service') ----------
export const fetchCourseFees = async (courseId, levelId = null) => {
  // Fetch inventory items (services) for a given course and optionally level
  let query = supabase
    .from('inventory_items')
    .select('*, tax_rates(rate)')
    .eq('item_type', 'service')
    .eq('course_id', courseId)
    .is('deleted_at', null)

  if (levelId !== null) {
    query = query.eq('level_id', levelId)
  } else {
    // If no level specified, fetch the course‑level fee (level_id IS NULL)
    query = query.is('level_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createOrUpdateCourseFee = async (payload) => {
  // payload: { id?, course_id, level_id, unit_price, tax_rate_id, hsn_sac_code,
  //            branch_id, financial_year_id, organization_id, item_name, description, is_active }
  const { id, ...rest } = payload
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
    query = query.eq('level_id', levelId)
  } else {
    query = query.is('level_id', null)
  }

  const { data, error } = await query.limit(1)
  if (error) throw error
  return data?.[0] || null
}

// ---------- Student creation and management ----------
// Create a full student with parent, enrollment, and fee.
// IMPORTANT: feeData must include 'service_id' (and optionally base_fee, tax_rate, tax_amount)
// We recommend using getFeeItemForAdmission to populate these fields.
export const createStudent = async (payload) => {
  const { studentData, parentData, enrollmentData, feeData } = payload
  let parentId = null

  // 1. Parent
  if (parentData) {
    const { data: parent, error } = await supabase.from('parents').insert(parentData).select().single()
    if (error) throw error
    parentId = parent.id
  }

  // 2. Student
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({ ...studentData, parent_id: parentId })
    .select()
    .single()
  if (studentError) throw studentError

  // 3. Enrollment
  if (enrollmentData) {
    const { error } = await supabase.from('student_enrollments').insert({
      ...enrollmentData,
      student_id: student.id,
    })
    if (error) throw error
  }

  // 4. Fee
  if (feeData) {
    // Ensure we have service_id; if not, you may want to fetch it using getFeeItemForAdmission
    const { error } = await supabase.from('student_fees').insert({
      ...feeData,
      student_id: student.id,
    })
    if (error) throw error
  }

  return student
}

// Update student main fields
export const updateStudent = async (id, data) => {
  const { error } = await supabase.from('students').update(data).eq('id', id)
  if (error) throw error
}

// Update parent
export const updateParent = async (id, data) => {
  const { error } = await supabase.from('parents').update(data).eq('id', id)
  if (error) throw error
}

// Upsert enrollment
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

// Update fee (now using service_id, not course_fee_id)
export const updateFee = async (id, data) => {
  const { error } = await supabase.from('student_fees').update(data).eq('id', id)
  if (error) throw error
}

// Add fee payment
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