import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/academics'

// ---------- Batches ----------
export const useBatches = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['batches', page, pageSize, filters],
    queryFn: () => api.fetchBatches({ page, pageSize, filters }),
    keepPreviousData: true,
  })
}

export const useBatch = (id) => {
  return useQuery({
    queryKey: ['batch', id],
    queryFn: () => api.fetchBatch(id),
    enabled: !!id,
  })
}

export const useCreateBatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createBatch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  })
}

export const useUpdateBatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => api.updateBatch(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  })
}

export const useDeleteBatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteBatch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  })
}

export const useEnrollments = (batchId) => {
  return useQuery({
    queryKey: ['enrollments', batchId],
    queryFn: () => api.fetchEnrollments(batchId),
    enabled: !!batchId,
  })
}

export const useAssignStudent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.assignStudentToBatch,
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['enrollments', variables.batch_id] })
      qc.invalidateQueries({ queryKey: ['batch', variables.batch_id] })
    },
  })
}

export const useRemoveStudent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.removeStudentFromBatch,
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['batch'] })
    },
  })
}

// ---------- Homework ----------
export const useHomeworkList = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['homework-list', page, pageSize, filters],
    queryFn: () => api.fetchHomeworkList({ page, pageSize, filters }),
    keepPreviousData: true,
  })
}

export const useHomework = (id) => {
  return useQuery({
    queryKey: ['homework', id],
    queryFn: () => api.fetchHomework(id),
    enabled: !!id,
  })
}

export const useCreateHomework = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createHomework,
    onSuccess: () => {
      qc.invalidateQueries(['homework-list'])
    },
  })
}

export const useUpdateHomework = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.updateHomework(id, payload),
    onSuccess: (data, variables) => {
      qc.invalidateQueries(['homework-list'])
      qc.invalidateQueries(['homework', variables.id])
    },
  })
}

export const useDeleteHomework = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteHomework,
    onSuccess: () => {
      qc.invalidateQueries(['homework-list'])
    },
  })
}

// ---------- Submissions ----------
export const useSubmissions = (homeworkId) => {
  return useQuery({
    queryKey: ['submissions', homeworkId],
    queryFn: () => api.fetchSubmissions(homeworkId),
    enabled: !!homeworkId,
  })
}

export const useGradeSubmission = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ submissionId, marks, remarks }) =>
      api.gradeSubmission(submissionId, marks, remarks),
    onSuccess: (data, variables) => {
      qc.invalidateQueries(['submissions', variables.homeworkId])
    },
  })
}

// ---------- Exams ----------
export const useExams = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['exams', page, pageSize, filters],
    queryFn: () => api.fetchExams({ page, pageSize, filters }),
    keepPreviousData: true,
  })
}

export const useExam = (id) => {
  return useQuery({
    queryKey: ['exam', id],
    queryFn: () => api.fetchExam(id),
    enabled: !!id,
  })
}

export const useCreateExam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createExam,
    onSuccess: () => qc.invalidateQueries(['exams']),
  })
}

export const useUpdateExam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.updateExam(id, payload),
    onSuccess: (data, variables) => {
      qc.invalidateQueries(['exams'])
      qc.invalidateQueries(['exam', variables.id])
    },
  })
}

export const useDeleteExam = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteExam,
    onSuccess: () => qc.invalidateQueries(['exams']),
  })
}

export const useExamResults = (examId) => {
  return useQuery({
    queryKey: ['exam-results', examId],
    queryFn: () => api.fetchResultsForExam(examId),
    enabled: !!examId,
  })
}

export const useUpsertResult = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.upsertResult,
    onSuccess: (data, variables) => {
      qc.invalidateQueries(['exam-results', variables.exam_id])
    },
  })
}

// ---------- Results Summary ----------
export const useBatchResults = (batchId) => {
  return useQuery({
    queryKey: ['batch-results', batchId],
    queryFn: () => api.fetchBatchResults(batchId),
    enabled: !!batchId,
  })
}

export const useBatchSummary = (batchId) => {
  return useQuery({
    queryKey: ['batch-summary', batchId],
    queryFn: () => api.fetchBatchSummary(batchId),
    enabled: !!batchId,
  })
}

// ---------- Certificates ----------
export const useCertificates = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['certificates', page, pageSize, filters],
    queryFn: () => api.fetchCertificates({ page, pageSize, filters }),
    keepPreviousData: true,
  })
}

