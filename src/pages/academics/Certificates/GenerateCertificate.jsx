import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Form, Select, DatePicker, Button, Space, message, Spin, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useGenerateCertificate } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const GenerateCertificate = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'

  const generateMutation = useGenerateCertificate()

  // Fetch students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-certificates', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, full_name_formatted, admission_no')
        .eq('status', 'active')
        .not('full_name_formatted', 'is', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Fetch courses (root only)
  const { data: courses } = useQuery({
    queryKey: ['courses-certificates-gen'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, name')
        .is('parent_id', null)
        .eq('status', true)
      return data
    },
  })

  // Fetch levels based on selected course
  const selectedCourse = Form.useWatch('course_id', form)
  const { data: levels } = useQuery({
    queryKey: ['levels-certificates', selectedCourse],
    queryFn: async () => {
      if (!selectedCourse) return []
      const { data } = await supabase
        .from('courses')
        .select('id, name')
        .eq('parent_id', selectedCourse)
        .eq('status', true)
        .order('level_number')
      return data
    },
    enabled: !!selectedCourse,
  })

  const onFinish = async (values) => {
    try {
      setLoading(true)
      const payload = {
        student_id: values.student_id,
        course_id: values.course_id,
        level_id: values.level_id || null,
        issue_date: values.issue_date ? values.issue_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        issued_by: null, // you can pass teacher id or admin id
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
      }
      await generateMutation.mutateAsync(payload)
      message.success('Certificate generated successfully')
      navigate('/academics/certificates')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (studentsLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />

  return (
    <Card
      title={<span style={{ color: primaryColor }}>Generate Certificate</span>}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/certificates')}>Back</Button>}
      bordered={false}
      style={{ maxWidth: 700, margin: '0 auto', borderTop: `4px solid ${primaryColor}` }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="student_id"
          label="Student"
          rules={[{ required: true }]}
        >
          <Select placeholder="Select student" showSearch optionFilterProp="children">
            {students?.map(s => <Option key={s.id} value={s.id}>{s.full_name_formatted} ({s.admission_no})</Option>)}
          </Select>
        </Form.Item>

        <Form.Item
          name="course_id"
          label="Course"
          rules={[{ required: true }]}
        >
          <Select placeholder="Select course" onChange={() => form.setFieldsValue({ level_id: undefined })}>
            {courses?.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item name="level_id" label="Level (optional)">
          <Select placeholder="Select level" allowClear>
            {levels?.map(l => <Option key={l.id} value={l.id}>{l.name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item name="issue_date" label="Issue Date" initialValue={dayjs()}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Generate & Save
            </Button>
            <Button onClick={() => navigate('/academics/certificates')}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default GenerateCertificate