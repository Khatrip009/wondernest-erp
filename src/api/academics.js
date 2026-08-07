import { supabase } from '../lib/supabase'

// ---------- Batches ----------
export const fetchBatches = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('batches')
    .select(`
      *,
      courses ( id, name ),
      teachers ( id, first_name, last_name )
    `, { count: 'exact' })
    .order('batch_name')
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters.course_id) query = query.eq('course_id', filters.course_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.teacher_id) query = query.eq('teacher_id', filters.teacher_id)
  if (filters.search) {
    query = query.or(`batch_name.ilike.%${filters.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

export const fetchBatch = async (id) => {
  const { data, error } = await supabase
    .from('batches')
    .select(`
      *,
      courses ( id, name ),
      teachers ( id, first_name, last_name ),
      student_enrollments (
        id,
        student_id,
        enrollment_date,
        status,
        students ( id, full_name_formatted, admission_no, mobile )
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createBatch = async (payload) => {
  const { data, error } = await supabase.from('batches').insert(payload).select().single()
  if (error) throw error
  return data
}

export const updateBatch = async (id, updates) => {
  const { data, error } = await supabase.from('batches').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteBatch = async (id) => {
  const { error } = await supabase.from('batches').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ---------- Student Enrollments ----------
export const fetchEnrollments = async (batchId) => {
  const { data, error } = await supabase
    .from('student_enrollments')
    .select(`
      *,
      students ( id, full_name_formatted, admission_no, mobile )
    `)
    .eq('batch_id', batchId)
    .eq('status', 'active')
    .order('enrollment_date', { ascending: false })
  if (error) throw error
  return data
}

export const assignStudentToBatch = async (payload) => {
  const { data, error } = await supabase.from('student_enrollments').insert(payload).select().single()
  if (error) throw error
  return data
}

export const removeStudentFromBatch = async (enrollmentId) => {
  const { error } = await supabase.from('student_enrollments').update({ status: 'inactive' }).eq('id', enrollmentId)
  if (error) throw error
}

// ---------- Homework ----------
export const fetchHomeworkList = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('homework')
    .select(`
      *,
      batches ( batch_name ),
      subjects ( subject_name ),
      teachers ( first_name, last_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters.batch_id) query = query.eq('batch_id', filters.batch_id)
  if (filters.subject_id) query = query.eq('subject_id', filters.subject_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

export const fetchHomework = async (id) => {
  const { data, error } = await supabase
    .from('homework')
    .select(`
      *,
      batches ( id, batch_name ),
      subjects ( id, subject_name ),
      teachers ( id, first_name, last_name )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createHomework = async (payload) => {
  const { data, error } = await supabase
    .from('homework')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateHomework = async (id, payload) => {
  const { data, error } = await supabase
    .from('homework')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteHomework = async (id) => {
  const { error } = await supabase
    .from('homework')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---------- Submissions ----------
export const fetchSubmissions = async (homeworkId) => {
  const { data, error } = await supabase
    .from('homework_submissions')
    .select(`
      *,
      students ( id, full_name_formatted, admission_no )
    `)
    .eq('homework_id', homeworkId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return data
}

export const gradeSubmission = async (submissionId, marks, remarks) => {
  const { data, error } = await supabase
    .from('homework_submissions')
    .update({ marks, remarks, status: 'Graded' })
    .eq('id', submissionId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- File Upload ----------
export const uploadHomeworkFile = async (file, folder = 'homework') => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { error } = await supabase.storage
    .from('ShreeVidhya_Academy')
    .upload(filePath, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('ShreeVidhya_Academy')
    .getPublicUrl(filePath)

  return publicUrl
}

// ---------- Exams ----------
export const fetchExams = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('exams')
    .select(`
      *,
      batches ( batch_name ),
      subjects ( subject_name )
    `, { count: 'exact' })
    .order('exam_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters.batch_id) query = query.eq('batch_id', filters.batch_id)
  if (filters.subject_id) query = query.eq('subject_id', filters.subject_id)
  if (filters.search) query = query.or(`exam_name.ilike.%${filters.search}%`)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

export const fetchExam = async (id) => {
  const { data, error } = await supabase
    .from('exams')
    .select(`
      *,
      batches ( id, batch_name ),
      subjects ( id, subject_name )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createExam = async (payload) => {
  const { data, error } = await supabase
    .from('exams')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateExam = async (id, payload) => {
  const { data, error } = await supabase
    .from('exams')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteExam = async (id) => {
  const { error } = await supabase
    .from('exams')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---------- Exam Results ----------
export const fetchResultsForExam = async (examId) => {
  const { data, error } = await supabase
    .from('student_results')
    .select(`
      *,
      students ( id, full_name_formatted, admission_no )
    `)
    .eq('exam_id', examId)
    .order('id')
  if (error) throw error
  return data
}

export const upsertResult = async (result) => {
  const { data, error } = await supabase
    .from('student_results')
    .upsert(result, { onConflict: 'exam_id, student_id' })
    .select()
  if (error) throw error
  return data
}

// ---------- Results Summary ----------
export const fetchBatchResults = async (batchId) => {
  const { data: exams, error: examsErr } = await supabase
    .from('exams')
    .select('id, exam_name, subject_id, total_marks, subjects ( subject_name )')
    .eq('batch_id', batchId)
  if (examsErr) throw examsErr

  const { data: enrollments, error: enrollErr } = await supabase
    .from('student_enrollments')
    .select('student_id, students ( id, full_name_formatted, admission_no )')
    .eq('batch_id', batchId)
    .eq('status', 'active')
  if (enrollErr) throw enrollErr
  const students = enrollments.map(e => e.students)

  const examIds = exams.map(e => e.id)
  const { data: results, error: resultsErr } = await supabase
    .from('student_results')
    .select('*')
    .in('exam_id', examIds)
  if (resultsErr) throw resultsErr

  const resultsMap = {}
  results.forEach(r => {
    if (!resultsMap[r.student_id]) resultsMap[r.student_id] = {}
    resultsMap[r.student_id][r.exam_id] = r.marks_obtained
  })

  const report = students.map(student => {
    let totalObtained = 0, totalPossible = 0
    const examDetails = exams.map(exam => {
      const obtained = resultsMap[student.id]?.[exam.id] ?? 0
      const possible = exam.total_marks
      totalObtained += obtained
      totalPossible += possible
      return { exam_name: exam.exam_name, obtained, possible }
    })
    const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0
    const grade = getGrade(percentage)
    return { ...student, examDetails, totalObtained, totalPossible, percentage, grade }
  })

  return { students: report, exams }
}

// ---------- Batch Summary ----------
export const fetchBatchSummary = async (batchId) => {
  const { data: exams, error: examsErr } = await supabase
    .from('exams')
    .select('id, exam_name, subject_id, total_marks, subjects ( subject_name )')
    .eq('batch_id', batchId)
  if (examsErr) throw examsErr

  const { data: enrollments, error: enrollErr } = await supabase
    .from('student_enrollments')
    .select('student_id, students ( id, full_name_formatted, admission_no )')
    .eq('batch_id', batchId)
    .eq('status', 'active')
  if (enrollErr) throw enrollErr
  const students = enrollments.map(e => e.students)

  const examIds = exams.map(e => e.id)
  const { data: results, error: resultsErr } = await supabase
    .from('student_results')
    .select('*')
    .in('exam_id', examIds)
  if (resultsErr) throw resultsErr

  const report = students.map(student => {
    const studentResults = results.filter(r => r.student_id === student.id)
    let totalObtained = 0, totalPossible = 0
    studentResults.forEach(r => {
      const exam = exams.find(e => e.id === r.exam_id)
      if (exam) {
        totalObtained += r.marks_obtained
        totalPossible += exam.total_marks
      }
    })
    const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0
    const grade = getGrade(percentage)
    return { ...student, totalObtained, totalPossible, percentage, grade }
  })

  const totalStudents = report.length
  const avgPercentage = totalStudents > 0 ? report.reduce((sum, s) => sum + s.percentage, 0) / totalStudents : 0
  const topStudent = totalStudents > 0 ? report.reduce((a, b) => a.percentage > b.percentage ? a : b) : null
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  report.forEach(s => gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1)

  return { students: report, exams, stats: { totalStudents, avgPercentage, topStudent, gradeDistribution } }
}

function getGrade(percentage) {
  if (percentage >= 90) return 'A'
  if (percentage >= 75) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 45) return 'D'
  return 'F'
}

// ---------- Certificates ----------
export const fetchCertificates = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('certificates')
    .select(`
      *,
      students ( full_name_formatted, admission_no ),
      course:courses!certificates_course_id_fkey ( name ),
      level:courses!certificates_level_id_fkey ( name )
    `, { count: 'exact' })
    .order('issue_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters.student_id) query = query.eq('student_id', filters.student_id)
  if (filters.course_id) query = query.eq('course_id', filters.course_id)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id)
  if (filters.search) {
    query = query.or(`students.full_name_formatted.ilike.%${filters.search}%,certificate_no.ilike.%${filters.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const mappedData = data?.map(item => ({
    ...item,
    courses: item.course,
    levels: item.level,
  })) || []

  return { data: mappedData, count }
}

export const fetchCertificate = async (id) => {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      students ( full_name_formatted, admission_no, mobile, email ),
      course:courses!certificates_course_id_fkey ( name ),
      level:courses!certificates_level_id_fkey ( name )
    `)
    .eq('id', id)
    .single()
  if (error) throw error

  return {
    ...data,
    courses: data.course,
    levels: data.level,
  }
}

export const generateCertificate = async (payload) => {
  const now = new Date()
  const year = now.getFullYear()
  const { data: countData } = await supabase
    .from('certificates')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', payload.branch_id)
  const seq = (countData?.length || 0) + 1
  const certNo = `CERT-${year}-${String(seq).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('certificates')
    .insert({ ...payload, certificate_no: certNo })
    .select()
    .single()
  if (error) throw error
  return data
}

export const revokeCertificate = async (id) => {
  const { error } = await supabase
    .from('certificates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---------- Attendance ----------
export const fetchAttendanceSessions = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('attendance_sessions')
    .select(`
      *,
      batches ( batch_name ),
      teachers ( first_name, last_name )
    `, { count: 'exact' })
    .order('attendance_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters.batch_id) query = query.eq('batch_id', filters.batch_id)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id)
  if (filters.search) query = query.or(`topic_covered.ilike.%${filters.search}%`)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

export const fetchAttendanceSession = async (id) => {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select(`
      *,
      batches ( batch_name ),
      teachers ( first_name, last_name )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createAttendanceSession = async (payload) => {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateAttendanceSession = async (id, payload) => {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteAttendanceSession = async (id) => {
  const { error } = await supabase
    .from('attendance_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export const fetchAttendanceForSession = async (sessionId) => {
  const { data, error } = await supabase
    .from('student_attendance')
    .select(`
      id,
      student_id,
      status,
      remarks,
      check_in,
      check_out,
      students ( id, full_name_formatted, admission_no )
    `)
    .eq('session_id', sessionId)
  if (error) throw error
  return data
}

export const upsertStudentAttendance = async (records) => {
  // records: array of { session_id, student_id, status, remarks, branch_id, financial_year_id }
  if (!records || records.length === 0) return []
  const results = []
  for (const item of records) {
    const { data, error } = await supabase
      .from('student_attendance')
      .upsert({
        session_id: item.session_id,
        student_id: item.student_id,
        status: item.status || 'present',
        remarks: item.remarks || '',
        branch_id: item.branch_id,
        financial_year_id: item.financial_year_id,
        check_in: item.check_in || null,
        check_out: item.check_out || null,
      }, { onConflict: 'session_id, student_id' })
      .select()
    if (error) throw error
    results.push(data?.[0])
  }
  return results
}

// Alias for convenience
export const upsertAttendance = upsertStudentAttendance

// ---------- Students for Attendance ----------
export const fetchStudentsForAttendance = async (batchId) => {
  if (!batchId) return []
  const { data, error } = await supabase
    .from('student_enrollments')
    .select(`
      student_id,
      students ( id, full_name_formatted, admission_no )
    `)
    .eq('batch_id', batchId)
    .eq('status', 'active')
  if (error) throw error
  return data.map(e => e.students)
}

// ---------- Attendance Report ----------
export const fetchAttendanceReport = async ({ date_from, date_to, batch_id, teacher_id, branch_id, financial_year_id } = {}) => {
  // 1. Fetch sessions
  let sessionQuery = supabase
    .from('attendance_sessions')
    .select(`
      id,
      attendance_date,
      start_time,
      end_time,
      topic_covered,
      batch_id,
      teacher_id,
      batches ( id, batch_name, course_id, courses ( id, name ) ),
      teachers ( id, first_name, last_name )
    `)
    .order('attendance_date', { ascending: false })

  if (date_from) sessionQuery = sessionQuery.gte('attendance_date', date_from)
  if (date_to) sessionQuery = sessionQuery.lte('attendance_date', date_to)
  if (batch_id) sessionQuery = sessionQuery.eq('batch_id', batch_id)
  if (teacher_id) sessionQuery = sessionQuery.eq('teacher_id', teacher_id)
  if (branch_id) sessionQuery = sessionQuery.eq('branch_id', branch_id)
  if (financial_year_id) sessionQuery = sessionQuery.eq('financial_year_id', financial_year_id)

  const { data: sessions, error: sessionError } = await sessionQuery
  if (sessionError) throw sessionError

  if (!sessions || sessions.length === 0) return []

  // 2. Get all student_attendance records for these sessions
  const sessionIds = sessions.map(s => s.id)
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from('student_attendance')
    .select(`
      id,
      session_id,
      student_id,
      status,
      remarks,
      students ( id, full_name_formatted, admission_no )
    `)
    .in('session_id', sessionIds)

  if (attendanceError) throw attendanceError

  // 3. For each session, fetch all students enrolled in its batch (active enrollments)
  const batchIds = [...new Set(sessions.map(s => s.batch_id).filter(Boolean))]
  let allStudents = []
  if (batchIds.length > 0) {
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select(`
        batch_id,
        students ( id, full_name_formatted, admission_no )
      `)
      .in('batch_id', batchIds)
      .eq('status', 'active')

    if (enrollError) throw enrollError

    // Group students by batch
    const batchStudentMap = {}
    enrollments.forEach(enr => {
      if (!batchStudentMap[enr.batch_id]) batchStudentMap[enr.batch_id] = []
      batchStudentMap[enr.batch_id].push(enr.students)
    })

    // 4. Build the report: for each session, combine attendance records with batch students
    const report = sessions.map(session => {
      const batchStudents = batchStudentMap[session.batch_id] || []
      const sessionAttendance = attendanceRecords.filter(r => r.session_id === session.id)

      // Create a map for quick lookup
      const statusMap = {}
      sessionAttendance.forEach(rec => {
        statusMap[rec.student_id] = {
          status: rec.status || 'absent',
          remarks: rec.remarks || '',
          student: rec.students,
        }
      })

      // Build student list for this session (including all batch students)
      const students = batchStudents.map(student => {
        const att = statusMap[student.id] || { status: 'absent', remarks: '', student }
        return {
          student_id: student.id,
          student: att.student || student,
          status: att.status,
          remarks: att.remarks,
        }
      })

      return {
        ...session,
        students,
        total_students: students.length,
        present_count: students.filter(s => s.status === 'present').length,
        absent_count: students.filter(s => s.status === 'absent').length,
        late_count: students.filter(s => s.status === 'late').length,
        excused_count: students.filter(s => s.status === 'excused').length,
        attendance_percentage: students.length > 0 ? Math.round((students.filter(s => s.status === 'present').length / students.length) * 100) : 0,
      }
    })

    return report
  }

  return []
}

// ---------- Exam Results Report ----------
export const fetchExamResultsReport = async ({ exam_id, batch_id, branch_id, financial_year_id } = {}) => {
  console.log('📊 fetchExamResultsReport called with:', { exam_id, batch_id, branch_id, financial_year_id })

  // Build query for exams
  let query = supabase
    .from('exams')
    .select(`
      id,
      exam_name,
      exam_date,
      total_marks,
      subject_id,
      batch_id,
      batches ( id, batch_name ),
      subjects ( id, subject_name )
    `)

  if (exam_id) query = query.eq('id', exam_id)
  if (batch_id) query = query.eq('batch_id', batch_id)
  if (branch_id) query = query.eq('branch_id', branch_id)
  if (financial_year_id) query = query.eq('financial_year_id', financial_year_id)

  query = query.order('exam_date', { ascending: false })

  const { data: exams, error: examsError } = await query
  if (examsError) {
    console.error('❌ Exams query error:', examsError)
    throw examsError
  }
  console.log(`📚 Found ${exams?.length || 0} exams`)

  if (!exams || exams.length === 0) return []

  // Get batch IDs from exams
  const batchIds = [...new Set(exams.map(e => e.batch_id).filter(Boolean))]
  console.log('📦 Batch IDs:', batchIds)

  // Fetch students for those batches
  let batchStudentMap = {}
  if (batchIds.length > 0) {
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select(`
        batch_id,
        students ( id, full_name_formatted, admission_no )
      `)
      .in('batch_id', batchIds)
      .eq('status', 'active')

    if (enrollError) {
      console.error('❌ Enrollments query error:', enrollError)
      throw enrollError
    }

    enrollments.forEach(enr => {
      if (!batchStudentMap[enr.batch_id]) batchStudentMap[enr.batch_id] = []
      batchStudentMap[enr.batch_id].push(enr.students)
    })
    console.log('👨‍🎓 Students per batch:', Object.keys(batchStudentMap).length, 'batches with students')
  }

  // Get results for these exams
  const examIds = exams.map(e => e.id)
  const { data: results, error: resultsError } = await supabase
    .from('student_results')
    .select(`
      exam_id,
      student_id,
      marks_obtained,
      grade,
      remarks
    `)
    .in('exam_id', examIds)

  if (resultsError) {
    console.error('❌ Results query error:', resultsError)
    throw resultsError
  }
  console.log(`📝 Found ${results?.length || 0} result records`)

  // Build result map
  const resultMap = {}
  results.forEach(r => {
    if (!resultMap[r.exam_id]) resultMap[r.exam_id] = {}
    resultMap[r.exam_id][r.student_id] = {
      marks_obtained: r.marks_obtained,
      grade: r.grade,
      remarks: r.remarks || '',
    }
  })

  // Build report
  const report = exams.map(exam => {
    const students = batchStudentMap[exam.batch_id] || []
    const studentResults = students.map(student => {
      const res = resultMap[exam.id]?.[student.id] || { marks_obtained: null, grade: '', remarks: '' }
      return {
        ...student,
        marks_obtained: res.marks_obtained,
        grade: res.grade,
        remarks: res.remarks,
        is_present: res.marks_obtained !== null && res.marks_obtained !== undefined,
      }
    })

    return {
      ...exam,
      students: studentResults,
      total_students: studentResults.length,
      students_with_marks: studentResults.filter(s => s.is_present).length,
    }
  })

  console.log('✅ Report built with', report.length, 'exams')
  return report
}

// ---------- Batchwise Student List ----------
// ---------- Batch-wise Student List Report ----------
export const fetchBatchStudentList = async ({ batch_id, branch_id, financial_year_id } = {}) => {
  // If batch_id is provided, use it; otherwise fetch all batches for the branch
  let query = supabase
    .from('batches')
    .select(`
      id,
      batch_name,
      start_date,
      end_date,
      status,
      course_id,
      courses ( id, name ),
      teacher_id,
      teachers ( first_name, last_name ),
      student_enrollments (
        student_id,
        enrollment_date,
        students ( id, full_name_formatted, admission_no, mobile, email, dob, gender, address, city, state, pincode )
      )
    `)
    .eq('status', 'active')
    .order('batch_name')

  if (batch_id) query = query.eq('id', batch_id)
  if (branch_id) query = query.eq('branch_id', branch_id)
  if (financial_year_id) query = query.eq('financial_year_id', financial_year_id)

  const { data, error } = await query
  if (error) throw error

  // Process each batch: extract students from enrollments
  const report = data.map(batch => {
    const enrollments = batch.student_enrollments || []
    const students = enrollments
      .filter(e => e.students) // ensure student exists
      .map(e => ({
        ...e.students,
        enrollment_date: e.enrollment_date,
      }))

    return {
      ...batch,
      students,
      total_students: students.length,
    }
  })

  return report
}