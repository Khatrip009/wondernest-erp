import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, InputNumber, Button, Space, Spin, message, Typography, Tag, Input } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useExam, useExamResults, useUpsertResult } from '../../../hooks/useAcademics'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'

const { Title } = Typography

const ExamResults = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: exam, isLoading: examLoading } = useExam(id)
  const { data: results, isLoading: resultsLoading, refetch } = useExamResults(id)
  const upsertMutation = useUpsertResult()  // ✅ Correct hook name

  const [marks, setMarks] = useState({})
  const [remarks, setRemarks] = useState({})

  // Fetch students enrolled in this batch
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['exam-students', exam?.batch_id],
    queryFn: async () => {
      if (!exam?.batch_id) return []
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students ( id, full_name_formatted, admission_no )
        `)
        .eq('batch_id', exam.batch_id)
        .eq('status', 'active')
      if (error) throw error
      return data.map(e => e.students)
    },
    enabled: !!exam?.batch_id,
  })

  const handleSaveMarks = async (studentId) => {
    const mark = marks[studentId]
    const remark = remarks[studentId]
    if (mark === undefined || mark === null || mark === '') {
      message.warning('Please enter marks')
      return
    }
    try {
      await upsertMutation.mutateAsync({
        exam_id: Number(id),
        student_id: studentId,
        marks_obtained: Number(mark),
        remarks: remark || '',
        branch_id: exam?.branch_id,
        financial_year_id: exam?.financial_year_id,
      })
      message.success('Marks saved')
      // Clear local state for this student
      setMarks(prev => ({ ...prev, [studentId]: undefined }))
      setRemarks(prev => ({ ...prev, [studentId]: undefined }))
      refetch()
    } catch (err) {
      message.error(err.message)
    }
  }

  const getExistingResult = (studentId) => {
    return results?.find(r => r.student_id === studentId)
  }

  const columns = [
    {
      title: 'Admission No',
      dataIndex: 'admission_no',
    },
    {
      title: 'Student Name',
      dataIndex: 'full_name_formatted',
    },
    {
      title: 'Marks',
      render: (_, record) => {
        const existing = getExistingResult(record.id)
        const isExisting = !!existing

        if (isExisting && !marks[record.id]) {
          return (
            <Space>
              <InputNumber
                value={existing.marks_obtained}
                onChange={(val) => setMarks({ ...marks, [record.id]: val })}
                style={{ width: 80 }}
              />
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleSaveMarks(record.id)}
              >
                Update
              </Button>
            </Space>
          )
        }

        return (
          <Space>
            <InputNumber
              placeholder="Marks"
              style={{ width: 80 }}
              value={marks[record.id]}
              onChange={(val) => setMarks({ ...marks, [record.id]: val })}
            />
            <Input
              placeholder="Remarks"
              style={{ width: 120 }}
              value={remarks[record.id]}
              onChange={(e) => setRemarks({ ...remarks, [record.id]: e.target.value })}
            />
            <Button
              size="small"
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSaveMarks(record.id)}
              disabled={!marks[record.id] && marks[record.id] !== 0}
            >
              Save
            </Button>
          </Space>
        )
      },
    },
    {
      title: 'Grade',
      render: (_, record) => {
        const existing = getExistingResult(record.id)
        return existing?.grade || '-'
      },
    },
    {
      title: 'Status',
      render: (_, record) => {
        const existing = getExistingResult(record.id)
        return existing ? <Tag color="green">Recorded</Tag> : <Tag color="orange">Pending</Tag>
      },
    },
  ]

  if (examLoading || studentsLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  }

  if (!exam) return <Card>Exam not found</Card>

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/exams')}>Back</Button>
        <Button icon={<ReloadOutlined />} onClick={() => { refetch(); window.location.reload() }}>Refresh</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Title level={4}>{exam.exam_name}</Title>
        <div style={{ marginBottom: 16 }}>
          <Tag color="blue">Batch: {exam.batches?.batch_name}</Tag>
          <Tag color="green">Subject: {exam.subjects?.subject_name}</Tag>
          <Tag color="orange">Total Marks: {exam.total_marks}</Tag>
        </div>
      </Card>

      <Card
        title="Marks Entry"
        bordered={false}
        style={{ marginTop: 16, borderTop: `4px solid ${primaryColor}` }}
      >
        <Table
          dataSource={students || []}
          columns={columns}
          rowKey="id"
          loading={resultsLoading}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default ExamResults