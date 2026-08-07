import { supabase } from '../lib/supabase'

const formatDateTime = (datetime) => {
  if (!datetime) return { date: null, time: null }
  const parts = datetime.split('T')
  return { date: parts[0] || null, time: parts[1]?.slice(0, 5) || null }
}

export const fetchDemos = async ({ page = 1, pageSize = 10, filters = {}, orgId }) => {
  // Build query on demo_sessions with explicit foreign-key joins
  let query = supabase
    .from('demo_sessions')
    .select(
      `
        *,
        branches!demo_sessions_branch_id_fkey ( branch_name, organization_id ),
        inquiries!demo_sessions_inquiry_id_fkey ( inquiry_no, student_name, mobile, email, interested_course_id ),
        teachers!demo_sessions_teacher_id_fkey ( first_name, last_name )
      `,
      { count: 'exact' }
    )
    .order('scheduled_at', { ascending: false })

  // ✅ Filter by organisation using !inner on the branches relation
  if (orgId) {
    // Use !inner to ensure only rows with matching organisation are returned
    query = supabase
      .from('demo_sessions')
      .select(
        `
          *,
          branches!inner!demo_sessions_branch_id_fkey ( branch_name, organization_id ),
          inquiries!demo_sessions_inquiry_id_fkey ( inquiry_no, student_name, mobile, email, interested_course_id ),
          teachers!demo_sessions_teacher_id_fkey ( first_name, last_name )
        `,
        { count: 'exact' }
      )
      .eq('branches.organization_id', orgId)
      .order('scheduled_at', { ascending: false })
  }

  // Optional branch filter
  if (filters.branch_id) {
    query = query.eq('branch_id', filters.branch_id)
  }

  // Status filter
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  // Search filter
  if (filters.search) {
    query = query.or(
      `inquiries.student_name.ilike.%${filters.search}%,` +
      `inquiries.mobile.ilike.%${filters.search}%,` +
      `inquiries.inquiry_no.ilike.%${filters.search}%`
    )
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  // Map data to frontend format
  const formattedData = data?.map((item) => {
    const scheduled = formatDateTime(item.scheduled_at)
    const conducted = formatDateTime(item.conducted_at)
    return {
      demo_session_id: item.id,
      scheduled_at: item.scheduled_at,
      conducted_at: item.conducted_at,
      status: item.status,
      outcome: item.outcome,
      feedback: item.feedback,
      teacher_id: item.teacher_id,
      inquiry_id: item.inquiry_id,
      duration_minutes: item.duration_minutes,
      attended_by: item.attended_by,
      teacher_remarks: item.teacher_remarks,
      branch_name: item.branches?.branch_name,
      branch_id: item.branch_id,
      inquiry_no: item.inquiries?.inquiry_no,
      student_full_name: item.inquiries?.student_name,
      mobile_no: item.inquiries?.mobile,
      email: item.inquiries?.email,
      course_name: item.inquiries?.interested_course_id,
      teacher_name: item.teachers
        ? `${item.teachers.first_name} ${item.teachers.last_name}`.trim()
        : null,
      scheduled_date: scheduled.date,
      scheduled_time: scheduled.time,
      conducted_date: conducted.date,
      conducted_time: conducted.time,
      rescheduled: item.status === 'Rescheduled' ? 'Yes' : 'No',
      demo_attended_by: item.attended_by,
    }
  }) || []

  return { data: formattedData, count }
}

export const fetchDemo = async (id) => {
  const { data, error } = await supabase
    .from('demo_sessions')
    .select(
      `
        *,
        branches!demo_sessions_branch_id_fkey ( branch_name ),
        inquiries!demo_sessions_inquiry_id_fkey ( inquiry_no, student_name, mobile, email, interested_course_id ),
        teachers!demo_sessions_teacher_id_fkey ( first_name, last_name )
      `
    )
    .eq('id', id)
    .single()

  if (error) throw error

  const scheduled = formatDateTime(data.scheduled_at)
  const conducted = formatDateTime(data.conducted_at)

  return {
    demo_session_id: data.id,
    scheduled_at: data.scheduled_at,
    conducted_at: data.conducted_at,
    status: data.status,
    outcome: data.outcome,
    feedback: data.feedback,
    teacher_id: data.teacher_id,
    inquiry_id: data.inquiry_id,
    duration_minutes: data.duration_minutes,
    attended_by: data.attended_by,
    teacher_remarks: data.teacher_remarks,
    branch_name: data.branches?.branch_name,
    branch_id: data.branch_id,
    inquiry_no: data.inquiries?.inquiry_no,
    student_full_name: data.inquiries?.student_name,
    mobile_no: data.inquiries?.mobile,
    email: data.inquiries?.email,
    course_name: data.inquiries?.interested_course_id,
    teacher_name: data.teachers
      ? `${data.teachers.first_name} ${data.teachers.last_name}`.trim()
      : null,
    scheduled_date: scheduled.date,
    scheduled_time: scheduled.time,
    conducted_date: conducted.date,
    conducted_time: conducted.time,
    rescheduled: data.status === 'Rescheduled' ? 'Yes' : 'No',
    demo_attended_by: data.attended_by,
  }
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
    .from('demo_sessions')
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