export const useCertificate = (id) => {
  return useQuery({
    queryKey: ['certificate', id],
    queryFn: () => api.fetchCertificate(id),
    enabled: !!id,
  })
}

export const useGenerateCertificate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.generateCertificate,
    onSuccess: () => {
      qc.invalidateQueries(['certificates'])
    },
  })
}

export const useRevokeCertificate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.revokeCertificate,
    onSuccess: () => {
      qc.invalidateQueries(['certificates'])
    },
  })
}

// ---------- Attendance ----------
export const useAttendanceSessions = (page, pageSize, filters) => {
  return useQuery({
    queryKey: ['attendance-sessions', page, pageSize, filters],
    queryFn: () => api.fetchAttendanceSessions({ page, pageSize, filters }),
    keepPreviousData: true,
  })
}

export const useAttendanceSession = (id) => {
  return useQuery({
    queryKey: ['attendance-session', id],
    queryFn: () => api.fetchAttendanceSession(id),
    enabled: !!id,
  })
}

export const useCreateAttendanceSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createAttendanceSession,
    onSuccess: () => qc.invalidateQueries(['attendance-sessions']),
  })
}

export const useUpdateAttendanceSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.updateAttendanceSession(id, payload),
    onSuccess: () => qc.invalidateQueries(['attendance-sessions']),
  })
}

export const useDeleteAttendanceSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteAttendanceSession,
    onSuccess: () => qc.invalidateQueries(['attendance-sessions']),
  })
}

// ✅ Attendance Records for a session
export const useAttendanceRecords = (sessionId) => {
  return useQuery({
    queryKey: ['attendance-records', sessionId],
    queryFn: () => api.fetchAttendanceForSession(sessionId),
    enabled: !!sessionId,
  })
}

// ✅ Upsert (save) attendance records
export const useUpsertAttendance = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.upsertStudentAttendance,
    onSuccess: (data, variables) => {
      // variables is the array of records; get session_id from first record
      if (variables && variables.length > 0) {
        qc.invalidateQueries(['attendance-records', variables[0].session_id])
      }
      qc.invalidateQueries(['attendance-sessions'])
    },
  })
}

// ✅ Students for a batch (for taking attendance)
export const useStudentsForAttendance = (batchId) => {
  return useQuery({
    queryKey: ['students-attendance', batchId],
    queryFn: () => api.fetchStudentsForAttendance(batchId),
    enabled: !!batchId,
  })
}

export const upsertStudentAttendance = async (records) => {
  // records: array of { session_id, student_id, status, remarks, branch_id, financial_year_id }
  if (!records || records.length === 0) return []
  const results = []
  for (const item of records) {
    // Check if a record exists for this session and student
    const { data: existing, error: findError } = await supabase
      .from('student_attendance')
      .select('id')
      .eq('session_id', item.session_id)
      .eq('student_id', item.student_id)
      .maybeSingle()
    if (findError) throw findError

    let data
    if (existing) {
      // Update existing
      const { data: updateData, error: updateError } = await supabase
        .from('student_attendance')
        .update({
          status: item.status,
          remarks: item.remarks,
          branch_id: item.branch_id,
          financial_year_id: item.financial_year_id,
          check_in: item.check_in || null,
          check_out: item.check_out || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
      if (updateError) throw updateError
      data = updateData?.[0]
    } else {
      // Insert new
      const { data: insertData, error: insertError } = await supabase
        .from('student_attendance')
        .insert({
          session_id: item.session_id,
          student_id: item.student_id,
          status: item.status || 'present',
          remarks: item.remarks || '',
          branch_id: item.branch_id,
          financial_year_id: item.financial_year_id,
          check_in: item.check_in || null,
          check_out: item.check_out || null,
        })
        .select()
      if (insertError) throw insertError
      data = insertData?.[0]
    }
    results.push(data)
  }
  return results
}

// ---------- Attendance Report ----------
export const useAttendanceReport = (filters) => {
  return useQuery({
    queryKey: ['attendance-report', filters],
    queryFn: () => api.fetchAttendanceReport(filters),
    enabled: true,
  })
}

export const useExamResultsReport = (filters) => {
  return useQuery({
    queryKey: ['exam-results-report', filters],
    queryFn: () => api.fetchExamResultsReport(filters),
    enabled: true,
  })
}
export const useBatchStudentList = (filters) => {
  return useQuery({
    queryKey: ['batch-student-list', filters],
    queryFn: () => api.fetchBatchStudentList(filters),
    enabled: true,
  })
}