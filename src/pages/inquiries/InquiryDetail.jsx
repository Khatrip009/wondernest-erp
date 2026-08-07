import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Tabs, Descriptions, Tag, Button, Space, Spin, message, Typography
} from 'antd'
import {
  EditOutlined,
  CalendarOutlined,
  SwapOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useInquiry } from '../../hooks/useInquiries'
import { statusColors } from '../../utils/constants'
import InquiryTimeline from './InquiryTimeline'
import DemoSessionsList from './DemoSessionsPanel'
import DemoScheduleModal from './DemoScheduleModal'
import ConductDemoModal from './ConductDemoModal'
import ConvertToStudentModal from './ConvertToStudentModal'
import RejectInquiryModal from './RejectInquiryModal'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const { Title, Text } = Typography

const InquiryDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: inquiry, isLoading } = useInquiry(id)
  const { theme, darkMode } = useTheme()
  const { selectedBranch } = useScope()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false)
  const [conductModalVisible, setConductModalVisible] = useState(false)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedDemo, setSelectedDemo] = useState(null)

  // ✅ Fetch demo sessions for this inquiry – used for Conduct button and Convert check
  const { data: demos = [] } = useQuery({
    queryKey: ['inquiry-demos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_sessions')
        .select('*')
        .eq('inquiry_id', id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!inquiry) {
    return (
      <Card style={{ backgroundColor: cardBg }}>
        <p style={{ color: textColor, fontFamily: fontBody }}>Inquiry not found</p>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/inquiries')}
          style={{ fontFamily: fontBody, color: textColor, borderColor }}
        >
          Back to Inquiries
        </Button>
      </Card>
    )
  }

  const hasSuccessfulDemo = demos.some(
    (d) => d.status === 'Conducted' && d.outcome === 'Success'
  )

  const labelStyle = {
    color: primaryColor,
    fontWeight: 600,
    fontFamily: fontBody,
  }

  const contentStyle = {
    fontFamily: fontBody,
    color: textColor,
  }

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5' }}>
      <Card
        title={
          <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
            Inquiry #{inquiry.inquiry_no}
          </Title>
        }
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/inquiries')}
            style={{ fontFamily: fontBody, color: primaryColor, borderColor: primaryColor }}
          >
            Back
          </Button>
        }
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Tabs defaultActiveKey="details">
          <Tabs.TabPane tab={<span style={{ fontFamily: fontBody }}>Details</span>} key="details">
            {/* Name Section */}
            <Text strong style={{ color: primaryColor, fontFamily: fontBody }}>Name</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2, md: 4 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="Prefix">{inquiry.salutation || '-'}</Descriptions.Item>
              <Descriptions.Item label="First Name">
                {inquiry.student_name?.split(' ')[0] || inquiry.student_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Last Name">
                {inquiry.student_name?.split(' ').slice(1).join(' ') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Suffix">{inquiry.suffix || '-'}</Descriptions.Item>
            </Descriptions>

            <Descriptions
              bordered
              column={{ xs: 1, sm: 2, md: 3 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="Gender">{inquiry.student_gender || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {inquiry.student_dob ? new Date(inquiry.student_dob).toLocaleDateString() : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* Contact Section */}
            <Text strong style={{ color: primaryColor, fontFamily: fontBody }}>Contact</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="Mobile">{inquiry.mobile}</Descriptions.Item>
              <Descriptions.Item label="WhatsApp">{inquiry.whatsapp || '-'}</Descriptions.Item>
              <Descriptions.Item label="Alternate Phone">{inquiry.alternate_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{inquiry.email || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Address Section */}
            <Text strong style={{ color: primaryColor, fontFamily: fontBody }}>Address</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="Address">{inquiry.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="City">{inquiry.city || '-'}</Descriptions.Item>
              <Descriptions.Item label="State">{inquiry.state || '-'}</Descriptions.Item>
              <Descriptions.Item label="Pincode">{inquiry.pincode || '-'}</Descriptions.Item>
            </Descriptions>

            {/* School Info Section */}
            <Text strong style={{ color: primaryColor, fontFamily: fontBody }}>School Info</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2, md: 3 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="School Name">{inquiry.school_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Board">{inquiry.board || '-'}</Descriptions.Item>
              <Descriptions.Item label="Standard">{inquiry.standard || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Course & Source */}
            <Text strong style={{ color: primaryColor, fontFamily: fontBody }}>Course & Source</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="Interested Course">
                {inquiry.course_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Source">{inquiry.source_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Parent Name">{inquiry.parent_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Follow-up Date">
                {inquiry.followup_date ? new Date(inquiry.followup_date).toLocaleDateString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[inquiry.status]}>{inquiry.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Remarks" span={2}>
                {inquiry.remarks || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>

          <Tabs.TabPane tab={<span style={{ fontFamily: fontBody }}>Demo Sessions</span>} key="demos">
            <DemoSessionsList inquiryId={inquiry.id} />
          </Tabs.TabPane>

          <Tabs.TabPane tab={<span style={{ fontFamily: fontBody }}>Timeline</span>} key="timeline">
            <InquiryTimeline inquiryId={inquiry.id} />
          </Tabs.TabPane>
        </Tabs>

        {/* Action buttons */}
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/inquiries/${id}/edit`)}
            style={{ fontFamily: fontBody, color: primaryColor, borderColor: primaryColor }}
          >
            Edit
          </Button>

          {inquiry.status === 'Contacted' && (
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => setScheduleModalVisible(true)}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
            >
              Schedule Demo
            </Button>
          )}

          {/* ✅ Conduct Demo – uses fetched demos, works regardless of inquiry.status */}
          {demos.some(d => d.status === 'Scheduled') && (
            <Button
              type="primary"
              onClick={() => {
                const upcomingDemo = demos.find(d => d.status === 'Scheduled');
                setSelectedDemo(upcomingDemo);
                setConductModalVisible(true);
              }}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
            >
              Conduct Demo
            </Button>
          )}

          {inquiry.status === 'Demo Conducted' && hasSuccessfulDemo && (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setConvertModalVisible(true)}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
            >
              Convert to Student
            </Button>
          )}

          {inquiry.status === 'Demo Conducted' && (
            <Button
              danger
              onClick={() => setRejectModalVisible(true)}
              style={{ fontFamily: fontBody }}
            >
              Reject
            </Button>
          )}

          <Button
            onClick={() => navigate(`/inquiries/${id}/journey`)}
            style={{ fontFamily: fontBody, color: textColor, borderColor }}
          >
            View Journey
          </Button>
          <Button
            danger
            onClick={() => message.info('Mark lost/rejected – coming soon')}
            style={{ fontFamily: fontBody }}
          >
            Mark Lost/Rejected
          </Button>
        </div>
      </Card>

      {/* Modals */}
      <DemoScheduleModal
        open={scheduleModalVisible}
        inquiryId={inquiry.id}
        onClose={() => setScheduleModalVisible(false)}
      />
      <ConductDemoModal
        open={conductModalVisible}
        demo={selectedDemo}
        inquiryId={inquiry.id}
        onClose={() => {
          setConductModalVisible(false)
          setSelectedDemo(null)
        }}
      />
      <ConvertToStudentModal
        open={convertModalVisible}
        inquiry={inquiry}
        onClose={() => setConvertModalVisible(false)}
      />
      <RejectInquiryModal
        open={rejectModalVisible}
        inquiry={inquiry}
        onClose={() => setRejectModalVisible(false)}
      />
    </div>
  )
}

export default InquiryDetail