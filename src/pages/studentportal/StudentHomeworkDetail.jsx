// src/pages/studentportal/StudentHomeworkDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Button, Form, Input, Upload, message, Spin, Alert, Tag, Typography
} from 'antd'
import { UploadOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Title, Text } = Typography

const StudentHomeworkDetail = () => {
  const { homeworkId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // Get student id
  const { data: student } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  // Fetch homework details
  const { data: homework, isLoading, error } = useQuery({
    queryKey: ['student-homework-detail', homeworkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          batches ( batch_name ),
          subjects ( subject_name )
        `)
        .eq('id', homeworkId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!homeworkId,
  })

  // Fetch existing submission
  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: ['homework-submission', homeworkId, studentId],
    queryFn: async () => {
      if (!studentId || !homeworkId) return null
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('homework_id', homeworkId)
        .eq('student_id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!studentId && !!homeworkId,
  })

  // Set initial form values when submission exists
  useEffect(() => {
    if (submission) {
      form.setFieldsValue({
        remarks: submission.remarks || '',
      })
    }
  }, [submission, form])

  const submitMutation = useMutation({
    mutationFn: async (values) => {
      if (!studentId || !homeworkId) throw new Error('Student or homework not found')
      let submission_file = submission?.submission_file || null

      // Upload file if provided
      if (values.submission_file && values.submission_file.length > 0) {
        const file = values.submission_file[0].originFileObj
        const filePath = `homework_submissions/${studentId}/${homeworkId}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('ShreeVidhya_Academy')
          .upload(filePath, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage
          .from('ShreeVidhya_Academy')
          .getPublicUrl(filePath)
        submission_file = publicUrlData.publicUrl
      }

      const payload = {
        homework_id: homeworkId,
        student_id: studentId,
        remarks: values.remarks || '',
        submission_file,
        submitted_at: new Date().toISOString(),
        status: 'Pending',
      }

      if (submission?.id) {
        const { error } = await supabase
          .from('homework_submissions')
          .update(payload)
          .eq('id', submission.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('homework_submissions')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      message.success('Submission saved')
      queryClient.invalidateQueries(['homework-submission', homeworkId, studentId])
      setSubmitting(false)
    },
    onError: (err) => {
      message.error(err.message)
      setSubmitting(false)
    },
  })

  const handleSubmit = async (values) => {
    setSubmitting(true)
    submitMutation.mutate(values)
  }

  if (isLoading || submissionLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  }

  if (error) {
    return <Alert message="Error loading homework" description={error.message} type="error" showIcon />
  }

  if (!homework) {
    return <Alert message="Homework not found" type="warning" showIcon />
  }

  const isSubmitted = !!submission

  return (
    <div style={{ fontFamily: 'var(--font-body, Montserrat)' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/student/homework')}
        style={{ marginBottom: 16, borderColor: primaryColor, color: primaryColor }}
      >
        Back to Homework
      </Button>

      <Card
        title={<span style={{ color: primaryColor }}>Homework Details</span>}
        bordered={false}
        style={{ borderTop: `4px solid ${primaryColor}` }}
      >
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Title">{homework.title}</Descriptions.Item>
          <Descriptions.Item label="Batch">{homework.batches?.batch_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Subject">{homework.subjects?.subject_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Assigned Date">
            {homework.assigned_date ? dayjs(homework.assigned_date).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">
            {homework.due_date ? dayjs(homework.due_date).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Description">{homework.description || '-'}</Descriptions.Item>
          {homework.attachment_url && (
            <Descriptions.Item label="Attachment">
              <a href={homework.attachment_url} target="_blank" rel="noreferrer">Download</a>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card
        title={<span style={{ color: primaryColor }}>{isSubmitted ? 'Edit Submission' : 'Submit Homework'}</span>}
        style={{ marginTop: 16, borderTop: `4px solid ${primaryColor}` }}
      >
        {isSubmitted && (
          <Alert
            type="info"
            message={`Current status: ${submission.status}`}
            description={`Submitted on ${dayjs(submission.submitted_at).format('DD/MM/YYYY HH:mm')}`}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="remarks" label="Answer / Remarks">
            <TextArea rows={4} placeholder="Enter your answer or remarks..." />
          </Form.Item>
          <Form.Item name="submission_file" label="Upload File (optional)">
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>
          {submission?.submission_file && (
            <div style={{ marginBottom: 16 }}>
              <Text>Current file: </Text>
              <a href={submission.submission_file} target="_blank" rel="noreferrer">View / Download</a>
            </div>
          )}
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={submitMutation.isLoading || submitting}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            {isSubmitted ? 'Update Submission' : 'Submit'}
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default StudentHomeworkDetail