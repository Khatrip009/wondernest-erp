import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Card, Form, Input, Select, DatePicker, TimePicker, InputNumber, Button, Space, message, Spin
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select

const BatchForm = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const queryClient = useQueryClient()

  // ✅ Fetch courses (removed non-existent parent_id and branch_id filters)
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data
    },
  })

  // Fetch teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers-dropdown', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Mutation to create batch
  const createBatch = useMutation({
    mutationFn: async (values) => {
      const payload = {
        batch_name: values.batch_name,
        course_id: values.course_id,
        teacher_id: values.teacher_id || null,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        capacity: values.capacity || null,
        status: values.status || 'active',
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
        days: values.days || null,
        start_time: values.start_time ? values.start_time.format('HH:mm:ss') : null,
        end_time: values.end_time ? values.end_time.format('HH:mm:ss') : null,
      }
      const { data, error } = await supabase
        .from('batches')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      message.success('Batch created successfully')
      queryClient.invalidateQueries(['batches'])
      navigate('/academics/batches')
    },
    onError: (err) => {
      message.error(err.message || 'Failed to create batch')
    },
  })

  const onFinish = (values) => {
    setLoading(true)
    createBatch.mutate(values, {
      onSettled: () => setLoading(false),
    })
  }

  if (coursesLoading || teachersLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  }

  return (
    <Card
      title={<span style={{ color: primaryColor, fontFamily: fontBody }}>Create New Batch</span>}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/batches')}>
          Back
        </Button>
      }
      bordered={false}
      style={{ maxWidth: 700, margin: '0 auto', borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ status: 'active' }}
      >
        <Form.Item
          name="batch_name"
          label="Batch Name"
          rules={[{ required: true, message: 'Please enter batch name' }]}
        >
          <Input placeholder="e.g., Abacus Level 1 - Morning Batch" />
        </Form.Item>

        <Form.Item
          name="course_id"
          label="Course"
          rules={[{ required: true, message: 'Please select a course' }]}
        >
          <Select placeholder="Select course" showSearch optionFilterProp="children">
            {courses?.map(c => (
              <Option key={c.id} value={c.id}>{c.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="teacher_id" label="Teacher">
          <Select placeholder="Select teacher" allowClear showSearch optionFilterProp="children">
            {teachers?.map(t => (
              <Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="capacity" label="Capacity">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select>
            <Option value="active">Active</Option>
            <Option value="inactive">Inactive</Option>
          </Select>
        </Form.Item>

        <Form.Item name="start_date" label="Start Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="end_date" label="End Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="days" label="Days (e.g., Mon, Wed, Fri)">
          <Input placeholder="Mon, Wed, Fri" />
        </Form.Item>

        <Form.Item name="start_time" label="Start Time">
          <TimePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="end_time" label="End Time">
          <TimePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Create Batch
            </Button>
            <Button onClick={() => navigate('/academics/batches')}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default BatchForm