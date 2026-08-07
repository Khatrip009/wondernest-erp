import { useParams, useNavigate } from 'react-router-dom'
import { Card, Timeline, Typography, Descriptions, Tag, Button, Space, Spin, Result } from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { statusColors } from '../../utils/constants'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const InquiryJourney = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['inquiry-journey', id],
    queryFn: async () => {
      // 1. Fetch inquiry details with joins
      const { data: inquiry, error: inquiryError } = await supabase
        .from('inquiries')
        .select(`
          id,
          inquiry_no,
          student_name,
          parent_name,
          mobile,
          email,
          source,
          status,
          created_at,
          converted_at,
          converted_student_id,
          interested_course_id,
          source_id,
          branch_id,
          demo_scheduled_at,
          remarks,
          followup_date,
          courses ( name ),
          inquiry_sources ( name ),
          branches ( branch_name )
        `)
        .eq('id', id)
        .single()

      if (inquiryError) throw inquiryError

      // 2. Fetch demo sessions (without teacher join)
      const { data: demos, error: demosError } = await supabase
        .from('demo_sessions')
        .select(`
          id,
          scheduled_at,
          conducted_at,
          status,
          outcome,
          feedback,
          teacher_remarks,
          duration_minutes,
          attended_by,
          teacher_id
        `)
        .eq('inquiry_id', id)
        .order('scheduled_at', { ascending: true })

      if (demosError) throw demosError

      // 3. Fetch teachers for the demo sessions
      const teacherIds = demos?.map(d => d.teacher_id).filter(Boolean) || []
      let teachers = {}
      if (teacherIds.length) {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('id, first_name, last_name')
          .in('id', teacherIds)
        if (!teacherError) {
          teachers = teacherData.reduce((acc, t) => {
            acc[t.id] = `${t.first_name} ${t.last_name}`.trim()
            return acc
          }, {})
        }
      }

      // 4. Build events array
      const events = []

      // Inquiry Created
      events.push({
        event_type: 'Inquiry Created',
        event_time: inquiry.created_at,
        inquiry_no: inquiry.inquiry_no,
        student_name: inquiry.student_name,
        parent_name: inquiry.parent_name,
        mobile: inquiry.mobile,
        email: inquiry.email,
        source_name: inquiry.inquiry_sources?.name,
        course_name: inquiry.courses?.name,
        branch_name: inquiry.branches?.branch_name,
        current_inquiry_status: inquiry.status,
        remarks: inquiry.remarks,
        followup_date: inquiry.followup_date,
      })

      // Demo events
      demos.forEach(demo => {
        const eventType = demo.status === 'Scheduled' ? 'Demo Scheduled' :
                          demo.status === 'Conducted' ? 'Demo Conducted' : 'Demo Status Unknown'
        const teacherName = teachers[demo.teacher_id] || null

        events.push({
          event_type: eventType,
          event_time: demo.status === 'Scheduled' ? demo.scheduled_at : demo.conducted_at || demo.scheduled_at,
          demo_scheduled_at: demo.scheduled_at,
          demo_conducted_at: demo.conducted_at,
          demo_current_status: demo.status,
          demo_outcome: demo.outcome,
          demo_feedback: demo.feedback,
          teacher_remarks: demo.teacher_remarks,
          duration_minutes: demo.duration_minutes,
          attended_by: demo.attended_by,
          teacher_name: teacherName,
          inquiry_no: inquiry.inquiry_no,
          student_name: inquiry.student_name,
          current_inquiry_status: inquiry.status,
        })
      })

      // Converted event
      if (inquiry.converted_at) {
        events.push({
          event_type: 'Converted',
          event_time: inquiry.converted_at,
          converted_at: inquiry.converted_at,
          converted_student_id: inquiry.converted_student_id,
          inquiry_no: inquiry.inquiry_no,
          student_name: inquiry.student_name,
          current_inquiry_status: inquiry.status,
        })
      }

      // Sort by time
      events.sort((a, b) => new Date(a.event_time) - new Date(b.event_time))
      return events
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }
  if (error) {
    return (
      <Result
        status="error"
        title="Failed to load journey"
        subTitle={error.message}
        style={{ fontFamily: fontBody }}
      />
    )
  }
  if (!events || events.length === 0) {
    return (
      <Result
        status="info"
        title="No events found"
        extra={
          <Button
            onClick={() => navigate(-1)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            Go Back
          </Button>
        }
        style={{ fontFamily: fontBody }}
      />
    )
  }

  const firstEvent = events[0]
  const inquiryInfo = {
    inquiry_no: firstEvent.inquiry_no,
    student_name: firstEvent.student_name,
    parent_name: firstEvent.parent_name,
    mobile: firstEvent.mobile,
    email: firstEvent.email,
    source: firstEvent.source_name,
    course: firstEvent.course_name,
    branch: firstEvent.branch_name,
    status: firstEvent.current_inquiry_status,
  }

  const eventIcon = (type) => {
    switch (type) {
      case 'Inquiry Created': return <CheckCircleOutlined style={{ color: '#1677ff' }} />
      case 'Demo Scheduled': return <CalendarOutlined style={{ color: '#faad14' }} />
      case 'Demo Conducted': return <ClockCircleOutlined style={{ color: '#722ed1' }} />
      case 'Converted': return <UserSwitchOutlined style={{ color: '#52c41a' }} />
      default: return null
    }
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/inquiries/${id}`)}
          style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
        >
          Back to Inquiry
        </Button>
      </Space>

      <Card
        title={
          <Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>
            Inquiry #{inquiryInfo.inquiry_no}
          </Text>
        }
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: 16,
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, md: 3 }}
          labelStyle={{ color: primaryColor, fontWeight: 500, fontFamily: fontBody }}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Student">{inquiryInfo.student_name}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{inquiryInfo.mobile}</Descriptions.Item>
          <Descriptions.Item label="Email">{inquiryInfo.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Source">{inquiryInfo.source || '-'}</Descriptions.Item>
          <Descriptions.Item label="Course">{inquiryInfo.course || '-'}</Descriptions.Item>
          <Descriptions.Item label="Branch">{inquiryInfo.branch || '-'}</Descriptions.Item>
          <Descriptions.Item label="Current Status">
            <Tag color={statusColors[inquiryInfo.status]} style={{ fontFamily: fontBody }}>
              {inquiryInfo.status}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Timeline mode="left">
          {events.map((event, idx) => (
            <Timeline.Item
              key={idx}
              dot={eventIcon(event.event_type)}
              color={
                event.event_type === 'Converted' ? 'green' :
                event.event_type === 'Demo Conducted' ? 'purple' :
                event.event_type === 'Demo Scheduled' ? 'orange' :
                'blue'
              }
            >
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: 15, color: primaryColor, fontFamily: fontHeading }}>
                  {event.event_type}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12, fontFamily: fontBody }}>
                  {dayjs(event.event_time).format('DD MMM YYYY, hh:mm A')}
                </Text>
              </div>

              {event.event_type === 'Inquiry Created' && (
                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  style={{ marginBottom: 8 }}
                  labelStyle={{ color: primaryColor, fontWeight: 500, fontFamily: fontBody }}
                  contentStyle={{ fontFamily: fontBody, color: primaryColor }}
                >
                  <Descriptions.Item label="Remarks">{event.remarks || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Follow-up Date">
                    {event.followup_date ? dayjs(event.followup_date).format('DD-MM-YY') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              )}

              {event.event_type === 'Demo Scheduled' && (
                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  style={{ marginBottom: 8 }}
                  labelStyle={{ color: primaryColor, fontWeight: 500, fontFamily: fontBody }}
                  contentStyle={{ fontFamily: fontBody, color: primaryColor }}
                >
                  <Descriptions.Item label="Teacher">{event.teacher_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Scheduled At">
                    {event.demo_scheduled_at ? dayjs(event.demo_scheduled_at).format('DD MMM YYYY, hh:mm A') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Duration">{event.duration_minutes ? `${event.duration_minutes} min` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Demo Status">{event.demo_current_status || '-'}</Descriptions.Item>
                </Descriptions>
              )}

              {event.event_type === 'Demo Conducted' && (
                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  style={{ marginBottom: 8 }}
                  labelStyle={{ color: primaryColor, fontWeight: 500, fontFamily: fontBody }}
                  contentStyle={{ fontFamily: fontBody, color: primaryColor }}
                >
                  <Descriptions.Item label="Teacher">{event.teacher_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Conducted At">
                    {event.demo_conducted_at ? dayjs(event.demo_conducted_at).format('DD MMM YYYY, hh:mm A') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Outcome">{event.demo_outcome || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Feedback">{event.demo_feedback || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Teacher Remarks">{event.teacher_remarks || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Attended By">{event.attended_by || '-'}</Descriptions.Item>
                </Descriptions>
              )}

              {event.event_type === 'Converted' && (
                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  style={{ marginBottom: 8 }}
                  labelStyle={{ color: primaryColor, fontWeight: 500, fontFamily: fontBody }}
                  contentStyle={{ fontFamily: fontBody, color: primaryColor }}
                >
                  <Descriptions.Item label="Converted At">
                    {event.converted_at ? dayjs(event.converted_at).format('DD MMM YYYY, hh:mm A') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Student ID">{event.converted_student_id || '-'}</Descriptions.Item>
                </Descriptions>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    </div>
  )
}

export default InquiryJourney