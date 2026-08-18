// src/pages/studentportal/StudentDashboard.jsx
import { Card, Row, Col, Statistic, Typography, Skeleton, Alert, Table, Tag, Button, Space, Spin } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  CalendarOutlined,
  FileTextOutlined,
  LineChartOutlined,
  BookOutlined,
  UserOutlined,
} from '@ant-design/icons'

const StudentDashboard = () => {
  const { user } = useAuth()
  const { theme, darkMode } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const { data: student, isLoading: studentLoading, error: studentError } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  const { data: enrollment } = useQuery({
    queryKey: ['student-enrollment', studentId],
    queryFn: async () => {
      if (!studentId) return null
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          batch_id,
          enrollment_date,
          batches (
            batch_name,
            days,
            start_time,
            end_time,
            courses ( name )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!studentId,
  })

  const { data: homeworkCount = 0 } = useQuery({
    queryKey: ['student-homework-count', studentId],
    queryFn: async () => {
      if (!studentId) return 0
      const batchId = enrollment?.batch_id
      if (!batchId) return 0
      const { data, error } = await supabase
        .from('homework')
        .select('id', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .gte('due_date', dayjs().format('YYYY-MM-DD'))
      if (error) throw error
      return data?.count || 0
    },
    enabled: !!studentId && !!enrollment?.batch_id,
  })

  const { data: attendanceSummaryData = { present: 0, total: 0, percentage: 0 } } = useQuery({
    queryKey: ['student-attendance-summary', studentId],
    queryFn: async () => {
      if (!studentId) return { present: 0, total: 0, percentage: 0 }
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')
      const { data: sessions, error: sessionErr } = await supabase
        .from('attendance_sessions')
        .select('id')
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth)
      if (sessionErr) throw sessionErr

      const sessionIds = sessions?.map(s => s.id) || []
      if (sessionIds.length === 0) return { present: 0, total: 0, percentage: 0 }

      const { data: attendance, error: attErr } = await supabase
        .from('student_attendance')
        .select('status')
        .in('session_id', sessionIds)
        .eq('student_id', studentId)
      if (attErr) throw attErr

      const total = attendance?.length || 0
      const present = attendance?.filter(a => a.status === 'present').length || 0
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0
      return { present, total, percentage }
    },
    enabled: !!studentId,
  })

  const { data: recentResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['student-recent-results', studentId],
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('student_results')
        .select(`
          marks_obtained,
          grade,
          exams ( exam_name, exam_date, total_marks, subjects ( subject_name ) )
        `)
        .eq('student_id', studentId)
        .order('id', { ascending: false })
        .limit(5)
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
  })

  if (studentLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (studentError) {
    return <Alert message="Error loading student profile" description={studentError.message} type="error" showIcon />
  }

  if (!student) {
    return <Alert message="Student record not found" type="warning" showIcon />
  }

  const batchName = enrollment?.batches?.batch_name || 'Not Assigned'
  const courseName = enrollment?.batches?.courses?.name || 'Not Assigned'

  const attendanceSummary = attendanceSummaryData || { present: 0, total: 0, percentage: 0 }

  return (
    <div style={{ fontFamily: fontBody, padding: 8 }}>
      <Card
        style={{ marginBottom: 16, borderTop: `4px solid ${primaryColor}`, backgroundColor: cardBg }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 48, color: primaryColor }}><UserOutlined /></div>
          <div>
            <h2 style={{ margin: 0, color: primaryColor, fontFamily: fontHeading }}>{student.full_name_formatted}</h2>
            <p style={{ margin: 0, color: textColor }}>{courseName} | {batchName}</p>
            <p style={{ margin: 0, color: textColor }}>Admission No: {student.admission_no}</p>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Attendance This Month</span>}
              value={attendanceSummary.percentage}
              suffix="%"
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
            <div style={{ fontSize: 12, color: textColor }}>
              {attendanceSummary.present} / {attendanceSummary.total} days present
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Pending Homework</span>}
              value={homeworkCount}
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Recent Exams</span>}
              value={recentResults.length}
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Overall Grade</span>}
              value={recentResults[0]?.grade || 'N/A'}
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Recent Results</span>}
        style={{ marginTop: 16, borderTop: `4px solid ${primaryColor}`, backgroundColor: cardBg }}
      >
        <Table
          dataSource={recentResults}
          rowKey="id"
          loading={resultsLoading}
          pagination={false}
          columns={[
            { title: 'Exam', dataIndex: ['exams', 'exam_name'] },
            { title: 'Subject', dataIndex: ['exams', 'subjects', 'subject_name'] },
            { title: 'Marks', dataIndex: 'marks_obtained' },
            { title: 'Grade', dataIndex: 'grade' },
          ]}
        />
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        <Link to="/student/attendance"><Button icon={<CalendarOutlined />}>View Attendance</Button></Link>
        <Link to="/student/results"><Button icon={<LineChartOutlined />}>View Results</Button></Link>
      </div>
    </div>
  )
}

export default StudentDashboard