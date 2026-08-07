import { useState } from 'react'
import { Card, Descriptions, Tag, Button, Space, Spin, Form, Input, Select, DatePicker, InputNumber, message } from 'antd'
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { statusColors } from '../../utils/constants'
import BranchSelector from '../../components/BranchSelector'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select

const DemoCard = ({ demo, inquiryId, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

 const handleEdit = () => {
  form.setFieldsValue({
    status: demo.status,
    outcome: demo.outcome || undefined,
    feedback: demo.feedback || '',
    teacher_remarks: demo.teacher_remarks || '',
    demo_attended_by: demo.attended_by || undefined,
    duration: demo.duration_minutes,
    branch_id: demo.branch_id || undefined,
    scheduled_date: demo.scheduled_date ? dayjs(demo.scheduled_date) : null,
    scheduled_time: demo.scheduled_time ? dayjs(demo.scheduled_time, 'HH:mm:ss') : null,
  });
  setEditing(true);
};

const handleSave = async () => {
  try {
    const values = await form.validateFields();
    setLoading(true);

    // Build scheduled_at safely
    let scheduled_at = null;
    if (values.scheduled_date) {
      const dateStr = dayjs(values.scheduled_date).format('YYYY-MM-DD');
      let timeStr = '00:00:00';
      if (values.scheduled_time && dayjs(values.scheduled_time).isValid()) {
        timeStr = dayjs(values.scheduled_time).format('HH:mm:ss');
      }
      scheduled_at = `${dateStr} ${timeStr}`;
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
    };

    const { error } = await supabase
      .from('demo_sessions')
      .update(updates)
      .eq('id', demo.demo_session_id);

    if (error) throw error;
    message.success('Demo updated');
    setEditing(false);
    onUpdate();
  } catch (err) {
    message.error(err.message || 'Update failed');
  } finally {
    setLoading(false);
  }
};
  const labelStyle = {
    color: primaryColor,
    fontWeight: 600,
    fontFamily: fontBody,
  }

  return (
    <Card
      size="small"
      style={{
        marginBottom: 12,
        borderColor: primaryColor,
        fontFamily: fontBody,
      }}
      title={
        <span style={{ color: primaryColor, fontFamily: fontHeading }}>
          Demo ({demo.status})
        </span>
      }
      extra={
        !editing ? (
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={handleEdit}
            style={{ fontFamily: fontBody }}
          >
            Edit
          </Button>
        ) : (
          <Space>
            <Button
              icon={<SaveOutlined />}
              size="small"
              type="primary"
              loading={loading}
              onClick={handleSave}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
            >
              Save
            </Button>
            <Button
              icon={<CloseOutlined />}
              size="small"
              onClick={() => setEditing(false)}
              style={{ fontFamily: fontBody }}
            >
              Cancel
            </Button>
          </Space>
        )
      }
    >
      {!editing ? (
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          size="small"
          labelStyle={labelStyle}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Branch">{demo.branch_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Scheduled Date">
            {demo.scheduled_date ? new Date(demo.scheduled_date).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Scheduled Time">{demo.scheduled_time?.slice(0, 5) || '-'}</Descriptions.Item>
          <Descriptions.Item label="Conducted Date">
            {demo.conducted_date ? new Date(demo.conducted_date).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Conducted Time">{demo.conducted_time?.slice(0, 5) || '-'}</Descriptions.Item>
          <Descriptions.Item label="Duration (min)">{demo.duration_minutes || '-'}</Descriptions.Item>
          <Descriptions.Item label="Teacher">{demo.teacher_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusColors[demo.status] || 'default'} style={{ fontFamily: fontBody }}>
              {demo.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Outcome">{demo.outcome || '-'}</Descriptions.Item>
          <Descriptions.Item label="Attended By">{demo.attended_by || '-'}</Descriptions.Item>
          <Descriptions.Item label="Rescheduled">{demo.rescheduled}</Descriptions.Item>
          <Descriptions.Item label="Feedback" span={2}>{demo.feedback || '-'}</Descriptions.Item>
          <Descriptions.Item label="Teacher Remarks" span={2}>{demo.teacher_remarks || '-'}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Form form={form} layout="vertical">
          <Descriptions
            column={{ xs: 1, sm: 2 }}
            size="small"
            labelStyle={labelStyle}
            contentStyle={{ fontFamily: fontBody }}
          >
            <Descriptions.Item label="Branch">
              <Form.Item name="branch_id" noStyle>
                <BranchSelector style={{ width: '100%' }} />
              </Form.Item>
            </Descriptions.Item>
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
            <Descriptions.Item label="Duration (min)">
              <Form.Item name="duration" noStyle>
                <InputNumber min={1} style={{ width: '100%', fontFamily: fontBody }} />
              </Form.Item>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Form.Item name="status" noStyle>
                <Select style={{ width: '100%', fontFamily: fontBody }} dropdownStyle={{ fontFamily: fontBody }}>
                  <Option value="Scheduled">Scheduled</Option>
                  <Option value="Conducted">Conducted</Option>
                  <Option value="Rescheduled">Rescheduled</Option>
                  <Option value="Cancelled">Cancelled</Option>
                  <Option value="No-Show">No-Show</Option>
                </Select>
              </Form.Item>
            </Descriptions.Item>
            <Descriptions.Item label="Outcome">
              <Form.Item name="outcome" noStyle>
                <Select allowClear style={{ width: '100%', fontFamily: fontBody }} dropdownStyle={{ fontFamily: fontBody }}>
                  <Option value="Success">Success</Option>
                  <Option value="Fail">Fail</Option>
                  <Option value="Inconclusive">Inconclusive</Option>
                  <Option value="Reschedule Needed">Reschedule Needed</Option>
                </Select>
              </Form.Item>
            </Descriptions.Item>
            <Descriptions.Item label="Attended By">
              <Form.Item name="demo_attended_by" noStyle>
                <Select allowClear style={{ width: '100%', fontFamily: fontBody }} dropdownStyle={{ fontFamily: fontBody }}>
                  <Option value="Student">Student</Option>
                  <Option value="Parent">Parent</Option>
                  <Option value="Both">Both</Option>
                  <Option value="None">None</Option>
                </Select>
              </Form.Item>
            </Descriptions.Item>
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
  )
}

const DemoSessionsPanel = ({ inquiryId }) => {
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

const { data: demos, isLoading } = useQuery({
  queryKey: ['demos', inquiryId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('demo_sessions_view')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .order('scheduled_at', { ascending: false });
    if (error) throw error;
    // Map to the format expected by DemoCard
    return data?.map(item => ({
      demo_session_id: item.demo_session_id,
      scheduled_at: item.scheduled_at,
      conducted_at: item.conducted_at,
      status: item.status,
      outcome: item.outcome,
      feedback: item.feedback,
      teacher_id: item.teacher_id,
      inquiry_id: item.inquiry_id,
      duration_minutes: item.duration_minutes,
      attended_by: item.attended_by,
      teacher_remarks: item.teacher_remarks,
      branch_id: item.branch_id,
      branch_name: item.branch_name,
      course_name: item.course_name,
      teacher_name: item.teacher_name,
      scheduled_date: item.scheduled_at ? item.scheduled_at.split('T')[0] : null,
      scheduled_time: item.scheduled_at ? item.scheduled_at.split('T')[1]?.slice(0,5) : null,
      conducted_date: item.conducted_at ? item.conducted_at.split('T')[0] : null,
      conducted_time: item.conducted_at ? item.conducted_at.split('T')[1]?.slice(0,5) : null,
      rescheduled: item.status === 'Rescheduled' ? 'Yes' : 'No',
    })) || [];
  },
  enabled: !!inquiryId,
});

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['demos', inquiryId] })
    queryClient.invalidateQueries({ queryKey: ['inquiry', inquiryId] })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!demos || demos.length === 0) {
    return (
      <p style={{ fontFamily: fontBody, color: primaryColor }}>
        No demo sessions found for this inquiry.
      </p>
    )
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      {demos.map(demo => (
        <DemoCard key={demo.demo_session_id} demo={demo} inquiryId={inquiryId} onUpdate={handleUpdate} />
      ))}
    </div>
  )
}

export default DemoSessionsPanel