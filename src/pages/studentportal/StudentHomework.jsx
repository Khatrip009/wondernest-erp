// src/pages/studentportal/StudentHomework.jsx
import { Card, Table, Tag, Spin, Alert } from 'antd'
import { useNavigate } from 'react-router-dom'   // ✅ added import
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const StudentHomework = () => {
  const navigate = useNavigate()   // ✅ added hook
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  // Fetch student record
  const { data: student } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  // Fetch active enrollment (batch_id)
  const { data: enrollment } = useQuery({
    queryKey: ['student-enrollment', studentId],
    queryFn: async () => {
      if (!studentId) return null
      const { data } = await supabase
        .from('student_enrollments')
        .select('batch_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!studentId,
  })

  const batchId = enrollment?.batch_id

  const { data: homeworks, isLoading, error } = useQuery({
    queryKey: ['student-homework', batchId],
    queryFn: async () => {
      if (!batchId) return []
      const { data, error } = await supabase
        .from('homework')
        .select('*')
        .eq('batch_id', batchId)
        .order('due_date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!batchId,
  })

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (error) return <Alert message="Error loading homework" description={error.message} type="error" showIcon />

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (text, record) => (
        <a
          onClick={() => navigate(`/student/homework/${record.id}`)}
          style={{ color: primaryColor }}
        >
          {text}
        </a>
      ),
    },
    { title: 'Description', dataIndex: 'description', render: d => d || '-' },
    { title: 'Assigned Date', dataIndex: 'assigned_date', render: d => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Due Date', dataIndex: 'due_date', render: d => dayjs(d).format('DD/MM/YYYY') },
    {
      title: 'Status',
      render: (_, record) => {
        const overdue = dayjs(record.due_date).isBefore(dayjs(), 'day')
        return <Tag color={overdue ? 'red' : 'green'}>{overdue ? 'Overdue' : 'Active'}</Tag>
      },
    },
  ]

  return (
    <Card title={<span style={{ color: primaryColor }}>My Homework</span>} bordered={false}>
      <Table
        dataSource={homeworks}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No homework assigned' }}
      />
    </Card>
  )
}

export default StudentHomework