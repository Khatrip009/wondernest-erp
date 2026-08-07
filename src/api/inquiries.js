import { supabase } from '../lib/supabase'

// Fetch all inquiries with related data
export const fetchInquiries = async ({ page = 1, pageSize = 10, filters = {} }) => {
  let query = supabase
    .from('inquiries')
    .select(`
      *,
      inquiry_sources ( name ),
      courses ( id, name ),
      demo_sessions ( id, status, scheduled_at, conducted_at, outcome )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.source_id) query = query.eq('source_id', filters.source_id)
  if (filters.course_id) query = query.eq('interested_course_id', filters.course_id)
  if (filters.search) query = query.or(`student_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

// Fetch single inquiry
export const fetchInquiry = async (id) => {
  const { data, error } = await supabase
    .from('inquiries')
    .select(`
      *,
      inquiry_sources ( name ),
      courses ( id, name ),
      demo_sessions ( * )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Fetch inquiry history (timeline) using the view
export const fetchInquiryHistory = async (inquiryId) => {
  try {
    // 1. Get inquiry details
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .select(`
        id,
        inquiry_no,
        student_name,
        parent_name,
        mobile,
        email,
        source,
        status,
        created_at,
        converted_at,
        converted_student_id,
        interested_course_id,
        source_id,
        branch_id,
        demo_scheduled_at,
        remarks,
        followup_date,
        courses ( name ),
        inquiry_sources ( name ),
        branches ( branch_name )
      `)
      .eq('id', inquiryId)
      .single()

    if (inquiryError) {
      console.error('Error fetching inquiry for timeline:', inquiryError)
      throw inquiryError
    }

    // 2. Get demo sessions from the view (already includes teacher_name, course_name, etc.)
    const { data: demos, error: demosError } = await supabase
      .from('demo_sessions_view')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .order('scheduled_at', { ascending: true })

    if (demosError) {
      console.error('Error fetching demos for timeline:', demosError)
      throw demosError
    }

    // 3. Build events array
    const events = []

    // Inquiry Created
    events.push({
      event_type: 'Inquiry Created',
      event_time: inquiry.created_at,
      inquiry_no: inquiry.inquiry_no,
      student_name: inquiry.student_name,
      parent_name: inquiry.parent_name,
      mobile: inquiry.mobile,
      email: inquiry.email,
      source_name: inquiry.inquiry_sources?.name,
      course_name: inquiry.courses?.name,
      branch_name: inquiry.branches?.branch_name,
      current_inquiry_status: inquiry.status,
      remarks: inquiry.remarks,
      followup_date: inquiry.followup_date,
    })

    // Demo events (now from the view)
    demos.forEach(demo => {
      const eventType = demo.status === 'Scheduled' ? 'Demo Scheduled' :
                        demo.status === 'Conducted' ? 'Demo Conducted' : 'Demo Status Unknown'

      events.push({
        event_type: eventType,
        event_time: demo.status === 'Scheduled' ? demo.scheduled_at : demo.conducted_at || demo.scheduled_at,
        demo_scheduled_at: demo.scheduled_at,
        demo_conducted_at: demo.conducted_at,
        demo_current_status: demo.status,
        demo_outcome: demo.outcome,
        demo_feedback: demo.feedback,
        teacher_remarks: demo.teacher_remarks,
        duration_minutes: demo.duration_minutes,
        attended_by: demo.attended_by,
        teacher_name: demo.teacher_name,
        inquiry_no: inquiry.inquiry_no,
        student_name: inquiry.student_name,
        current_inquiry_status: inquiry.status,
      })
    })

    // Converted event
    if (inquiry.converted_at) {
      events.push({
        event_type: 'Converted',
        event_time: inquiry.converted_at,
        converted_at: inquiry.converted_at,
        converted_student_id: inquiry.converted_student_id,
        inquiry_no: inquiry.inquiry_no,
        student_name: inquiry.student_name,
        current_inquiry_status: inquiry.status,
      })
    }

    // Sort by time
    events.sort((a, b) => new Date(a.event_time) - new Date(b.event_time))

    console.log('📜 Timeline events:', events)
    return events
  } catch (error) {
    console.error('fetchInquiryHistory error:', error)
    throw error
  }
}

// Create new inquiry
export const createInquiry = async (payload) => {
  const newInquiry = { ...payload, status: 'Contacted' }
  const { data, error } = await supabase.from('inquiries').insert(newInquiry).select().single()
  if (error) throw error
  return data
}

// Update inquiry
export const updateInquiry = async (id, updates) => {
  const { data, error } = await supabase.from('inquiries').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Delete inquiry (soft delete)
export const deleteInquiry = async (id) => {
  const { error } = await supabase.from('inquiries').update({ deleted_at: new Date() }).eq('id', id)
  if (error) throw error
}

// Schedule a demo
export const scheduleDemo = async ({ inquiryId, teacherId, courseId, batchId, scheduledAt, durationMinutes, notes, branchId }) => {
  const { data: demo, error: demoError } = await supabase
    .from('demo_sessions')
    .insert({
      inquiry_id: inquiryId,
      teacher_id: teacherId,
      course_id: courseId,
      batch_id: batchId,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      teacher_remarks: notes,
      status: 'Scheduled',
      branch_id: branchId,
    })
    .select()
    .single()
  if (demoError) throw demoError

  const { error: updateError } = await supabase
    .from('inquiries')
    .update({ status: 'Demo Scheduled', demo_scheduled_at: scheduledAt })
    .eq('id', inquiryId)
  if (updateError) throw updateError

  return demo
}

// Conduct a demo
export const conductDemo = async (demoId, inquiryId, { outcome, feedback, teacherRemarks, durationMinutes, conductedAt }) => {
  const { error } = await supabase
    .from('demo_sessions')
    .update({
      status: 'Conducted',
      outcome,
      feedback,
      teacher_remarks: teacherRemarks,
      duration_minutes: durationMinutes,
      conducted_at: conductedAt || new Date().toISOString()
    })
    .eq('id', demoId)
  if (error) throw error

  const { error: inquiryError } = await supabase
    .from('inquiries')
    .update({ status: 'Demo Conducted' })
    .eq('id', inquiryId)
  if (inquiryError) throw inquiryError
}

// Fetch inquiry stats – uses inquiries table directly
export const fetchInquiryStats = async ({ branchId, startDate, endDate } = {}) => {
  const inquiryQuery = supabase.from('inquiries').select('status, source_id, interested_course_id', { count: 'exact' })
  if (branchId) inquiryQuery.eq('branch_id', branchId)
  const { data: inquiries, error: inquiryError } = await inquiryQuery
  if (inquiryError) throw inquiryError

  const statusMap = {}
  const sourceMap = {}
  const courseMap = {}

  inquiries?.forEach(inq => {
    statusMap[inq.status] = (statusMap[inq.status] || 0) + 1
    if (inq.source_id) sourceMap[inq.source_id] = (sourceMap[inq.source_id] || 0) + 1
    if (inq.interested_course_id) courseMap[inq.interested_course_id] = (courseMap[inq.interested_course_id] || 0) + 1
  })

  const { data: sources, error: sourceError } = await supabase
    .from('inquiry_sources')
    .select('id, name')
  if (sourceError) throw sourceError

  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, name')
  if (courseError) throw courseError

  const sourceLabels = Object.entries(sourceMap).map(([id, count]) => ({
    id: Number(id),
    name: sources?.find(s => s.id === Number(id))?.name || 'Unknown',
    count
  }))

  const courseLabels = Object.entries(courseMap).map(([id, count]) => ({
    id: Number(id),
    name: courses?.find(c => c.id === Number(id))?.name || 'Unknown',
    count
  }))

  return {
    total: inquiries?.length || 0,
    statusCounts: statusMap,
    sourceDistribution: sourceLabels,
    courseDistribution: courseLabels,
  }
}

// Fetch demo sessions using the view – NO nested joins, all fields from view
export const fetchDemoSessions = async ({ status, branchId, inquiryId, limit = 10, page = 1, pageSize = 10 } = {}) => {
  let query = supabase
    .from('demo_sessions_view')
    .select('*', { count: 'exact' })
    .order('scheduled_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (branchId) query = query.eq('branch_id', branchId)
  if (inquiryId) query = query.eq('inquiry_id', inquiryId)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) {
    console.error('fetchDemoSessions error:', error)
    throw error
  }

  // Format data to match the expected structure (already flat)
  // The view returns all fields, so we just need to map to the component's expected keys
  const formattedData = data?.map(item => ({
    demo_session_id: item.demo_session_id || item.id,
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
    branch_name: item.branch_name,
    inquiry_no: item.inquiry_no,
    student_full_name: item.student_name,
    mobile_no: item.mobile_no,
    email: item.email,
    course_name: item.course_name,
    teacher_name: item.teacher_name,
    scheduled_date: item.scheduled_at ? item.scheduled_at.split('T')[0] : null,
    scheduled_time: item.scheduled_at ? item.scheduled_at.split('T')[1]?.slice(0, 5) : null,
    conducted_date: item.conducted_at ? item.conducted_at.split('T')[0] : null,
    conducted_time: item.conducted_at ? item.conducted_at.split('T')[1]?.slice(0, 5) : null,
    rescheduled: item.status === 'Rescheduled' ? 'Yes' : 'No',
    demo_attended_by: item.attended_by,
  })) || []

  return { data: formattedData, count }
}
