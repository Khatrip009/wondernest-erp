// src/pages/studentportal/StudentTimetable.jsx
import { Card, Table, Spin, Typography, Alert } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const DAY_ORDER = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

const normalizeDay = (day) => {
  const d = day.trim()
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
}

const StudentTimetable = () => {
  const { user } = useAuth()
  const { theme, darkMode } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const { data: student, isLoading: studentLoading, error: studentError } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  const { data: enrollment, isLoading: enrollmentLoading, error: enrollmentError } = useQuery({
    queryKey: ['student-enrollment', studentId],
    queryFn: async () => {
      if (!studentId) return null
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          batch_id,
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

  // Show spinner only while loading
  if (studentLoading || enrollmentLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  // Show error if any
  if (studentError || enrollmentError) {
    return (
      <Alert
        message="Error"
        description={(studentError || enrollmentError).message}
        type="error"
        showIcon
      />
    )
  }

  const batch = enrollment?.batches

  if (!batch) {
    return (
      <Card title={<span style={{ color: primaryColor }}>My Timetable</span>} bordered={false}>
        <Text type="secondary">No active batch assignment found.</Text>
      </Card>
    )
  }

  const timetableRows = (() => {
    const days = batch.days?.split(',').map(normalizeDay).filter(Boolean) || []
    return days.map(day => ({
      key: `${batch.batch_name}-${day}`,
      day,
      batch_name: batch.batch_name,
      course_name: batch.courses?.name || '-',
      start_time: batch.start_time ? dayjs(batch.start_time, 'HH:mm:ss').format('hh:mm A') : '-',
      end_time: batch.end_time ? dayjs(batch.end_time, 'HH:mm:ss').format('hh:mm A') : '-',
    }))
  })()

  const groupedByDay = timetableRows.reduce((acc, row) => {
    if (!acc[row.day]) acc[row.day] = []
    acc[row.day].push(row)
    return acc
  }, {})

  const dayColumns = [
    { title: 'Start', dataIndex: 'start_time', width: 100 },
    { title: 'End', dataIndex: 'end_time', width: 100 },
    { title: 'Batch', dataIndex: 'batch_name' },
    { title: 'Course', dataIndex: 'course_name' },
  ]

  return (
    <Card title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>My Timetable</span>} bordered={false}>
      {timetableRows.length === 0 ? (
        <Text type="secondary">No batch schedule available.</Text>
      ) : (
        Object.keys(DAY_ORDER).map(day => {
          const classes = groupedByDay[day] || []
          if (classes.length === 0) return null
          return (
            <Card
              key={day}
              size="small"
              title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>{day}</span>}
              style={{ marginBottom: 12, backgroundColor: cardBg, borderColor: primaryColor }}
            >
              <Table dataSource={classes} columns={dayColumns} rowKey="key" pagination={false} size="small" />
            </Card>
          )
        })
      )}
    </Card>
  )
}

export default StudentTimetable