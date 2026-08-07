import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Spin, Table, InputNumber, Input, Typography, message, Divider } from 'antd'
import { ArrowLeftOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useHomework, useSubmissions, useGradeSubmission } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'
import { useState } from 'react'

const { Title } = Typography

const HomeworkDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: homework, isLoading: hwLoading } = useHomework(id)
  const { data: submissions, isLoading: subLoading, refetch } = useSubmissions(id)
  const gradeMutation = useGradeSubmission()

  const [grading, setGrading] = useState({})

  const handleGrade = (submissionId, marks, remarks) => {
    gradeMutation.mutate({
      submissionId,
      marks,
      remarks,
      homeworkId: id,
    }, {
      onSuccess: () => {
        message.success('Graded successfully')
        refetch()
      },
      onError: (err) => message.error(err.message),
    })
  }

  const columns = [
    {
      title: 'Student',
      dataIndex: ['students', 'full_name_formatted'],
    },
    {
      title: 'Admission No',
      dataIndex: ['students', 'admission_no'],
    },
    {
      title: 'Submitted At',
      dataIndex: 'submitted_at',
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s) => <Tag color={s === 'Graded' ? 'green' : 'gold'}>{s}</Tag>,
    },
    {
      title: 'Marks',
      dataIndex: 'marks',
      render: (m, record) => {
        const isGraded = record.status === 'Graded'
        if (isGraded) return m
        return (
          <InputNumber
            min={0}
            max={100}
            value={grading[record.id]?.marks}
            onChange={(val) => setGrading({ ...grading, [record.id]: { ...grading[record.id], marks: val } })}
          />
        )
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      render: (r, record) => {
        const isGraded = record.status === 'Graded'
        if (isGraded) return r
        return (
          <Input
            placeholder="Remarks"
            value={grading[record.id]?.remarks}
            onChange={(e) => setGrading({ ...grading, [record.id]: { ...grading[record.id], remarks: e.target.value } })}
          />
        )
      },
    },
    {
      title: 'Action',
      render: (_, record) => {
        if (record.status === 'Graded') return <Tag color="green">Done</Tag>
        return (
          <Button
            size="small"
            type="primary"
            onClick={() => handleGrade(record.id, grading[record.id]?.marks, grading[record.id]?.remarks)}
          >
            Grade
          </Button>
        )
      },
    },
  ]

  if (hwLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!homework) return <Card>Homework not found</Card>

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/homework')}>Back</Button>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/academics/homework/${id}/edit`)}>Edit</Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Title level={4}>{homework.title}</Title>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Batch">{homework.batches?.batch_name}</Descriptions.Item>
          <Descriptions.Item label="Subject">{homework.subjects?.subject_name}</Descriptions.Item>
          <Descriptions.Item label="Assigned Date">{homework.assigned_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{homework.due_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>{homework.description || '-'}</Descriptions.Item>
          {homework.attachment_url && (
            <Descriptions.Item label="Attachment" span={2}>
              <a href={homework.attachment_url} target="_blank" rel="noreferrer">Download</a>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card
        title="Submissions"
        bordered={false}
        style={{ marginTop: 16, borderTop: `4px solid ${primaryColor}` }}
      >
        <Table
          dataSource={submissions || []}
          columns={columns}
          rowKey="id"
          loading={subLoading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

export default HomeworkDetail