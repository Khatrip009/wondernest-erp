import { Timeline, Typography, Tag, Skeleton, Alert } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { useInquiryHistory } from '../../hooks/useInquiries'
import { statusColors } from '../../utils/constants'

const { Text } = Typography

const InquiryTimeline = ({ inquiryId }) => {
  const { data: events, isLoading, error } = useInquiryHistory(inquiryId)

  if (isLoading) return <Skeleton active />

  if (error) {
    console.error('Timeline error:', error);
    return <Alert message="Error loading timeline" description={error.message} type="error" showIcon />;
  }

  if (!events || events.length === 0) {
    return <div>No events found</div>
  }

  return (
    <Timeline>
      {events.map((event, index) => (
        <Timeline.Item
          key={index}
          color={
            event.event_type === 'Converted' ? 'green' :
            event.event_type === 'Demo Conducted' ? 'blue' :
            event.event_type === 'Demo Scheduled' ? 'orange' :
            'gray'
          }
          dot={event.event_type === 'Converted' ? <ClockCircleOutlined /> : null}
        >
          <div>
            <Text strong>{event.event_type}</Text>
            <br />
            <Text type="secondary">{new Date(event.event_time).toLocaleString()}</Text>
            {event.current_inquiry_status && (
              <Tag color={statusColors[event.current_inquiry_status]} style={{ marginLeft: 8 }}>
                {event.current_inquiry_status}
              </Tag>
            )}

            {/* Inquiry Created details */}
            {event.event_type === 'Inquiry Created' && (
              <>
                {event.course_name && <div><Text type="secondary">Course: </Text>{event.course_name}</div>}
                {event.source_name && <div><Text type="secondary">Source: </Text>{event.source_name}</div>}
                {event.branch_name && <div><Text type="secondary">Branch: </Text>{event.branch_name}</div>}
                {event.remarks && <div><Text type="secondary">Remarks: </Text>{event.remarks}</div>}
                {event.followup_date && <div><Text type="secondary">Follow-up: </Text>{new Date(event.followup_date).toLocaleDateString()}</div>}
              </>
            )}

            {/* Demo Scheduled details */}
            {event.event_type === 'Demo Scheduled' && (
              <>
                {event.teacher_name && <div><Text type="secondary">Teacher: </Text>{event.teacher_name}</div>}
                {event.demo_scheduled_at && <div><Text type="secondary">Scheduled: </Text>{new Date(event.demo_scheduled_at).toLocaleString()}</div>}
                {event.duration_minutes && <div><Text type="secondary">Duration: </Text>{event.duration_minutes} min</div>}
              </>
            )}

            {/* Demo Conducted details */}
            {event.event_type === 'Demo Conducted' && (
              <>
                {event.teacher_name && <div><Text type="secondary">Teacher: </Text>{event.teacher_name}</div>}
                {event.demo_conducted_at && <div><Text type="secondary">Conducted: </Text>{new Date(event.demo_conducted_at).toLocaleString()}</div>}
                {event.demo_outcome && <div><Text type="secondary">Outcome: </Text>{event.demo_outcome}</div>}
                {event.demo_feedback && <div><Text type="secondary">Feedback: </Text>{event.demo_feedback}</div>}
                {event.teacher_remarks && <div><Text type="secondary">Teacher Remarks: </Text>{event.teacher_remarks}</div>}
                {event.attended_by && <div><Text type="secondary">Attended By: </Text>{event.attended_by}</div>}
              </>
            )}

            {/* Converted details */}
            {event.event_type === 'Converted' && (
              <>
                {event.converted_at && <div><Text type="secondary">Converted: </Text>{new Date(event.converted_at).toLocaleString()}</div>}
                {event.converted_student_id && <div><Text type="secondary">Student ID: </Text>{event.converted_student_id}</div>}
              </>
            )}
          </div>
        </Timeline.Item>
      ))}
    </Timeline>
  )
}

export default InquiryTimeline