import { useEffect } from 'react'
import {
  Modal, Form, Select, DatePicker, TimePicker, InputNumber, Input, message,
  Descriptions, Spin, Typography
} from 'antd'
import { useScheduleDemo } from '../../hooks/useInquiries'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const { TextArea } = Input
const { Text } = Typography

const DemoScheduleModal = ({ open, inquiryId, onClose }) => {
  const [form] = Form.useForm()
  const scheduleMutation = useScheduleDemo()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const bgColor = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const labelColor = primaryColor

  // Fetch inquiry details
  const { data: inquiry, isLoading: inquiryLoading } = useQuery({
    queryKey: ['inquiry', inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          inquiry_no, student_name, mobile, email,
          branch_id, interested_course_id,
          branches ( branch_name )
        `)
        .eq('id', inquiryId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!inquiryId && open,
    staleTime: 60 * 1000,
  })

  // Fetch active teachers (scoped to the current branch / org via RLS)
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-active', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('status', 'active')
      if (selectedBranch?.id) {
        query = query.eq('branch_id', selectedBranch.id)
      }
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: open,
  })

  // Fetch active courses (scoped to org via RLS)
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-active-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
        .eq('organization_id', org?.id)
      if (error) throw error
      return data
    },
    enabled: open && !!org?.id,
  })

  // Pre‑fill course from inquiry
  useEffect(() => {
    if (inquiry?.interested_course_id) {
      form.setFieldsValue({ course_id: inquiry.interested_course_id })
    }
  }, [inquiry, form])

  const onOk = async () => {
    try {
      const values = await form.validateFields()

      const scheduledDate = values.scheduled_date.format('YYYY-MM-DD')
      const scheduledTime = values.scheduled_time.format('HH:mm:ss')
      const scheduledAt = dayjs.tz(`${scheduledDate} ${scheduledTime}`, 'Asia/Kolkata').toISOString()

      await scheduleMutation.mutateAsync({
        inquiryId,
        teacherId: values.teacher_id,
        courseId: values.course_id,
        scheduledAt,
        durationMinutes: values.duration_minutes,
        notes: values.notes,
        branchId: inquiry.branch_id,               // Use the inquiry's own branch
        financialYearId: selectedFinancialYear?.id, // Optional, for future RLS checks
      })
      message.success('Demo scheduled')
      onClose()
    } catch (err) {
      message.error(err.message || 'Failed to schedule demo')
    }
  }

  return (
    <Modal
      title={
        <span style={{ color: primaryColor, fontFamily: fontHeading }}>
          Schedule Demo
        </span>
      }
      open={open}
      onOk={onOk}
      onCancel={onClose}
      confirmLoading={scheduleMutation.isLoading}   // or .isPending for React Query v5
      destroyOnClose
      width={560}
      styles={{
        body: { backgroundColor: bgColor, fontFamily: fontBody, color: textColor },
        header: { backgroundColor: bgColor },
        content: { backgroundColor: bgColor },
      }}
      okButtonProps={{
        style: { backgroundColor: primaryColor, borderColor: primaryColor },
      }}
      cancelButtonProps={{
        style: { color: textColor, borderColor },
      }}
    >
      {/* Inquiry info */}
      {inquiryLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" />
        </div>
      ) : inquiry ? (
        <div style={{ marginBottom: 16 }}>
          <Descriptions
            column={1}
            size="small"
            bordered
            labelStyle={{
              color: labelColor,
              fontWeight: 600,
              fontFamily: fontBody,
              backgroundColor: darkMode ? '#2c2c2c' : '#fafafa',
            }}
            contentStyle={{
              fontFamily: fontBody,
              color: textColor,
              backgroundColor: bgColor,
            }}
          >
            <Descriptions.Item label="Branch">
              {inquiry.branches?.branch_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Inquiry No">
              {inquiry.inquiry_no}
            </Descriptions.Item>
            <Descriptions.Item label="Student Name">
              {inquiry.student_name}
            </Descriptions.Item>
            <Descriptions.Item label="Mobile">
              {inquiry.mobile}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {inquiry.email || '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      ) : null}

      {/* Editable fields */}
      <Form
        form={form}
        layout="vertical"
        style={{ backgroundColor: bgColor }}
      >
        <Form.Item
          name="scheduled_date"
          label={<span style={{ fontFamily: fontBody, color: primaryColor }}>Date</span>}
          rules={[{ required: true, message: 'Select date' }]}
        >
          <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
        </Form.Item>
        <Form.Item
          name="scheduled_time"
          label={<span style={{ fontFamily: fontBody, color: primaryColor }}>Time</span>}
          rules={[{ required: true, message: 'Select time' }]}
        >
          <TimePicker format="HH:mm" style={{ width: '100%', fontFamily: fontBody }} />
        </Form.Item>

        <Form.Item
          name="teacher_id"
          label={<span style={{ fontFamily: fontBody, color: primaryColor }}>Teacher</span>}
          rules={[{ required: true, message: 'Select teacher' }]}
        >
          <Select
            placeholder="Select teacher"
            style={{ fontFamily: fontBody }}
            dropdownStyle={{ fontFamily: fontBody }}
          >
            {teachers.map(t => (
              <Select.Option key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="course_id"
          label={<span style={{ fontFamily: fontBody, color: primaryColor }}>Course</span>}
        >
          <Select
            placeholder="Select course"
            allowClear
            style={{ fontFamily: fontBody }}
            dropdownStyle={{ fontFamily: fontBody }}
          >
            {courses.map(c => (
              <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="duration_minutes"
          label={<span style={{ fontFamily: fontBody, color: primaryColor }}>Duration (minutes)</span>}
        >
          <InputNumber
            min={15}
            max={180}
            style={{ width: '100%', fontFamily: fontBody }}
            placeholder="30"
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label={<span style={{ fontFamily: fontBody, color: primaryColor }}>Notes</span>}
        >
          <TextArea rows={2} placeholder="Any additional notes..." style={{ fontFamily: fontBody }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default DemoScheduleModal