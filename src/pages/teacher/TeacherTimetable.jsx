// src/pages/teacher/TeacherTimetable.jsx
import { Card, Table, Spin, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const DAY_ORDER = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

// ✅ Helper to normalize day abbreviation
const normalizeDay = (day) => {
  const d = day.trim()
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
}

const TeacherTimetable = () => {
  const { user } = useAuth()
  const { theme, darkMode } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const { data: teacher } = useQuery({
    queryKey: ['teacher-me', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  const teacherId = teacher?.id

  const { data: batches, isLoading } = useQuery({
    queryKey: ['teacher-batches-direct', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id, batch_name, days, start_time, end_time,
          courses ( name )
        `)
        .eq('teacher_id', teacherId)
        .eq('status', 'active')
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId,
  })

  // Build flat rows with normalized day names
  const timetableRows = (batches || []).flatMap(batch => {
    const days = batch.days?.split(',').map(normalizeDay).filter(Boolean) || []
    return days.map(day => ({
      key: `${batch.id}-${day}`,
      day,
      batch_name: batch.batch_name,
      course_name: batch.courses?.name || '-',
      start_time: batch.start_time ? dayjs(batch.start_time, 'HH:mm:ss').format('hh:mm A') : '-',
      end_time: batch.end_time ? dayjs(batch.end_time, 'HH:mm:ss').format('hh:mm A') : '-',
      raw_start: batch.start_time || '',
    }))
  })

  timetableRows.sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] ?? 7) - (DAY_ORDER[b.day] ?? 7)
    if (dayDiff !== 0) return dayDiff
    return (a.raw_start || '').localeCompare(b.raw_start || '')
  })

  const groupedByDay = timetableRows.reduce((acc, row) => {
    if (!acc[row.day]) acc[row.day] = []
    acc[row.day].push(row)
    return acc
  }, {})

  const dayColumns = [
    { title: 'Start', dataIndex: 'start_time', key: 'start_time', width: 100 },
    { title: 'End', dataIndex: 'end_time', key: 'end_time', width: 100 },
    { title: 'Batch', dataIndex: 'batch_name', key: 'batch_name' },
    { title: 'Course', dataIndex: 'course_name', key: 'course_name' },
  ]

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>My Timetable</span>} bordered={false}>
        {timetableRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Text type="secondary">No batches assigned yet.</Text>
          </div>
        ) : (
          Object.keys(DAY_ORDER).map(day => {
            const dayClasses = groupedByDay[day] || []
            if (dayClasses.length === 0) return null
            return (
              <Card
                key={day}
                size="small"
                title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>{day}</span>}
                style={{ marginBottom: 12, backgroundColor: cardBg, borderColor: primaryColor }}
              >
                <Table
                  dataSource={dayClasses}
                  columns={dayColumns}
                  rowKey="key"
                  pagination={false}
                  size="small"
                />
              </Card>
            )
          })
        )}
      </Card>
    </div>
  )
}

export default TeacherTimetable