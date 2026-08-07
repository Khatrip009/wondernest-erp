// AdmissionForm.jsx (fixed - no longer depends on student_detail_view)
import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Space, Spin, Typography, Descriptions, Divider,
  message, Row, Col, Image
} from 'antd'
import {
  ArrowLeftOutlined, DownloadOutlined, PrinterOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportAdmissionPDF } from '../../utils/exportAdmissionPDF'

const { Title, Text } = Typography

const AdmissionForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const [loadingPDF, setLoadingPDF] = useState(false)

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const bgColor = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  // ✅ Fetch student details, parent, fee, and enrollment info directly
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-admission-form', id],
    queryFn: async () => {
      if (!id) return null

      // 1. Fetch student record
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()
      if (studentError) throw studentError

      let parent = null
      let fee = null
      let enrollment = null

      // 2. Fetch parent (if parent_id exists)
      if (studentData.parent_id) {
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('father_name, mother_name, mobile, email, address')
          .eq('id', studentData.parent_id)
          .single()
        if (parentError) throw parentError
        parent = parentData
      }

      // 3. Fetch latest fee record and its service details
      const { data: feeData, error: feeError } = await supabase
        .from('student_fees')
        .select(`
          *,
          inventory_items!student_fees_service_id_fkey (
            item_name,
            unit_price,
            tax_rates ( rate )
          )
        `)
        .eq('student_id', id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (feeError) throw feeError
      fee = feeData

      // 4. Fetch active enrollment and its batch name
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select(`
          batch_id,
          batches ( batch_name )
        `)
        .eq('student_id', id)
        .eq('status', 'active')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (enrollmentError) throw enrollmentError
      enrollment = enrollmentData

      // Build flat object matching old view structure
      const flatStudent = {
        ...studentData,
        father_name: parent?.father_name || null,
        mother_name: parent?.mother_name || null,
        parent_mobile: parent?.mobile || null,
        parent_email: parent?.email || null,
        parent_address: parent?.address || null,
        service_id: fee?.service_id || null,
        service_name: fee?.inventory_items?.item_name || null,
        batch_name: enrollment?.batches?.batch_name || null,
        service_base_fee: fee?.inventory_items?.unit_price || 0,
        service_tax_rate: fee?.inventory_items?.tax_rates?.[0]?.rate || 0,
        total_fee: fee?.total_fee || 0,
        discount: fee?.discount || 0,
        final_fee: fee?.final_fee || 0,
        due_date: fee?.due_date || null,
        fee_status: fee?.status || null,
        paid_amount: fee?.paid_amount || 0,
        balance_due: fee?.balance_due || 0,
      }

      return flatStudent
    },
    enabled: !!id,
  })

  // ✅ Fetch all active courses for the organisation (unchanged)
  const { data: allCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['all-courses-for-student-form', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('organization_id', org.id)
        .eq('status', true)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: !!org?.id,
  })

  // Build course checklist – mark the student's enrolled course as checked
  const courseList = useMemo(() => {
    if (!allCourses) return []
    return allCourses.map(course => ({
      id: course.id,
      display: course.name,
      checked: student?.course_id === course.id,
    }))
  }, [allCourses, student?.course_id])

  // PDF download handler (unchanged)
  const handleDownloadPDF = async () => {
    if (!student) return
    setLoadingPDF(true)
    try {
      console.log('courseList being passed to PDF:', courseList)
      await exportAdmissionPDF(student, org, theme, {
        courses: courseList,
        returnBlob: false,
      })
    } catch (err) {
      console.error('PDF generation error:', err)
      message.error('Failed to generate PDF')
    } finally {
      setLoadingPDF(false)
    }
  }

  // PDF print handler (unchanged)
  const handlePrintPDF = async () => {
    if (!student) return
    try {
      const blob = await exportAdmissionPDF(student, org, theme, {
        courses: courseList,
        returnBlob: true,
      })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) win.onload = () => win.print()
      else message.warning('Please allow pop-ups to print the PDF')
    } catch (err) {
      console.error('Print PDF error:', err)
      message.error('Failed to generate PDF for printing')
    }
  }

  if (studentLoading || coursesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!student) {
    return (
      <Card style={{ backgroundColor: bgColor }}>
        <Text style={{ color: textColor }}>Student not found</Text>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')}>
          Back to Students
        </Button>
      </Card>
    )
  }

  // Main render (unchanged layout)
  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/students/${id}`)}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Back to Student
        </Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownloadPDF}
          loading={loadingPDF}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
        >
          Download PDF
        </Button>
        <Button
          icon={<PrinterOutlined />}
          onClick={handlePrintPDF}
        >
          Print PDF
        </Button>
      </Space>

      <div
        className="student-info-print"
        style={{
          backgroundColor: bgColor,
          padding: 24,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          color: textColor,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={18}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              {org?.logo_light_url ? (
                <img src={org.logo_light_url} alt="Logo" style={{ maxHeight: 60, marginBottom: 8 }} />
              ) : (
                <Title level={2} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
                  {org?.company_name || 'Organization Name'}
                </Title>
              )}
              <div style={{ fontSize: 13, color: darkMode ? '#aaa' : '#555' }}>
                {org?.phone && <span>Helpline: {org.phone} &nbsp;|&nbsp;</span>}
                {org?.email && <span>Email: {org.email} &nbsp;|&nbsp;</span>}
                {org?.website && <span>Website: {org.website}</span>}
              </div>
              <Divider style={{ margin: '12px 0', borderColor: darkMode ? '#444' : '#e8e8e8' }} />
              <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
                STUDENT INFORMATION FORM
              </Title>
              {student.admission_form_number && (
                <Title level={5} style={{ color: primaryColor, fontFamily: fontBody, marginTop: 4 }}>
                  Admission Form No: {student.admission_form_number}
                </Title>
              )}
            </div>

            {/* Student Details */}
            <Title level={5} style={{ color: primaryColor, fontFamily: fontHeading }}>Student Details</Title>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 600, fontFamily: fontBody }}
              contentStyle={{ color: textColor, fontFamily: fontBody }}
            >
              <Descriptions.Item label="Full Name">{student.full_name_formatted || '-'}</Descriptions.Item>
              <Descriptions.Item label="Gender">{student.gender || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{student.dob ? new Date(student.dob).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{student.mobile || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{student.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="School Name">{student.school_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Standard/Class">{student.standard || '-'}</Descriptions.Item>
              <Descriptions.Item label="Board">{student.board || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Parent / Guardian */}
            <Title level={5} style={{ color: primaryColor, fontFamily: fontHeading }}>Parent / Guardian</Title>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}
              labelStyle={{ color: primaryColor, fontWeight: 600, fontFamily: fontBody }}
              contentStyle={{ color: textColor, fontFamily: fontBody }}
            >
              <Descriptions.Item label="Father Name">{student.father_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Mother Name">{student.mother_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Contact">{student.parent_mobile || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{student.parent_email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address">{student.parent_address || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Course & Fee Details */}
            <Title level={5} style={{ color: primaryColor, fontFamily: fontHeading }}>Course & Fee Details</Title>
            {student.service_id ? (
              <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}
                labelStyle={{ color: primaryColor, fontWeight: 600, fontFamily: fontBody }}
                contentStyle={{ color: textColor, fontFamily: fontBody }}
              >
                <Descriptions.Item label="Service / Course" span={2}>
                  {student.service_name || 'Unnamed Service'}
                </Descriptions.Item>
                <Descriptions.Item label="Batch">{student.batch_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Base Fee">₹{student.service_base_fee ?? 0}</Descriptions.Item>
                <Descriptions.Item label="Tax Rate">{student.service_tax_rate ?? 0}%</Descriptions.Item>
                <Descriptions.Item label="Total Fee">₹{student.total_fee ?? 0}</Descriptions.Item>
                <Descriptions.Item label="Discount">₹{student.discount ?? 0}</Descriptions.Item>
                <Descriptions.Item label="Final Fee">₹{student.final_fee ?? 0}</Descriptions.Item>
                <Descriptions.Item label="Due Date">
                  {student.due_date ? new Date(student.due_date).toLocaleDateString() : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fee Status">{student.fee_status || '-'}</Descriptions.Item>
                <Descriptions.Item label="Paid Amount">₹{student.paid_amount ?? 0}</Descriptions.Item>
                <Descriptions.Item label="Balance Due">₹{student.balance_due ?? 0}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary" style={{ color: textColor }}>No fee details available.</Text>
            )}

            {/* Enrolled Courses Checklist */}
            <Title level={5} style={{ color: primaryColor, fontFamily: fontHeading }}>Enrolled Courses</Title>
            <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              {courseList.length > 0 ? (
                courseList.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      border: `1px solid ${textColor}`,
                      textAlign: 'center',
                      lineHeight: '16px',
                      fontSize: 12,
                      color: textColor,
                    }}>
                      {item.checked ? '✓' : ''}
                    </span>
                    <span style={{ color: textColor }}>{item.display}</span>
                  </div>
                ))
              ) : (
                <Text type="secondary" style={{ color: textColor }}>No courses found.</Text>
              )}
            </div>

            <Divider style={{ borderColor: darkMode ? '#444' : '#e8e8e8' }} />
            <div style={{ textAlign: 'center', fontSize: 10, color: darkMode ? '#aaa' : '#aaa', marginTop: 16 }}>
              This form is for reference. Please attach with the manual admission form.
            </div>
          </Col>

          {/* Photo Column */}
          <Col xs={24} md={6} style={{ textAlign: 'center' }}>
            <div style={{
              border: `1px solid ${darkMode ? '#444' : '#e8e8e8'}`,
              borderRadius: 8,
              padding: 16,
              backgroundColor: darkMode ? '#2c2c2c' : '#fafafa',
            }}>
              <Text strong style={{ display: 'block', marginBottom: 8, color: primaryColor }}>
                Student Photo
              </Text>
              {student.photo_url ? (
                <Image
                  src={student.photo_url}
                  alt="Student"
                  style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 4 }}
                  fallback="data:image/svg+xml;base64,..."
                />
              ) : (
                <div style={{
                  height: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: darkMode ? '#3a3a3a' : '#f0f0f0',
                  borderRadius: 4,
                }}>
                  <Text type="secondary" style={{ color: textColor }}>No photo</Text>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default AdmissionForm