// src/pages/studentportal/StudentAttendance.jsx
import { Card, Table, Tag, Spin, Alert, Calendar, Badge, Row, Col, Tooltip } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const StudentAttendance = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  const { data: attendanceRecords, isLoading: attLoading, error } = useQuery({
    queryKey: ['student-attendance', studentId],
    queryFn: async () => {
      if (!studentId) return []
      const { data: sessions, error: sessionErr } = await supabase
        .from('attendance_sessions')
        .select('id, attendance_date')
        .order('attendance_date', { ascending: false })
      if (sessionErr) throw sessionErr

      const sessionIds = sessions?.map(s => s.id) || []
      if (sessionIds.length === 0) return []

      const { data, error } = await supabase
        .from('student_attendance')
        .select('status, remarks, session_id')
        .in('session_id', sessionIds)
        .eq('student_id', studentId)
      if (error) throw error

      // Build map
      const sessionMap = new Map(sessions.map(s => [s.id, s.attendance_date]))
      return (data || []).map(rec => ({
        ...rec,
        date: sessionMap.get(rec.session_id)
      })).sort((a,b) => new Date(b.date) - new Date(a.date))
    },
    enabled: !!studentId,
  })

  if (studentLoading || attLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (error) return <Alert message="Error loading attendance" description={error.message} type="error" showIcon />

  // Build a map date -> aggregated status (present > late > absent)
  const statusByDate = {}
  ;(attendanceRecords || []).forEach(rec => {
    if (!rec.date) return
    const key = dayjs(rec.date).format('YYYY-MM-DD')
    const current = statusByDate[key]
    if (!current) {
      statusByDate[key] = rec.status
    } else {
      if (rec.status === 'present' || (rec.status === 'late' && current === 'absent')) {
        statusByDate[key] = rec.status
      }
    }
  })

  const dateCellRender = (date) => {
    const key = date.format('YYYY-MM-DD')
    const status = statusByDate[key]
    if (!status) return null
    const color = status === 'present' ? 'green' : status === 'late' ? 'orange' : 'red'
    const text = status === 'present' ? 'Present' : status === 'late' ? 'Late' : 'Absent'
    return (
      <Tooltip title={text}>
        <Badge color={color} text={<span style={{ fontSize: 10 }}>{text[0]}</span>} />
      </Tooltip>
    )
  }

  const columns = [
    { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'present' ? 'green' : s === 'absent' ? 'red' : 'orange'}>{s}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', render: r => r || '-' },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-body, Montserrat)' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={<span style={{ color: primaryColor }}>Attendance Calendar</span>} bordered={false}>
            <Calendar
              fullscreen={false}
              dateCellRender={dateCellRender}
              value={dayjs()}   // optional: current month
            />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ color: primaryColor }}>Attendance List</span>} bordered={false}>
            <Table
              dataSource={attendanceRecords}
              columns={columns}
              rowKey="session_id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'No attendance records' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default StudentAttendance