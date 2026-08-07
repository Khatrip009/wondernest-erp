import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Space, Spin, Form,
  Input, Select, DatePicker, InputNumber, Divider, message, Typography
} from 'antd'
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useDemo, useUpdateDemo } from '../../hooks/useDemos'
import { statusColors } from '../../utils/constants'
import BranchSelector from '../../components/BranchSelector'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Title } = Typography

const DemoDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const { selectedBranch, setSelectedBranch } = useOutletContext() || {}

  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const { data: demo, isLoading } = useDemo(id)
  const updateMutation = useUpdateDemo()
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!demo) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <p style={{ fontFamily: fontBody, color: primaryColor }}>Demo session not found</p>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/inquiries/demos')}
          style={{ fontFamily: fontBody }}
        >
          Back to Demos
        </Button>
      </Card>
    )
  }

  const handleEdit = () => {
    form.setFieldsValue({
      status: demo.status,
      outcome: demo.outcome || undefined,
      feedback: demo.feedback || '',
      teacher_remarks: demo.teacher_remarks || '',
      demo_attended_by: demo.attended_by || undefined,
      duration: demo.duration_minutes,
      branch_id: demo.branch_id || selectedBranch?.id || undefined,
      scheduled_date: demo.scheduled_date ? dayjs(demo.scheduled_date) : null,
      scheduled_time: demo.scheduled_time ? dayjs(demo.scheduled_time, 'HH:mm:ss') : null,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      // Build scheduled_at safely – prevent "Invalid Date"
      let scheduled_at = null
      if (values.scheduled_date) {
        const dateStr = dayjs(values.scheduled_date).format('YYYY-MM-DD')
        let timeStr = '00:00:00'
        if (values.scheduled_time && dayjs(values.scheduled_time).isValid()) {
          timeStr = dayjs(values.scheduled_time).format('HH:mm:ss')
        }
        scheduled_at = `${dateStr} ${timeStr}`
      }

      const updates = {
        status: values.status,
        outcome: values.outcome || null,
        feedback: values.feedback || null,
        teacher_remarks: values.teacher_remarks || null,
        attended_by: values.demo_attended_by || null,
        duration_minutes: values.duration,
        branch_id: values.branch_id || null,
        scheduled_at: scheduled_at,
      }

      await updateMutation.mutateAsync({ id: demo.demo_session_id, ...updates })
      message.success('Demo updated')
      setEditing(false)
    } catch (err) {
      message.error(err.message || 'Update failed')
    }
  }

  const labelStyle = {
    color: primaryColor,
    fontWeight: 600,
    fontFamily: fontBody,
  }

  const responsiveColumns = { xs: 1, sm: 1, md: 2 }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        title={
          <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
            Demo Session Details
          </Title>
        }
        extra={
          <Space wrap>
            {!editing ? (
              <Button
                icon={<EditOutlined />}
                onClick={handleEdit}
                style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
              >
                Edit
              </Button>
            ) : (
              <>
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  onClick={handleSave}
                  loading={updateMutation.isLoading}
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
                >
                  Save
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => setEditing(false)}
                  style={{ fontFamily: fontBody }}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/inquiries/demos')}
              style={{ fontFamily: fontBody }}
            >
              Back
            </Button>
          </Space>
        }
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        {!editing ? (
          // View Mode
          <Descriptions
            bordered
            column={responsiveColumns}
            size="small"
            labelStyle={labelStyle}
            contentStyle={{ fontFamily: fontBody, color: primaryColor }}
          >
            <Descriptions.Item label="Branch">{demo.branch_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Inquiry No">{demo.inquiry_no}</Descriptions.Item>
            <Descriptions.Item label="Student Name">{demo.student_full_name}</Descriptions.Item>
            <Descriptions.Item label="Mobile">{demo.mobile_no}</Descriptions.Item>
            <Descriptions.Item label="Email">{demo.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Course">{demo.course_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Scheduled Date">
              {demo.scheduled_date ? new Date(demo.scheduled_date).toLocaleDateString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled Time">
              {demo.scheduled_time?.slice(0, 5) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Conducted Date">
              {demo.conducted_date ? new Date(demo.conducted_date).toLocaleDateString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Conducted Time">
              {demo.conducted_time?.slice(0, 5) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Duration (min)">{demo.duration_minutes || '-'}</Descriptions.Item>
            <Descriptions.Item label="Teacher">{demo.teacher_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColors[demo.status] || 'default'} style={{ fontFamily: fontBody }}>
                {demo.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Demo Attended By">{demo.attended_by || '-'}</Descriptions.Item>
            <Descriptions.Item label="Outcome">{demo.outcome || '-'}</Descriptions.Item>
            <Descriptions.Item label="Rescheduled">{demo.rescheduled}</Descriptions.Item>
            <Descriptions.Item label="Feedback" span={2}>{demo.feedback || '-'}</Descriptions.Item>
            <Descriptions.Item label="Teacher Remarks" span={2}>{demo.teacher_remarks || '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          // Edit Mode
          <Form form={form} layout="vertical">
            <Descriptions
              bordered
              column={responsiveColumns}
              size="small"
              labelStyle={labelStyle}
              contentStyle={{ fontFamily: fontBody, color: primaryColor }}
            >
              <Descriptions.Item label="Branch">
                <Form.Item name="branch_id" noStyle>
                  <BranchSelector
                    style={{ width: '100%' }}
                    value={selectedBranch?.id}
                    onChange={(branchId) => {
                      // handle branch change if needed
                    }}
                  />
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Inquiry No">{demo.inquiry_no}</Descriptions.Item>
              <Descriptions.Item label="Student Name">{demo.student_full_name}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{demo.mobile_no}</Descriptions.Item>
              <Descriptions.Item label="Email">{demo.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Course">{demo.course_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Scheduled Date">
                <Form.Item name="scheduled_date" noStyle>
                  <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Scheduled Time">
                <Form.Item name="scheduled_time" noStyle>
                  <DatePicker.TimePicker format="HH:mm" style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Conducted Date">
                {demo.conducted_date ? new Date(demo.conducted_date).toLocaleDateString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Conducted Time">
                {demo.conducted_time?.slice(0, 5) || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Duration (min)">
                <Form.Item name="duration" noStyle>
                  <InputNumber min={1} style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Teacher">{demo.teacher_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Form.Item name="status" noStyle>
                  <Select style={{ width: '100%', fontFamily: fontBody }}>
                    <Option value="Scheduled">Scheduled</Option>
                    <Option value="Conducted">Conducted</Option>
                    <Option value="Rescheduled">Rescheduled</Option>
                    <Option value="Cancelled">Cancelled</Option>
                    <Option value="No-Show">No-Show</Option>
                  </Select>
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Demo Attended By">
                <Form.Item name="demo_attended_by" noStyle>
                  <Select allowClear style={{ width: '100%', fontFamily: fontBody }}>
                    <Option value="Student">Student</Option>
                    <Option value="Parent">Parent</Option>
                    <Option value="Both">Both</Option>
                    <Option value="None">None</Option>
                  </Select>
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Outcome">
                <Form.Item name="outcome" noStyle>
                  <Select allowClear style={{ width: '100%', fontFamily: fontBody }}>
                    <Option value="Success">Success</Option>
                    <Option value="Fail">Fail</Option>
                    <Option value="Inconclusive">Inconclusive</Option>
                    <Option value="Reschedule Needed">Reschedule Needed</Option>
                  </Select>
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Rescheduled">{demo.rescheduled}</Descriptions.Item>
              <Descriptions.Item label="Feedback" span={2}>
                <Form.Item name="feedback" noStyle>
                  <Input.TextArea rows={2} style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Descriptions.Item>
              <Descriptions.Item label="Teacher Remarks" span={2}>
                <Form.Item name="teacher_remarks" noStyle>
                  <Input.TextArea rows={2} style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Descriptions.Item>
            </Descriptions>
          </Form>
        )}
      </Card>
    </div>
  )
}

export default DemoDetail