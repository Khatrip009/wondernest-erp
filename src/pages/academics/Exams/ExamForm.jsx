import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Form, Input, Select, DatePicker, InputNumber, Button, Space, message, Spin } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useExam, useCreateExam, useUpdateExam } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select

const ExamForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'

  const isEdit = !!id
  const { data: exam, isLoading: examLoading } = useExam(id)
  const createMutation = useCreateExam()
  const updateMutation = useUpdateExam()

  const { data: batches } = useQuery({
    queryKey: ['batches-form-exams', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('batches').select('id, batch_name').eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects-form-exams', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('subjects').select('id, subject_name')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (exam) {
      form.setFieldsValue({
        exam_name: exam.exam_name,
        batch_id: exam.batch_id,
        subject_id: exam.subject_id,
        exam_date: exam.exam_date ? dayjs(exam.exam_date) : null,
        total_marks: exam.total_marks,
      })
    }
  }, [exam, form])

  const onFinish = async (values) => {
    try {
      setLoading(true)
      const payload = {
        exam_name: values.exam_name,
        batch_id: values.batch_id,
        subject_id: values.subject_id,
        exam_date: values.exam_date ? values.exam_date.format('YYYY-MM-DD') : null,
        total_marks: values.total_marks || 100,
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
      }
      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(id), ...payload })
        message.success('Exam updated')
      } else {
        await createMutation.mutateAsync(payload)
        message.success('Exam created')
      }
      navigate('/academics/exams')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isEdit && examLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />

  return (
    <Card title={<span style={{ color: primaryColor }}>{isEdit ? 'Edit Exam' : 'Create Exam'}</span>}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/exams')}>Back</Button>}
      bordered={false} style={{ maxWidth: 600, margin: '0 auto', borderTop: `4px solid ${primaryColor}` }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="exam_name" label="Exam Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="batch_id" label="Batch" rules={[{ required: true }]}>
          <Select placeholder="Select batch">
            {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="subject_id" label="Subject" rules={[{ required: true }]}>
          <Select placeholder="Select subject">
            {subjects?.map(s => <Option key={s.id} value={s.id}>{s.subject_name}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="exam_date" label="Exam Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="total_marks" label="Total Marks" initialValue={100}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              {isEdit ? 'Update' : 'Create'}
            </Button>
            <Button onClick={() => navigate('/academics/exams')}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default ExamForm