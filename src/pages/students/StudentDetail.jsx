import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Space, Spin, Typography, message
} from 'antd'
import {
  EditOutlined, ArrowLeftOutlined, DollarOutlined, FilePdfOutlined
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import AddFeePaymentModal from './AddFeePaymentModal'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const StudentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const outletContext = useOutletContext()
  const { selectedBranch, selectedFinancialYear } = outletContext || {}   // not used in query, but kept for context

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [paymentModalVisible, setPaymentModalVisible] = useState(false)

  // ✅ Fetch student by ID only – no branch/year filtering (always returns the record)
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_detail_view')
        .select('*')
        .eq('student_id', id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  }

  if (!student) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <p style={{ fontFamily: fontBody, color: primaryColor }}>Student not found</p>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/students')}
          style={{ fontFamily: fontBody }}
        >
          Back to Students
        </Button>
      </Card>
    )
  }

  // Determine course / batch / level to display (fallback to direct)
  const displayCourse = student.course_name || student.direct_course_name || '-'
  const displayBatch = student.batch_name || '-'
  const displayLevel = student.direct_level_name || '-'

  const labelStyle = {
    color: primaryColor,
    fontWeight: 600,
    fontFamily: fontBody,
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/students')}
          style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
        >
          Back
        </Button>
      </Space>

      <Card
        title={
          <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
            Student Details
          </Title>
        }
        extra={
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/students/${id}/edit`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            Edit
          </Button>
        }
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: 16,
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        {/* Personal Information */}
        <Text strong style={{ color: primaryColor, fontFamily: fontHeading, fontSize: 15 }}>Personal Information</Text>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          style={{ marginBottom: 16, marginTop: 8 }}
          labelStyle={labelStyle}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Admission No">{student.admission_no || '-'}</Descriptions.Item>
          <Descriptions.Item label="Full Name">{student.full_name_formatted}</Descriptions.Item>
          <Descriptions.Item label="Gender">{student.gender || '-'}</Descriptions.Item>
          <Descriptions.Item label="Date of Birth">{student.dob ? dayjs(student.dob).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{student.mobile}</Descriptions.Item>
          <Descriptions.Item label="Email">{student.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Organisation">{student.organization_name || '-'}</Descriptions.Item>
        </Descriptions>

        {/* Address */}
        <Text strong style={{ color: primaryColor, fontFamily: fontHeading, fontSize: 15 }}>Address</Text>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2 }}
          size="small"
          style={{ marginBottom: 16, marginTop: 8 }}
          labelStyle={labelStyle}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Address">{student.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="City">{student.city || '-'}</Descriptions.Item>
          <Descriptions.Item label="State">{student.state || '-'}</Descriptions.Item>
          <Descriptions.Item label="Pincode">{student.pincode || '-'}</Descriptions.Item>
        </Descriptions>

        {/* Parent Details */}
        <Text strong style={{ color: primaryColor, fontFamily: fontHeading, fontSize: 15 }}>Parent / Guardian</Text>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          style={{ marginBottom: 16, marginTop: 8 }}
          labelStyle={labelStyle}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Father Name">{student.father_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Mother Name">{student.mother_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Parent Mobile">{student.parent_mobile || '-'}</Descriptions.Item>
          <Descriptions.Item label="Parent Email">{student.parent_email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Occupation">{student.parent_occupation || '-'}</Descriptions.Item>
          <Descriptions.Item label="Parent Address">{student.parent_address || '-'}</Descriptions.Item>
        </Descriptions>

        {/* School Info */}
        <Text strong style={{ color: primaryColor, fontFamily: fontHeading, fontSize: 15 }}>School Information</Text>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          style={{ marginBottom: 16, marginTop: 8 }}
          labelStyle={labelStyle}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="School Name">{student.school_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Board">{student.board || '-'}</Descriptions.Item>
          <Descriptions.Item label="Standard">{student.standard || '-'}</Descriptions.Item>
        </Descriptions>

        {/* Enrollment Summary (with fallback) */}
        <Text strong style={{ color: primaryColor, fontFamily: fontHeading, fontSize: 15 }}>Enrollment Summary</Text>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          style={{ marginBottom: 16, marginTop: 8 }}
          labelStyle={labelStyle}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Course">{displayCourse}</Descriptions.Item>
          <Descriptions.Item label="Batch">{displayBatch}</Descriptions.Item>
          <Descriptions.Item label="Level">{displayLevel}</Descriptions.Item>
          <Descriptions.Item label="Student Status">
            <Tag color={student.student_status === 'active' ? 'green' : 'red'} style={{ fontFamily: fontBody }}>
              {student.student_status || '-'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* Fee Information */}
        <Text strong style={{ color: primaryColor, fontFamily: fontHeading, fontSize: 15 }}>Fee Information</Text>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          style={{ marginBottom: 16, marginTop: 8 }}
          labelStyle={labelStyle}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Service / Course">{student.service_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Base Fee">₹{student.service_base_fee ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Tax Rate">{student.service_tax_rate ?? 0}%</Descriptions.Item>
          <Descriptions.Item label="Total Fee">₹{student.total_fee ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Discount">₹{student.discount ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Final Fee">₹{student.final_fee ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Fee Status">
            <Tag color={student.fee_status === 'Paid' ? 'green' : student.fee_status === 'Partially Paid' ? 'orange' : 'volcano'} style={{ fontFamily: fontBody }}>
              {student.fee_status || '-'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">{student.due_date ? dayjs(student.due_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Paid Amount">₹{student.paid_amount ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Balance Due">₹{student.balance_due ?? 0}</Descriptions.Item>
        </Descriptions>

        {/* Action buttons */}
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/students/${id}/edit`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            Edit
          </Button>
          
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => navigate(`/students/${id}/admission-form`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            Admission Form
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => navigate(`/students/${id}/student-info`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            Student Info Form
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => navigate(`/students/${id}/invoices`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            View Invoices
          </Button>
        </div>
      </Card>

      <AddFeePaymentModal
        open={paymentModalVisible}
        studentFeeId={student.fee_id}
        onClose={() => {
          setPaymentModalVisible(false)
          queryClient.invalidateQueries({ queryKey: ['student', id] })
        }}
      />
    </div>
  )
}

export default StudentDetail