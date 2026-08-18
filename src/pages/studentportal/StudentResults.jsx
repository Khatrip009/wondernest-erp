import { Card, Table, Tag, Spin, Alert } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const StudentResults = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: student } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['student-results', studentId],
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('student_results')
        .select(`
          marks_obtained,
          grade,
          remarks,
          exams ( exam_name, exam_date, total_marks, subjects ( subject_name ) )
        `)
        .eq('student_id', studentId)
        .order('id', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
  })

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (error) return <Alert message="Error loading results" description={error.message} type="error" showIcon />

  const columns = [
    { title: 'Exam', dataIndex: ['exams', 'exam_name'] },
    { title: 'Subject', dataIndex: ['exams', 'subjects', 'subject_name'] },
    { title: 'Date', dataIndex: ['exams', 'exam_date'], render: d => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Total Marks', dataIndex: ['exams', 'total_marks'] },
    { title: 'Marks Obtained', dataIndex: 'marks_obtained' },
    { title: 'Grade', dataIndex: 'grade', render: g => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'blue' : g === 'C' ? 'orange' : 'red'}>{g}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', render: r => r || '-' },
  ]

  return (
    <Card title={<span style={{ color: primaryColor }}>My Results</span>} bordered={false}>
      <Table dataSource={results} columns={columns} rowKey="id" pagination={{ pageSize: 20 }} />
    </Card>
  )
}

export default StudentResults