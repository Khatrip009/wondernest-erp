// StudentDetail.jsx – robust error handling
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Space, Spin, Typography, message
} from 'antd'
import {
  EditOutlined, ArrowLeftOutlined, FilePdfOutlined
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
  const { theme, darkMode } = useTheme()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const labelColor = primaryColor

  const [paymentModalVisible, setPaymentModalVisible] = useState(false)

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      if (!id) return null

      // 1. Fetch student – this is required; if fails, throw
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .maybeSingle()  // use maybeSingle to avoid 406 if no row

      if (studentError) throw studentError
      if (!studentData) return null  // student not found

      // Helper to safely fetch optional data
      const safeFetch = async (promise) => {
        try {
          const result = await promise
          return result?.data || null
        } catch (err) {
          console.warn('Optional fetch failed:', err.message)
          return null
        }
      }

      // 2. Parent
      let parent = null
      if (studentData.parent_id) {
        const parentData = await safeFetch(
          supabase
            .from('parents')
            .select('father_name, mother_name, mobile, email, occupation, address')
            .eq('id', studentData.parent_id)
            .maybeSingle()
        )
        parent = parentData
      }

      // 3. Enrollment (active)
      let enrollment = null
      const enrollmentData = await safeFetch(
        supabase
          .from('student_enrollments')
          .select(`
            batch_id,
            enrollment_date,
            current_level_id,
            batches ( batch_name, course_id, courses ( name ) ),
            course_levels ( name )
          `)
          .eq('student_id', id)
          .eq('status', 'active')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
      enrollment = enrollmentData

      let batchName = null
      let courseName = null
      let levelName = null
      if (enrollment) {
        batchName = enrollment.batches?.batch_name || null
        courseName = enrollment.batches?.courses?.name || null
        levelName = enrollment.course_levels?.name || null
      }

      // Fallback to student's direct course/level
      if (!courseName && studentData.course_id) {
        const courseData = await safeFetch(
          supabase.from('courses').select('name').eq('id', studentData.course_id).maybeSingle()
        )
        courseName = courseData?.name || null
      }
      if (!levelName && studentData.level_id) {
        const levelData = await safeFetch(
          supabase.from('course_levels').select('name').eq('id', studentData.level_id).maybeSingle()
        )
        levelName = levelData?.name || null
      }

      // 4. Latest fee
      let fee = null
      const feeData = await safeFetch(
        supabase
          .from('student_fees')
          .select('*')
          .eq('student_id', id)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
      fee = feeData

      // 5. Service details
      let service = null
      if (fee?.service_id) {
        const serviceData = await safeFetch(
          supabase
            .from('inventory_items')
            .select('item_name, unit_price, tax_rates(rate)')
            .eq('id', fee.service_id)
            .maybeSingle()
        )
        service = serviceData
      }

      // 6. Organization name
      let orgInfo = null
      if (studentData.organization_id) {
        const orgData = await safeFetch(
          supabase.from('organization').select('company_name').eq('id', studentData.organization_id).maybeSingle()
        )
        orgInfo = orgData
      }

      // Build flat object
      return {
        student_id: studentData.id,
        admission_form_number: studentData.admission_form_number || null,
        full_name_formatted: studentData.full_name_formatted || null,
        gender: studentData.gender || null,
        dob: studentData.dob || null,
        mobile: studentData.mobile || null,
        email: studentData.email || null,
        organization_name: orgInfo?.company_name || null,
        address: studentData.address || null,
        city: studentData.city || null,
        state: studentData.state || null,
        pincode: studentData.pincode || null,
        father_name: parent?.father_name || null,
        mother_name: parent?.mother_name || null,
        parent_mobile: parent?.mobile || null,
        parent_email: parent?.email || null,
        parent_occupation: parent?.occupation || null,
        parent_address: parent?.address || null,
        school_name: studentData.school_name || null,
        board: studentData.board || null,
        standard: studentData.standard || null,
        course_name: courseName || null,
        batch_name: batchName || null,
        level_name: levelName || null,
        student_status: studentData.status || null,
        service_name: service?.item_name || null,
        service_base_fee: service?.unit_price || 0,
        service_tax_rate: service?.tax_rates?.[0]?.rate || 0,
        total_fee: fee?.total_fee || 0,
        discount: fee?.discount || 0,
        final_fee: fee?.final_fee || 0,
        fee_status: fee?.status || null,
        due_date: fee?.due_date || null,
        paid_amount: fee?.paid_amount || 0,
        balance_due: fee?.balance_due || 0,
        fee_id: fee?.id || null,
      }
    },
    enabled: !!id,
  })

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  }

  if (error) {
    return (
      <Card style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
        <p style={{ fontFamily: fontBody, color: textColor }}>Error loading student: {error.message}</p>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/students')}
          style={{ fontFamily: fontBody, color: textColor, borderColor }}
        >
          Back to Students
        </Button>
      </Card>
    )
  }

  if (!student) {
    return (
      <Card style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
        <p style={{ fontFamily: fontBody, color: textColor }}>Student not found</p>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/students')}
          style={{ fontFamily: fontBody, color: textColor, borderColor }}
        >
          Back to Students
        </Button>
      </Card>
    )
  }

  // ... rest of the component (Descriptions, buttons) remains unchanged from your original
  // (The JSX after this point is the same as before)
  // (I'll include it here for completeness, but you can keep your existing JSX)

  const displayCourse = student.course_name || '-'
  const displayBatch = student.batch_name || '-'
  const displayLevel = student.level_name || '-'

  const labelStyle = {
    color: labelColor,
    fontWeight: 600,
    fontFamily: fontBody,
    backgroundColor: darkMode ? '#2c2c2c' : '#fafafa',
  }

  const contentStyle = {
    fontFamily: fontBody,
    color: textColor,
    backgroundColor: cardBg,
  }

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
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
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: 16,
          borderTop: `4px solid ${primaryColor}`,
          borderColor,
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
          contentStyle={contentStyle}
        >
          <Descriptions.Item label="Adm. Form No">
            {student.admission_form_number || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Full Name">{student.full_name_formatted}</Descriptions.Item>
          <Descriptions.Item label="Gender">{student.gender || '-'}</Descriptions.Item>
          <Descriptions.Item label="Date of Birth">
            {student.dob ? dayjs(student.dob).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
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
          contentStyle={contentStyle}
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
          contentStyle={contentStyle}
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
          contentStyle={contentStyle}
        >
          <Descriptions.Item label="School Name">{student.school_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Board">{student.board || '-'}</Descriptions.Item>
          <Descriptions.Item label="Standard">{student.standard || '-'}</Descriptions.Item>
        </Descriptions>

        {/* Enrollment Summary */}
        <Text strong style={{ color: primaryColor, fontFamily: fontHeading, fontSize: 15 }}>Enrollment Summary</Text>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          style={{ marginBottom: 16, marginTop: 8 }}
          labelStyle={labelStyle}
          contentStyle={contentStyle}
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
          contentStyle={contentStyle}
        >
          <Descriptions.Item label="Service / Course">{student.service_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Base Fee">₹{student.service_base_fee ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Tax Rate">{student.service_tax_rate ?? 0}%</Descriptions.Item>
          <Descriptions.Item label="Total Fee">₹{student.total_fee ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Discount">₹{student.discount ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Final Fee">₹{student.final_fee ?? 0}</Descriptions.Item>
          <Descriptions.Item label="Fee Status">
            <Tag
              color={
                student.fee_status === 'Paid' ? 'green' :
                student.fee_status === 'Partially Paid' ? 'orange' :
                'volcano'
              }
              style={{ fontFamily: fontBody }}
            >
              {student.fee_status || '-'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">
            {student.due_date ? dayjs(student.due_date).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
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