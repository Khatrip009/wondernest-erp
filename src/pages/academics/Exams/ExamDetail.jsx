import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, Tag, Button, Space, Spin, Typography } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useExam, useExamResults } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'

const { Title } = Typography

const ExamResults = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: exam, isLoading: examLoading } = useExam(id)
  const { data: results, isLoading: resultsLoading, refetch } = useExamResults(id)

  if (examLoading || resultsLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!exam) return <Card>Exam not found</Card>

  const columns = [
    { title: 'Student', dataIndex: ['students', 'full_name_formatted'] },
    { title: 'Admission No', dataIndex: ['students', 'admission_no'] },
    { title: 'Marks Obtained', dataIndex: 'marks_obtained' },
    { title: 'Grade', dataIndex: 'grade', render: (g) => g || '-' },
    { title: 'Remarks', dataIndex: 'remarks', render: (r) => r || '-' },
    { title: 'Status', render: () => <Tag color="green">Graded</Tag> },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/exams')}>Back</Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Title level={4}>Results: {exam.exam_name}</Title>
        <Table
          dataSource={results || []}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

export default ExamResults