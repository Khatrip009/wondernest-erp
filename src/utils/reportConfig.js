// src/utils/reportConfig.js
import { supabase } from '../lib/supabase';

export const reportTypes = {
  // ──────────────────────────────────────────────
  // 1. Student Enrollment Report
  // ──────────────────────────────────────────────
  student_enrollment: {
    id: 'student_enrollment',
    title: 'Student Enrollment Report',
    description: 'Students enrolled within a date range, with course, batch & medium',
    useLetterhead: true,
    fields: ['start_date', 'end_date', 'course_id', 'batch_id'],
    defaultFilters: () => ({}),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_enrollments')
        .select(`
          enrollment_date,
          status,
          students!inner ( admission_no, first_name, last_name, mobile, organization_id ),
          batches!inner ( batch_name, course_id, courses(name) )
        `);
      if (filters.start_date) q = q.gte('enrollment_date', filters.start_date);
      if (filters.end_date)   q = q.lte('enrollment_date', filters.end_date);
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.batch_id)  q = q.eq('batch_id', filters.batch_id);
      if (filters.course_id) q = q.eq('batches.course_id', filters.course_id);
      return q;
    },
    transform: (data) => data.map(r => ({
      enrollment_date: r.enrollment_date
        ? new Date(r.enrollment_date).toLocaleDateString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          }).replace(/\//g, '-')
        : '—',
      admission_no: r.students?.admission_no ?? '—',
      name: r.students ? `${r.students.first_name} ${r.students.last_name}` : '—',
      mobile: r.students?.mobile ?? '—',
      batch: r.batches?.batch_name ?? '',
      course: r.batches?.courses?.name ?? '',
      status: r.status ?? '',
    })),
    columns: [
      { header: 'Enroll Date', accessor: 'enrollment_date' },
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student Name', accessor: 'name' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Batch', accessor: 'batch' },
      { header: 'Course', accessor: 'course' },
      { header: 'Status', accessor: 'status' },
    ],
  },

  // ──────────────────────────────────────────────
  // 2. Active / Inactive Student List
  // ──────────────────────────────────────────────
  student_status_list: {
    id: 'student_status_list',
    title: 'Active / Inactive Student List',
    description: 'Filter students by current status (active, inactive, etc.)',
    useLetterhead: true,
    fields: ['status', 'batch_id', 'course_id'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('students')
        .select('admission_no, first_name, last_name, mobile, status')
        .order('first_name');
      if (orgId) q = q.eq('organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.status) q = q.eq('status', filters.status);
      return q;
    },
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'First Name', accessor: 'first_name' },
      { header: 'Last Name', accessor: 'last_name' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Status', accessor: 'status' },
    ],
  },

  // ──────────────────────────────────────────────
  // 3. Batch Capacity Utilisation (FIXED)
  // ──────────────────────────────────────────────
  batch_capacity: {
    id: 'batch_capacity',
    title: 'Batch Capacity Utilisation',
    description: 'Shows enrolled / capacity for each batch',
    useLetterhead: true,
    fields: ['course_id', 'batch_id'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('batches')
        .select(`
          id,
          batch_name,
          capacity,
          student_enrollments ( id, status )
        `);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.batch_id) q = q.eq('id', filters.batch_id);
      if (filters.course_id) q = q.eq('course_id', filters.course_id);
      return q;
    },
    transform: (data) => data.map(b => {
      const enrollments = b.student_enrollments || [];
      const activeCount = enrollments.filter(e => e.status === 'active').length;
      return {
        batch: b.batch_name,
        capacity: b.capacity,
        enrolled: activeCount,
        available: b.capacity - activeCount,
        utilisation: (((activeCount) / (b.capacity || 1)) * 100).toFixed(1) + '%',
      };
    }),
    columns: [
      { header: 'Batch', accessor: 'batch' },
      { header: 'Capacity', accessor: 'capacity' },
      { header: 'Enrolled', accessor: 'enrolled' },
      { header: 'Available', accessor: 'available' },
      { header: 'Utilisation', accessor: 'utilisation' },
    ],
    chartConfig: { type: 'bar', dataKey: 'enrolled', labelKey: 'batch' },
  },

  // ──────────────────────────────────────────────
  // 4. Student‑Parent Mapping
  // ──────────────────────────────────────────────
  student_parents: {
    id: 'student_parents',
    title: 'Student‑Parent Mapping',
    description: 'Shows parent details for each student',
    useLetterhead: true,
    fields: ['student_name'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('students')
        .select(`
          admission_no, first_name, last_name,
          parents!parent_id ( father_name, mother_name, mobile, email )
        `);
      if (orgId) q = q.eq('organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      return q;
    },
    transform: (data) => data.map(r => ({
      admission_no: r.admission_no,
      student: `${r.first_name} ${r.last_name}`.trim(),
      father: r.parents?.father_name ?? '—',
      mother: r.parents?.mother_name ?? '—',
      mobile: r.parents?.mobile ?? '—',
      email: r.parents?.email ?? '—',
    })),
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Father', accessor: 'father' },
      { header: 'Mother', accessor: 'mother' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Email', accessor: 'email' },
    ],
  },

  // ──────────────────────────────────────────────
  // 5. Inquiry Conversion Report
  // ──────────────────────────────────────────────
  inquiry_conversion: {
    id: 'inquiry_conversion',
    title: 'Inquiry Conversion Report',
    description: 'Full inquiry list with conversion summary at top',
    useLetterhead: true,
    fields: ['status', 'source', 'start_date', 'end_date'],
    defaultFilters: () => ({}),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (filters.start_date) q = q.gte('created_at', filters.start_date + 'T00:00:00');
      if (filters.end_date)   q = q.lte('created_at', filters.end_date + 'T23:59:59');
      if (orgId) q = q.eq('organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.source) q = q.eq('source', filters.source);
      return q;
    },
    transform: (data) => data.map(row => ({
      inquiry_no: row.inquiry_no,
      created: row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN') : '—',
      student: row.student_name || '',
      parent: row.parent_name || '',
      mobile: row.mobile || '',
      course: row.courses?.name || '',
      source: row.source || '',
      status: row.status || '',
      followup: row.followup_date ? new Date(row.followup_date).toLocaleDateString('en-IN') : '—',
    })),
    columns: [
      { header: 'Inquiry No', accessor: 'inquiry_no' },
      { header: 'Created', accessor: 'created' },
      { header: 'Student', accessor: 'student' },
      { header: 'Parent', accessor: 'parent' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Course', accessor: 'course' },
      { header: 'Source', accessor: 'source' },
      { header: 'Status', accessor: 'status' },
      { header: 'Follow‑up', accessor: 'followup' },
    ],
  },

  // ──────────────────────────────────────────────
  // 6. Student Documents Report
  // ──────────────────────────────────────────────
  student_documents: {
    id: 'student_documents',
    title: 'Student Documents Report',
    description: 'Documents uploaded per student',
    useLetterhead: true,
    fields: ['document_type'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_documents')
        .select(`
          document_type, file_name, uploaded_at,
          students ( admission_no, first_name, last_name, organization_id )
        `)
        .order('uploaded_at', { ascending: false });
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.document_type) q = q.eq('document_type', filters.document_type);
      return q;
    },
    transform: (data) => data.map(r => ({
      admission_no: r.students?.admission_no ?? '—',
      name: r.students ? `${r.students.first_name} ${r.students.last_name}` : '—',
      document_type: r.document_type,
      file_name: r.file_name,
      uploaded: r.uploaded_at,
    })),
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'name' },
      { header: 'Type', accessor: 'document_type' },
      { header: 'File', accessor: 'file_name' },
      { header: 'Uploaded', accessor: 'uploaded' },
    ],
  },

  // ──────────────────────────────────────────────
  // 7. Attendance Summary (Batch)
  // ──────────────────────────────────────────────
  attendance_summary: {
    id: 'attendance_summary',
    title: 'Attendance Summary (Batch)',
    description: 'Total present/absent sessions per batch',
    useLetterhead: true,
    fields: ['start_date', 'end_date', 'batch_id'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_attendance')
        .select(`
          status,
          attendance_sessions!inner ( attendance_date, batch_id )
        `)
        .gte('attendance_sessions.attendance_date', filters.start_date)
        .lte('attendance_sessions.attendance_date', filters.end_date);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.batch_id) q = q.eq('attendance_sessions.batch_id', filters.batch_id);
      return q;
    },
    transform: (raw) => {
      const map = {};
      raw.forEach(r => {
        const bid = r.attendance_sessions?.batch_id;
        if (!bid) return;
        if (!map[bid]) map[bid] = { batch_id: bid, total: 0, present: 0 };
        map[bid].total++;
        if (r.status === 'present') map[bid].present++;
      });
      return Object.values(map).map(b => ({
        batch: `Batch ${b.batch_id}`,
        total_sessions: b.total,
        present: b.present,
        absent: b.total - b.present,
        percentage: ((b.present / b.total) * 100).toFixed(1),
      }));
    },
    columns: [
      { header: 'Batch', accessor: 'batch' },
      { header: 'Total Sessions', accessor: 'total_sessions' },
      { header: 'Present', accessor: 'present' },
      { header: 'Absent', accessor: 'absent' },
      { header: 'Attendance %', accessor: 'percentage' },
    ],
    chartConfig: { type: 'bar', dataKey: 'percentage', labelKey: 'batch' },
  },

  // ──────────────────────────────────────────────
  // 8. Student Attendance Percentage
  // ──────────────────────────────────────────────
  student_attendance_pct: {
    id: 'student_attendance_pct',
    title: 'Student Attendance Percentage',
    description: 'Each student’s attendance % in a batch over a period',
    useLetterhead: true,
    fields: ['batch_id', 'start_date', 'end_date'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_attendance')
        .select(`
          status, student_id,
          students ( admission_no, first_name, last_name, organization_id ),
          attendance_sessions!inner ( attendance_date, batch_id )
        `)
        .gte('attendance_sessions.attendance_date', filters.start_date)
        .lte('attendance_sessions.attendance_date', filters.end_date);
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.batch_id) q = q.eq('attendance_sessions.batch_id', filters.batch_id);
      return q;
    },
    transform: (raw) => {
      const map = {};
      raw.forEach(r => {
        const sid = r.student_id;
        if (!map[sid]) {
          map[sid] = {
            student_id: sid,
            admission_no: r.students?.admission_no ?? '—',
            name: r.students ? `${r.students.first_name} ${r.students.last_name}`.trim() : '—',
            total: 0, present: 0,
          };
        }
        map[sid].total++;
        if (r.status === 'present') map[sid].present++;
      });
      return Object.values(map).map(s => ({
        admission_no: s.admission_no,
        student: s.name,
        total: s.total,
        present: s.present,
        absent: s.total - s.present,
        percentage: ((s.present / s.total) * 100).toFixed(1),
      }));
    },
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Total', accessor: 'total' },
      { header: 'Present', accessor: 'present' },
      { header: 'Absent', accessor: 'absent' },
      { header: '%', accessor: 'percentage' },
    ],
  },

  // ──────────────────────────────────────────────
  // 9. Homework Submission Report
  // ──────────────────────────────────────────────
  homework_submissions: {
    id: 'homework_submissions',
    title: 'Homework Submission Report',
    description: 'Submission status per homework / student',
    useLetterhead: true,
    fields: ['batch_id', 'status', 'start_date', 'end_date'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('homework_submissions')
        .select(`
          submitted_at, status, marks,
          homework!inner ( title, assigned_date, batch_id ),
          students!inner ( admission_no, first_name, last_name, organization_id )
        `)
        .order('submitted_at', { ascending: false });
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.batch_id) q = q.eq('homework.batch_id', filters.batch_id);
      if (filters.start_date) q = q.gte('homework.assigned_date', filters.start_date);
      if (filters.end_date)   q = q.lte('homework.assigned_date', filters.end_date);
      return q;
    },
    transform: (data) => data.map(r => ({
      homework: r.homework?.title ?? '—',
      assigned: r.homework?.assigned_date ?? '',
      student: `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim(),
      admission_no: r.students?.admission_no ?? '—',
      submitted: r.submitted_at,
      marks: r.marks,
      status: r.status,
    })),
    columns: [
      { header: 'Homework', accessor: 'homework' },
      { header: 'Assigned', accessor: 'assigned' },
      { header: 'Student', accessor: 'student' },
      { header: 'Adm No', accessor: 'admission_no' },
      { header: 'Submitted', accessor: 'submitted' },
      { header: 'Marks', accessor: 'marks' },
      { header: 'Status', accessor: 'status' },
    ],
  },

  // ──────────────────────────────────────────────
  // 10. Exam Results
  // ──────────────────────────────────────────────
  exam_results: {
    id: 'exam_results',
    title: 'Exam Results',
    description: 'Marks obtained by each student per exam',
    useLetterhead: true,
    fields: ['exam_id', 'batch_id'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_results')
        .select(`
          marks_obtained,
          exams!inner ( exam_name, exam_date, batch_id ),
          students!inner ( admission_no, first_name, last_name, organization_id )
        `)
        .order('marks_obtained', { ascending: false });
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.exam_id) q = q.eq('exam_id', filters.exam_id);
      if (filters.batch_id) q = q.eq('exams.batch_id', filters.batch_id);
      return q;
    },
    transform: (data) => data.map(r => ({
      exam: r.exams?.exam_name ?? '',
      date: r.exams?.exam_date ?? '',
      student: `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim(),
      admission_no: r.students?.admission_no ?? '—',
      marks: r.marks_obtained,
    })),
    columns: [
      { header: 'Exam', accessor: 'exam' },
      { header: 'Date', accessor: 'date' },
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Marks', accessor: 'marks', aggregate: 'avg' },
    ],
    aggregateRow: true,
  },

  // ──────────────────────────────────────────────
  // 11. Student Progress Report
  // ──────────────────────────────────────────────
  student_progress: {
    id: 'student_progress',
    title: 'Student Progress Report',
    description: 'Attendance & performance scores from enrollments',
    useLetterhead: true,
    fields: ['batch_id', 'start_date', 'end_date'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_enrollments')
        .select(`
          evaluation_date, attendance_percentage, performance_score, teacher_remarks,
          students ( admission_no, first_name, last_name, organization_id ),
          batches ( batch_name )
        `)
        .order('evaluation_date', { ascending: false });
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.batch_id) q = q.eq('batch_id', filters.batch_id);
      if (filters.start_date) q = q.gte('evaluation_date', filters.start_date);
      if (filters.end_date)   q = q.lte('evaluation_date', filters.end_date);
      return q;
    },
    transform: (data) => data.map(r => ({
      date: r.evaluation_date,
      student: `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim(),
      admission_no: r.students?.admission_no ?? '—',
      batch: r.batches?.batch_name ?? '',
      attendance_pct: r.attendance_percentage,
      performance: r.performance_score,
      remarks: r.teacher_remarks,
    })),
    columns: [
      { header: 'Date', accessor: 'date' },
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Batch', accessor: 'batch' },
      { header: 'Att %', accessor: 'attendance_pct' },
      { header: 'Score', accessor: 'performance', aggregate: 'avg' },
      { header: 'Remarks', accessor: 'remarks' },
    ],
    aggregateRow: true,
  },

  // ──────────────────────────────────────────────
  // 12. Online Class Attendance
  // ──────────────────────────────────────────────
  online_class_attendance: {
    id: 'online_class_attendance',
    title: 'Online Class Attendance',
    description: 'Who joined which online class and for how long',
    useLetterhead: true,
    fields: ['class_id', 'start_date', 'end_date'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('online_class_attendance')
        .select(`
          joined_at, left_at, duration_seconds, attended,
          online_classes!inner ( title, start_time ),
          students!inner ( admission_no, first_name, last_name, organization_id )
        `)
        .order('joined_at');
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.class_id) q = q.eq('class_id', filters.class_id);
      if (filters.start_date) q = q.gte('online_classes.start_time', filters.start_date);
      if (filters.end_date)   q = q.lte('online_classes.start_time', filters.end_date);
      return q;
    },
    transform: (data) => data.map(r => ({
      class: r.online_classes?.title ?? '',
      class_time: r.online_classes?.start_time ?? '',
      student: `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim(),
      admission_no: r.students?.admission_no ?? '—',
      joined: r.joined_at,
      left: r.left_at,
      duration_sec: r.duration_seconds,
      attended: r.attended ? 'Yes' : 'No',
    })),
    columns: [
      { header: 'Class', accessor: 'class' },
      { header: 'Class Time', accessor: 'class_time' },
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Joined', accessor: 'joined' },
      { header: 'Left', accessor: 'left' },
      { header: 'Duration (s)', accessor: 'duration_sec' },
      { header: 'Attended', accessor: 'attended' },
    ],
  },

  // ──────────────────────────────────────────────
  // 13. Fee Collection Report (FIXED)
  // ──────────────────────────────────────────────
  fee_collection: {
    id: 'fee_collection',
    title: 'Fee Collection Report',
    description: 'Payments collected in a date range, with course breakdown and tax',
    useLetterhead: true,
    fields: ['start_date', 'end_date', 'course_id'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('fee_payments')
        .select(`
          payment_date,
          amount,
          payment_mode,
          student_fees!inner (
            base_fee,
            tax_amount,
            final_fee,
            students!inner (
              admission_no, first_name, last_name, organization_id
            ),
            inventory_items!student_fees_service_id_fkey!inner (
              item_name,
              course_id,
              courses!inner ( name )
            )
          )
        `)
        .gte('payment_date', filters.start_date)
        .lte('payment_date', filters.end_date)
        .order('payment_date');

      if (orgId) q = q.eq('student_fees.students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.course_id) q = q.eq('student_fees.inventory_items.course_id', filters.course_id);

      return q;
    },
    transform: (data) => data.map(r => ({
      date: r.payment_date,
      admission_no: r.student_fees?.students?.admission_no ?? '—',
      student: `${r.student_fees?.students?.first_name ?? ''} ${r.student_fees?.students?.last_name ?? ''}`.trim(),
      course: r.student_fees?.inventory_items?.courses?.name ?? '',
      base: r.student_fees?.base_fee ?? 0,
      tax: r.student_fees?.tax_amount ?? 0,
      total: r.student_fees?.final_fee ?? 0,
      paid: r.amount,
      mode: r.payment_mode,
    })),
    columns: [
      { header: 'Date', accessor: 'date' },
      { header: 'Adm No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Course', accessor: 'course' },
      { header: 'Base', accessor: 'base' },
      { header: 'Tax', accessor: 'tax' },
      { header: 'Total Fee', accessor: 'total' },
      { header: 'Paid', accessor: 'paid', aggregate: 'sum' },
      { header: 'Mode', accessor: 'mode' },
    ],
    aggregateRow: true,
    chartConfig: { type: 'bar', dataKey: 'paid', labelKey: 'course' },
  },

  // ──────────────────────────────────────────────
  // 14. Pending Fees Report (FIXED)
  // ──────────────────────────────────────────────
  pending_fees: {
    id: 'pending_fees',
    title: 'Pending Fees Report',
    description: 'Students with outstanding balance (status != Paid)',
    useLetterhead: true,
    fields: ['course_id'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_fees')
        .select(`
          final_fee,
          status,
          students!inner ( admission_no, first_name, last_name, organization_id ),
          inventory_items!student_fees_service_id_fkey!inner (
            course_id,
            courses!inner ( name )
          ),
          fee_payments ( amount )
        `)
        .neq('status', 'Paid')
        .is('deleted_at', null);

      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.course_id) q = q.eq('inventory_items.course_id', filters.course_id);

      return q;
    },
    transform: (data) => data.map(r => {
      const paid = (r.fee_payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const balance = Math.max(Number(r.final_fee || 0) - paid, 0);
      return {
        admission_no: r.students?.admission_no ?? '—',
        student: `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim(),
        course: r.inventory_items?.courses?.name ?? '',
        total_fee: r.final_fee,
        paid,
        balance,
        status: r.status,
      };
    }),
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Course', accessor: 'course' },
      { header: 'Total Fee', accessor: 'total_fee', aggregate: 'sum' },
      { header: 'Paid', accessor: 'paid', aggregate: 'sum' },
      { header: 'Balance', accessor: 'balance', aggregate: 'sum' },
      { header: 'Status', accessor: 'status' },
    ],
    aggregateRow: true,
  },

  // ──────────────────────────────────────────────
  // 15. Income Statement
  // ──────────────────────────────────────────────
  income_statement: {
    id: 'income_statement',
    title: 'Income Statement',
    description: 'Income records with tax breakdown',
    useLetterhead: true,
    fields: ['start_date', 'end_date', 'category'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('income').select('*')
        .gte('income_date', filters.start_date)
        .lte('income_date', filters.end_date)
        .order('income_date');
      if (orgId) q = q.eq('organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.category) q = q.eq('category', filters.category);
      return q;
    },
    columns: [
      { header: 'Date', accessor: 'income_date' },
      { header: 'Category', accessor: 'category' },
      { header: 'Base Amount', accessor: 'base_amount' },
      { header: 'Tax Amount', accessor: 'tax_amount' },
      { header: 'Amount', accessor: 'amount', aggregate: 'sum' },
      { header: 'Mode', accessor: 'payment_mode' },
      { header: 'Description', accessor: 'description' },
    ],
    aggregateRow: true,
    chartConfig: { type: 'bar', dataKey: 'amount', labelKey: 'category' },
  },

  // ──────────────────────────────────────────────
  // 16. Expense Statement
  // ──────────────────────────────────────────────
  expense_statement: {
    id: 'expense_statement',
    title: 'Expense Statement',
    description: 'Expenses filtered by category / date',
    useLetterhead: true,
    fields: ['start_date', 'end_date', 'category'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('expenses').select('*')
        .gte('expense_date', filters.start_date)
        .lte('expense_date', filters.end_date)
        .order('expense_date');
      if (orgId) q = q.eq('organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.category) q = q.eq('category', filters.category);
      return q;
    },
    columns: [
      { header: 'Date', accessor: 'expense_date' },
      { header: 'Category', accessor: 'category' },
      { header: 'Amount', accessor: 'amount', aggregate: 'sum' },
      { header: 'Payment Mode', accessor: 'payment_mode' },
      { header: 'Description', accessor: 'description' },
      { header: 'Bill No', accessor: 'bill_number' },
    ],
    aggregateRow: true,
    chartConfig: { type: 'bar', dataKey: 'amount', labelKey: 'category' },
  },

  // ──────────────────────────────────────────────
  // 17. Profit & Loss Summary
  // ──────────────────────────────────────────────
  profit_loss_summary: {
    id: 'profit_loss_summary',
    title: 'Profit & Loss Summary',
    description: 'Total income vs expenses for a period',
    useLetterhead: true,
    fields: ['start_date', 'end_date'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: async (filters, branchId, financialYearId, orgId) => {
      const getSum = async (table, dateCol) => {
        let query = supabase.from(table).select('amount')
          .gte(dateCol, filters.start_date)
          .lte(dateCol, filters.end_date);
        if (orgId) query = query.eq('organization_id', orgId);
        if (branchId) query = query.eq('branch_id', branchId);
        if (financialYearId) query = query.eq('financial_year_id', financialYearId);
        const { data } = await query;
        return (data || []).reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
      };
      const [income, expense] = await Promise.all([
        getSum('income', 'income_date'),
        getSum('expenses', 'expense_date'),
      ]);
      return { income, expense, profit: income - expense };
    },
    transform: (data) => [data],
    columns: [
      { header: 'Total Income', accessor: 'income' },
      { header: 'Total Expenses', accessor: 'expense' },
      { header: 'Profit', accessor: 'profit' },
    ],
  },

  // ──────────────────────────────────────────────
  // 18. Tax Collected Report
  // ──────────────────────────────────────────────
  tax_collected: {
    id: 'tax_collected',
    title: 'Tax Collected Report',
    description: 'Tax amounts from fee payments and other income for a given period',
    useLetterhead: true,
    fields: ['start_date', 'end_date'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: async (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('tax_collections').select('amount, category')
        .gte('collection_date', filters.start_date)
        .lte('collection_date', filters.end_date);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      const { data } = await q;
      const feeTax = (data || []).filter(r => r.category === 'fee_payment').reduce((s, r) => s + Number(r.amount), 0);
      const otherTax = (data || []).filter(r => r.category === 'income').reduce((s, r) => s + Number(r.amount), 0);
      return {
        fee_tax: feeTax,
        other_tax: otherTax,
        total_tax: feeTax + otherTax,
        period: `${filters.start_date} to ${filters.end_date}`,
      };
    },
    transform: (data) => [data],
    columns: [
      { header: 'Fee Tax', accessor: 'fee_tax' },
      { header: 'Income Tax', accessor: 'other_tax' },
      { header: 'Total Tax', accessor: 'total_tax' },
      { header: 'Period', accessor: 'period' },
    ],
  },

  // ──────────────────────────────────────────────
  // 19. Receipts Journal
  // ──────────────────────────────────────────────
  receipts_journal: {
    id: 'receipts_journal',
    title: 'Receipts Journal',
    description: 'All receipts issued within a date range',
    useLetterhead: true,
    fields: ['start_date', 'end_date', 'student_id'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('receipts')
        .select(`
          receipt_no, receipt_date, amount,
          students ( admission_no, first_name, last_name, organization_id )
        `)
        .gte('receipt_date', filters.start_date)
        .lte('receipt_date', filters.end_date)
        .order('receipt_date');
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.student_id) q = q.eq('student_id', filters.student_id);
      return q;
    },
    transform: (data) => data.map(r => ({
      receipt_no: r.receipt_no,
      date: r.receipt_date,
      admission_no: r.students?.admission_no ?? '—',
      student: r.students ? `${r.students.first_name} ${r.students.last_name}` : '—',
      amount: r.amount,
    })),
    columns: [
      { header: 'Receipt No', accessor: 'receipt_no' },
      { header: 'Date', accessor: 'date' },
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Amount', accessor: 'amount', aggregate: 'sum' },
    ],
    aggregateRow: true,
  },

  // ──────────────────────────────────────────────
  // 20. Teacher Salary Report
  // ──────────────────────────────────────────────
  teacher_salary: {
    id: 'teacher_salary',
    title: 'Teacher Salary Report',
    description: 'Salary payments made to teachers, filtered by month/year',
    useLetterhead: true,
    fields: ['teacher_id', 'start_date', 'end_date'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('salary_payments')
        .select(`
          payment_date, amount, payment_mode, remarks,
          teachers!inner ( employee_code, first_name, last_name )
        `)
        .gte('payment_date', filters.start_date)
        .lte('payment_date', filters.end_date)
        .order('payment_date');
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.teacher_id) q = q.eq('teacher_id', filters.teacher_id);
      return q;
    },
    transform: (data) => data.map(r => ({
      date: r.payment_date,
      employee_code: r.teachers?.employee_code ?? '',
      teacher: r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '',
      amount: r.amount,
      mode: r.payment_mode,
      remarks: r.remarks,
    })),
    columns: [
      { header: 'Date', accessor: 'date' },
      { header: 'Emp Code', accessor: 'employee_code' },
      { header: 'Teacher', accessor: 'teacher' },
      { header: 'Amount', accessor: 'amount', aggregate: 'sum' },
      { header: 'Mode', accessor: 'mode' },
      { header: 'Remarks', accessor: 'remarks' },
    ],
    aggregateRow: true,
    chartConfig: { type: 'bar', dataKey: 'amount', labelKey: 'teacher' },
  },

  // ──────────────────────────────────────────────
  // 21. Teacher Workload Report
  // ──────────────────────────────────────────────
  teacher_workload: {
    id: 'teacher_workload',
    title: 'Teacher Workload Report',
    description: 'How many batches, courses, levels, and subjects each teacher handles',
    useLetterhead: true,
    fields: [],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('teachers')
        .select(`
          employee_code, first_name, last_name,
          teacher_batches ( batch_id ),
          teacher_courses ( course_id ),
          teacher_course_levels ( course_level_id ),
          teacher_subjects ( subject_id )
        `);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      return q;
    },
    transform: (data) => data.map(t => ({
      name: `${t.first_name} ${t.last_name}`,
      emp_code: t.employee_code,
      batches: (t.teacher_batches || []).length,
      courses: (t.teacher_courses || []).length,
      levels: (t.teacher_course_levels || []).length,
      subjects: (t.teacher_subjects || []).length,
    })),
    columns: [
      { header: 'Employee Code', accessor: 'emp_code' },
      { header: 'Teacher', accessor: 'name' },
      { header: 'Batches', accessor: 'batches' },
      { header: 'Courses', accessor: 'courses' },
      { header: 'Levels', accessor: 'levels' },
      { header: 'Subjects', accessor: 'subjects' },
    ],
  },

  // ──────────────────────────────────────────────
  // 22. Certificate Issued Report
  // ──────────────────────────────────────────────
  certificates_issued: {
    id: 'certificates_issued',
    title: 'Certificate Issued Report',
    description: 'All certificates issued with student and course details',
    useLetterhead: true,
    fields: ['start_date', 'end_date', 'course_id'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('certificates')
        .select(`
          certificate_no, issue_date, certificate_url,
          students ( admission_no, first_name, last_name, organization_id ),
          courses!course_id ( name )
        `)
        .gte('issue_date', filters.start_date)
        .lte('issue_date', filters.end_date)
        .order('issue_date');
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.course_id) q = q.eq('course_id', filters.course_id);
      return q;
    },
    transform: (data) => data.map(r => ({
      cert_no: r.certificate_no,
      date: r.issue_date,
      admission_no: r.students?.admission_no ?? '—',
      student: r.students ? `${r.students.first_name} ${r.students.last_name}` : '—',
      course: r.courses?.name ?? '',
      url: r.certificate_url,
    })),
    columns: [
      { header: 'Certificate No', accessor: 'cert_no' },
      { header: 'Issue Date', accessor: 'date' },
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Course', accessor: 'course' },
      { header: 'Link', accessor: 'url' },
    ],
  },

  // ──────────────────────────────────────────────
  // 23. Student Level Completion
  // ──────────────────────────────────────────────
  student_level_completion: {
    id: 'student_level_completion',
    title: 'Student Level Completion',
    description: 'Progress through course levels with grades',
    useLetterhead: true,
    fields: ['course_id', 'level_id'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_level_progress')
        .select(`
          start_date, completion_date, marks, grade, result,
          students ( admission_no, first_name, last_name, organization_id ),
          level:level_id ( name ),
          course:course_id ( name )
        `)
        .order('completion_date', { ascending: false });
      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.course_id) q = q.eq('course_id', filters.course_id);
      if (filters.level_id) q = q.eq('level_id', filters.level_id);
      return q;
    },
    transform: (data) => data.map(r => ({
      admission_no: r.students?.admission_no ?? '—',
      student: r.students ? `${r.students.first_name} ${r.students.last_name}` : '—',
      course: r.course?.name ?? '',
      level: r.level?.name ?? '',
      start: r.start_date,
      completed: r.completion_date,
      marks: r.marks,
      grade: r.grade,
      result: r.result,
    })),
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Course', accessor: 'course' },
      { header: 'Level', accessor: 'level' },
      { header: 'Started', accessor: 'start' },
      { header: 'Completed', accessor: 'completed' },
      { header: 'Marks', accessor: 'marks' },
      { header: 'Grade', accessor: 'grade' },
      { header: 'Result', accessor: 'result' },
    ],
  },

  // ──────────────────────────────────────────────
  // 24. Student Contact Directory
  // ──────────────────────────────────────────────
  student_contact_directory: {
    id: 'student_contact_directory',
    title: 'Student Contact Directory',
    description: 'Professional contact list with admission, guardian, and status details',
    useLetterhead: true,
    fields: ['status'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('students')
        .select(`
          admission_no, first_name, last_name, mobile, email, gender, status,
          parents!parent_id ( father_name, mother_name, mobile, email )
        `)
        .order('first_name');
      if (orgId) q = q.eq('organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.status) q = q.eq('status', filters.status);
      return q;
    },
    transform: (data) => data.map(s => {
      const parent = s.parents || {};
      return {
        admission_no: s.admission_no,
        student: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        gender: s.gender || '',
        mobile: s.mobile || '',
        email: s.email || '',
        guardian: parent.father_name || parent.mother_name || '',
        guardian_mobile: parent.mobile || '',
        status: s.status || '',
      };
    }),
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Gender', accessor: 'gender' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Email', accessor: 'email' },
      { header: 'Guardian', accessor: 'guardian' },
      { header: 'Guardian Mobile', accessor: 'guardian_mobile' },
      { header: 'Status', accessor: 'status' },
    ],
  },

  // ──────────────────────────────────────────────
  // 25. Admission Pipeline
  // ──────────────────────────────────────────────
  admission_pipeline: {
    id: 'admission_pipeline',
    title: 'Admission Pipeline',
    description: 'Lead pipeline with follow-up dates, source, status and interested course',
    useLetterhead: true,
    fields: ['status', 'source', 'start_date', 'end_date'],
    defaultFilters: () => ({
      start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }),
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('inquiries')
        .select(`
          inquiry_no, student_name, parent_name, mobile, source, status,
          followup_date, created_at,
          courses!interested_course_id ( name )
        `)
        .is('deleted_at', null)
        .order('followup_date', { ascending: true });
      if (filters.start_date) q = q.gte('created_at', filters.start_date + 'T00:00:00');
      if (filters.end_date)   q = q.lte('created_at', filters.end_date + 'T23:59:59');
      if (orgId) q = q.eq('organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.source) q = q.eq('source', filters.source);
      return q;
    },
    transform: (data) => data.map(row => {
      const createdDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
        : '';
      return {
        inquiry_no: row.inquiry_no,
        created: createdDate,
        student: row.student_name || '',
        parent: row.parent_name || '',
        mobile: row.mobile || '',
        course: row.courses?.name || '',
        source: row.source || '',
        status: row.status || '',
        followup: row.followup_date || '',
      };
    }),
    columns: [
      { header: 'Inquiry No', accessor: 'inquiry_no' },
      { header: 'Created', accessor: 'created' },
      { header: 'Student', accessor: 'student' },
      { header: 'Parent', accessor: 'parent' },
      { header: 'Mobile', accessor: 'mobile' },
      { header: 'Course', accessor: 'course' },
      { header: 'Source', accessor: 'source' },
      { header: 'Status', accessor: 'status' },
      { header: 'Follow-up', accessor: 'followup' },
    ],
    pdfConfig: { orientation: 'landscape', includeLetterhead: false, showHeader: true, showFooter: true, pageSize: 'a4', fontSize: 8, headerFontSize: 14, footerFontSize: 8 },
  },

  // ──────────────────────────────────────────────
  // 26. Fee Aging Analysis (FIXED)
  // ──────────────────────────────────────────────
  fee_aging_analysis: {
    id: 'fee_aging_analysis',
    title: 'Fee Aging Analysis',
    description: 'Outstanding student balances grouped by age since fee creation',
    useLetterhead: true,
    fields: ['status', 'course_id'],
    queryBuilder: (filters, branchId, financialYearId, orgId) => {
      let q = supabase.from('student_fees')
        .select(`
          id,
          final_fee,
          status,
          created_at,
          students!inner ( admission_no, first_name, last_name, organization_id ),
          fee_payments ( amount ),
          inventory_items!student_fees_service_id_fkey!inner (
            course_id,
            courses!inner ( name )
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (orgId) q = q.eq('students.organization_id', orgId);
      if (branchId) q = q.eq('branch_id', branchId);
      if (financialYearId) q = q.eq('financial_year_id', financialYearId);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.course_id) q = q.eq('inventory_items.course_id', filters.course_id);

      return q;
    },
    transform: (data) => {
      const now = new Date();
      return data.map(fee => {
        const paid = (fee.fee_payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const balance = Math.max(Number(fee.final_fee || 0) - paid, 0);
        const created = fee.created_at ? new Date(fee.created_at) : now;
        const ageDays = Math.max(0, Math.floor((now - created) / 86400000));
        const ageBucket = ageDays <= 30 ? '0-30 days' : ageDays <= 60 ? '31-60 days' : ageDays <= 90 ? '61-90 days' : '90+ days';
        return {
          admission_no: fee.students?.admission_no || '',
          student: `${fee.students?.first_name || ''} ${fee.students?.last_name || ''}`.trim(),
          course: fee.inventory_items?.courses?.name || '',
          final_fee: Number(fee.final_fee || 0),
          paid,
          balance,
          status: fee.status,
          age_days: ageDays,
          age_bucket: ageBucket,
        };
      }).filter(row => row.balance > 0);
    },
    columns: [
      { header: 'Admission No', accessor: 'admission_no' },
      { header: 'Student', accessor: 'student' },
      { header: 'Course', accessor: 'course' },
      { header: 'Final Fee', accessor: 'final_fee', aggregate: 'sum' },
      { header: 'Paid', accessor: 'paid', aggregate: 'sum' },
      { header: 'Balance', accessor: 'balance', aggregate: 'sum' },
      { header: 'Status', accessor: 'status' },
      { header: 'Age Days', accessor: 'age_days' },
      { header: 'Age Bucket', accessor: 'age_bucket' },
    ],
    aggregateRow: true,
    chartConfig: { type: 'bar', dataKey: 'balance', labelKey: 'student' },
  },
};

export function getReportConfig(id) {
  return reportTypes[id];
}