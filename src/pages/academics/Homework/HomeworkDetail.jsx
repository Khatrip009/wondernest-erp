import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Space, Spin, Table,
  InputNumber, Input, Typography, message, Divider
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, ReloadOutlined
} from '@ant-design/icons'
import { useHomework, useSubmissions, useGradeSubmission } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'
import { useState } from 'react'

const { Title } = Typography

const HomeworkDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const headerBg = darkMode ? '#2c2c2c' : '#f5f5f5'

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
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: ['students', 'full_name_formatted'],
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: ['students', 'admission_no'],
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Submitted At</span>,
      dataIndex: 'submitted_at',
      render: (d) => <span style={{ fontFamily: fontBody, color: textColor }}>{d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      render: (s) => <Tag color={s === 'Graded' ? 'green' : 'gold'} style={{ fontFamily: fontBody }}>{s}</Tag>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Marks</span>,
      dataIndex: 'marks',
      render: (m, record) => {
        const isGraded = record.status === 'Graded'
        if (isGraded) return <span style={{ color: textColor }}>{m}</span>
        return (
          <InputNumber
            min={0}
            max={100}
            value={grading[record.id]?.marks}
            onChange={(val) => setGrading({ ...grading, [record.id]: { ...grading[record.id], marks: val } })}
            style={{ fontFamily: fontBody }}
          />
        )
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Remarks</span>,
      dataIndex: 'remarks',
      render: (r, record) => {
        const isGraded = record.status === 'Graded'
        if (isGraded) return <span style={{ color: textColor }}>{r}</span>
        return (
          <Input
            placeholder="Remarks"
            value={grading[record.id]?.remarks}
            onChange={(e) => setGrading({ ...grading, [record.id]: { ...grading[record.id], remarks: e.target.value } })}
            style={{ fontFamily: fontBody }}
          />
        )
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Action</span>,
      render: (_, record) => {
        if (record.status === 'Graded') return <Tag color="green" style={{ fontFamily: fontBody }}>Done</Tag>
        return (
          <Button
            size="small"
            type="primary"
            onClick={() => handleGrade(record.id, grading[record.id]?.marks, grading[record.id]?.remarks)}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
          >
            Grade
          </Button>
        )
      },
    },
  ]

  if (hwLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!homework) return <Card style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}><span style={{ color: textColor }}>Homework not found</span></Card>

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/homework')} style={{ fontFamily: fontBody, color: textColor, borderColor }}>
          Back
        </Button>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/academics/homework/${id}/edit`)} style={{ fontFamily: fontBody, color: primaryColor, borderColor: primaryColor }}>
          Edit
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ fontFamily: fontBody, color: textColor, borderColor }}>
          Refresh
        </Button>
      </Space>

      <Card
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading }}>{homework.title}</Title>
        <Descriptions
          bordered
          column={2}
          size="small"
          labelStyle={{ color: primaryColor, fontWeight: 600, fontFamily: fontBody, backgroundColor: headerBg }}
          contentStyle={{ fontFamily: fontBody, color: textColor, backgroundColor: cardBg }}
        >
          <Descriptions.Item label="Batch">{homework.batches?.batch_name}</Descriptions.Item>
          <Descriptions.Item label="Subject">{homework.subjects?.subject_name}</Descriptions.Item>
          <Descriptions.Item label="Assigned Date">{homework.assigned_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{homework.due_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>{homework.description || '-'}</Descriptions.Item>
          {homework.attachment_url && (
            <Descriptions.Item label="Attachment" span={2}>
              <a href={homework.attachment_url} target="_blank" rel="noreferrer" style={{ color: primaryColor }}>
                Download
              </a>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Submissions</span>}
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
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