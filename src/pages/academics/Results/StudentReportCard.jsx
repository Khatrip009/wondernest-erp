import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Table, Tag, Button, Space, Spin, Typography, Divider } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'

const { Title } = Typography

const StudentReportCard = () => {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  // Fetch student details
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-report', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name_formatted, admission_no, branch_id')
        .eq('id', studentId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!studentId,
  })

  // Fetch all results for this student
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['student-results', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_results')
        .select(`
          marks_obtained,
          grade,
          exams ( id, exam_name, total_marks, subjects ( subject_name ) )
        `)
        .eq('student_id', studentId)
      if (error) throw error
      return data
    },
    enabled: !!studentId,
  })

  if (studentLoading || resultsLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!student) return <Card>Student not found</Card>

  const totalObtained = results?.reduce((sum, r) => sum + r.marks_obtained, 0) || 0
  const totalPossible = results?.reduce((sum, r) => sum + r.exams.total_marks, 0) || 0
  const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0
  const grade = percentage >= 90 ? 'A' : percentage >= 75 ? 'B' : percentage >= 60 ? 'C' : percentage >= 45 ? 'D' : 'F'

  const columns = [
    {
      title: 'Exam',
      dataIndex: ['exams', 'exam_name'],
    },
    {
      title: 'Subject',
      dataIndex: ['exams', 'subjects', 'subject_name'],
    },
    {
      title: 'Total Marks',
      dataIndex: ['exams', 'total_marks'],
    },
    {
      title: 'Marks Obtained',
      dataIndex: 'marks_obtained',
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      render: (g) => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'blue' : g === 'C' ? 'orange' : 'red'}>{g}</Tag>,
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/results')}>Back</Button>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Report Card</Title>
          <Descriptions bordered column={1} size="small" labelStyle={{ fontWeight: 500 }}>
            <Descriptions.Item label="Student Name">{student.full_name_formatted}</Descriptions.Item>
            <Descriptions.Item label="Admission No">{student.admission_no}</Descriptions.Item>
            <Descriptions.Item label="Total Marks Obtained">{totalObtained}</Descriptions.Item>
            <Descriptions.Item label="Total Possible">{totalPossible}</Descriptions.Item>
            <Descriptions.Item label="Percentage">{percentage.toFixed(1)}%</Descriptions.Item>
            <Descriptions.Item label="Overall Grade">
              <Tag color={grade === 'A' ? 'green' : grade === 'B' ? 'blue' : grade === 'C' ? 'orange' : 'red'}>{grade}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider>Exam-wise Marks</Divider>
        <Table
          dataSource={results || []}
          columns={columns}
          rowKey="exam_id"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default StudentReportCard