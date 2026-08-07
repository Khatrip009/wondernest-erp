import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Tabs, Descriptions, Tag, Button, Space, Spin, message, Typography, Divider
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

const { Title, Text } = Typography

const InquiryDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: inquiry, isLoading } = useInquiry(id)

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false)
  const [conductModalVisible, setConductModalVisible] = useState(false)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedDemo, setSelectedDemo] = useState(null)

  const primaryColor = 'var(--primary-color, #1677ff)'

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!inquiry) {
    return (
      <Card>
        <p>Inquiry not found</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inquiries')}>
          Back to Inquiries
        </Button>
      </Card>
    )
  }

  // Determine if a successful demo exists
  const hasSuccessfulDemo = inquiry.demo_sessions?.some(
    (d) => d.status === 'Conducted' && d.outcome === 'Success'
  )

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <Card
        title={
          <Title level={4} style={{ color: primaryColor, margin: 0 }}>
            Inquiry #{inquiry.inquiry_no}
          </Title>
        }
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/inquiries')}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            Back
          </Button>
        }
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Tabs defaultActiveKey="details">
          <Tabs.TabPane tab="Details" key="details">
            {/* Name Section */}
            <Text strong style={{ color: primaryColor }}>Name</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2, md: 4 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 500 }}
            >
              <Descriptions.Item label="Prefix">{inquiry.salutation || '-'}</Descriptions.Item>
              <Descriptions.Item label="First Name">{inquiry.student_name?.split(' ')[0] || inquiry.student_name}</Descriptions.Item>
              <Descriptions.Item label="Last Name">{inquiry.student_name?.split(' ').slice(1).join(' ') || '-'}</Descriptions.Item>
              <Descriptions.Item label="Suffix">{inquiry.suffix || '-'}</Descriptions.Item>
            </Descriptions>

            <Descriptions
              bordered
              column={{ xs: 1, sm: 2, md: 3 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 500 }}
            >
              <Descriptions.Item label="Gender">{inquiry.student_gender || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {inquiry.student_dob ? new Date(inquiry.student_dob).toLocaleDateString() : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* Contact Section */}
            <Text strong style={{ color: primaryColor }}>Contact</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 500 }}
            >
              <Descriptions.Item label="Mobile">{inquiry.mobile}</Descriptions.Item>
              <Descriptions.Item label="WhatsApp">{inquiry.whatsapp || '-'}</Descriptions.Item>
              <Descriptions.Item label="Alternate Phone">{inquiry.alternate_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{inquiry.email || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Address Section */}
            <Text strong style={{ color: primaryColor }}>Address</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 500 }}
            >
              <Descriptions.Item label="Address">{inquiry.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="City">{inquiry.city || '-'}</Descriptions.Item>
              <Descriptions.Item label="State">{inquiry.state || '-'}</Descriptions.Item>
              <Descriptions.Item label="Pincode">{inquiry.pincode || '-'}</Descriptions.Item>
            </Descriptions>

            {/* School Info Section */}
            <Text strong style={{ color: primaryColor }}>School Info</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2, md: 3 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 500 }}
            >
              <Descriptions.Item label="School Name">{inquiry.school_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Board">{inquiry.board || '-'}</Descriptions.Item>
              <Descriptions.Item label="Standard">{inquiry.standard || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Course & Source */}
            <Text strong style={{ color: primaryColor }}>Course & Source</Text>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 500 }}
            >
              <Descriptions.Item label="Interested Course">
                {inquiry.courses?.name || '-'}  {/* ✅ Fixed: use 'name' instead of 'course_name' */}
              </Descriptions.Item>
              <Descriptions.Item label="Source">{inquiry.inquiry_sources?.name || '-'}</Descriptions.Item>
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

          <Tabs.TabPane tab="Demo Sessions" key="demos">
            <DemoSessionsList inquiryId={inquiry.id} />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Timeline" key="timeline">
            <InquiryTimeline inquiryId={inquiry.id} />
          </Tabs.TabPane>
        </Tabs>

        {/* Action buttons */}
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/inquiries/${id}/edit`)}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            Edit
          </Button>

          {inquiry.status === 'Contacted' && (
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => setScheduleModalVisible(true)}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Schedule Demo
            </Button>
          )}

          {inquiry.status === 'Demo Scheduled' && (
            <Button
              type="primary"
              onClick={() => {
                const upcomingDemo = inquiry.demo_sessions?.find(d => d.status === 'Scheduled')
                if (upcomingDemo) {
                  setSelectedDemo(upcomingDemo)
                  setConductModalVisible(true)
                } else {
                  message.warning('No scheduled demo found')
                }
              }}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Conduct Demo
            </Button>
          )}

          {inquiry.status === 'Demo Conducted' && hasSuccessfulDemo && (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setConvertModalVisible(true)}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Convert to Student
            </Button>
          )}

          {inquiry.status === 'Demo Conducted' && (
            <Button
              danger
              onClick={() => setRejectModalVisible(true)}
            >
              Reject
            </Button>
          )}

          <Button onClick={() => navigate(`/inquiries/${id}/journey`)}>View Journey</Button>
          <Button danger onClick={() => message.info('Mark lost/rejected – coming soon')}>
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