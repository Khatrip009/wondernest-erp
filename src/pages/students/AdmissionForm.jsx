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
  const { theme } = useTheme()
  const { org } = useOrganization()
  const [loadingPDF, setLoadingPDF] = useState(false)

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  // ✅ Use student_detail_view (guarantees one row, includes direct course/level and fee fields)
  const {
    data: student,
    isLoading: studentLoading,
    error: studentError
  } = useQuery({
    queryKey: ['student-admission-form', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_detail_view')
        .select('*')
        .eq('student_id', id)
        .maybeSingle()           // safe, returns null if not found
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // ---------- Enrollments (for level checklist) ----------
  const {
    data: enrollments,
    isLoading: enrollLoading,
    error: enrollError
  } = useQuery({
    queryKey: ['student-enrollments-form', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('current_level_id')
        .eq('student_id', id)
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // ---------- All levels (for checklist) ----------
  const {
    data: allLevels,
    isLoading: allLevelsLoading
  } = useQuery({
    queryKey: ['all-levels-for-student-form'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_levels')
        .select(`
          id,
          level_name,
          level_number,
          course_id,
          courses (
            id,
            course_name
          )
        `)
        .order('level_number')
      if (error) throw error
      return data
    },
  })

  // ---------- Build checklist ----------
  const courseLevelsList = useMemo(() => {
    if (!allLevels) return []

    const enrolledLevelIds = new Set(
      (enrollments || [])
        .map(e => e.current_level_id)
        .filter(id => id !== null && id !== undefined)
    )

    return allLevels.map(level => {
      const course = level.courses
      const displayName = course
        ? `${course.course_name} – ${level.level_name} (Level ${level.level_number})`
        : `Unknown – ${level.level_name} (Level ${level.level_number})`
      return {
        id: level.id,
        display: displayName,
        checked: enrolledLevelIds.has(level.id),
      }
    })
  }, [allLevels, enrollments])

  // ---------- PDF handlers ----------
  const handleDownloadPDF = () => {
    if (!student) return
    setLoadingPDF(true)
    try {
      exportAdmissionPDF(student, org, theme, {
        courseLevels: courseLevelsList,
        returnBlob: false,
      })
    } catch (err) {
      console.error('PDF generation error:', err)
      message.error('Failed to generate PDF')
    } finally {
      setLoadingPDF(false)
    }
  }

  const handlePrintPDF = async () => {
    if (!student) return
    try {
      const blob = exportAdmissionPDF(student, org, theme, {
        returnBlob: true,
        courseLevels: courseLevelsList,
      })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        win.onload = () => win.print()
      } else {
        message.warning('Please allow pop-ups to print the PDF')
      }
    } catch (err) {
      console.error('Print PDF error:', err)
      message.error('Failed to generate PDF for printing')
    }
  }

  if (studentLoading || enrollLoading || allLevelsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (enrollError) {
    console.error('Enrollment fetch error:', enrollError)
  }

  if (!student) {
    return (
      <Card>
        <p>Student not found</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')}>
          Back to Students
        </Button>
      </Card>
    )
  }

  // ---------- Render ----------
  return (
    <div style={{ fontFamily: fontBody, padding: '16px 0' }}>
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

      <div className="student-info-print" style={{ background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
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
              <div style={{ fontSize: 13, color: '#555' }}>
                {org?.phone && <span>Helpline: {org.phone} &nbsp;|&nbsp;</span>}
                {org?.email && <span>Email: {org.email} &nbsp;|&nbsp;</span>}
                {org?.website && <span>Website: {org.website}</span>}
              </div>
              <Divider style={{ margin: '12px 0' }} />
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
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
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
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Father Name">{student.father_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Mother Name">{student.mother_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Contact">{student.parent_mobile || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{student.parent_email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address">{student.parent_address || '-'}</Descriptions.Item>
            </Descriptions>

            {/* Course & Fee Details – directly from student_detail_view */}
            <Title level={5} style={{ color: primaryColor, fontFamily: fontHeading }}>Course & Fee Details</Title>
            {student.service_id ? (
              <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
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
              <Text type="secondary">No fee details available.</Text>
            )}

            {/* Courses / Levels with checkboxes */}
            <Title level={5} style={{ color: primaryColor, fontFamily: fontHeading }}>Enrolled Courses / Levels</Title>
            <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              {courseLevelsList.length > 0 ? (
                courseLevelsList.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 16,
                      height: 16,
                      border: '1px solid #000',
                      textAlign: 'center',
                      lineHeight: '16px',
                      fontSize: 12
                    }}>
                      {item.checked ? '✓' : ''}
                    </span>
                    <span>{item.display}</span>
                  </div>
                ))
              ) : (
                <Text type="secondary">No course levels found.</Text>
              )}
            </div>

            {/* Additional Information – removed fields that don’t exist in the view */}
            <Divider />
            <div style={{ textAlign: 'center', fontSize: 10, color: '#aaa', marginTop: 16 }}>
              This form is for reference. Please attach with the manual admission form.
            </div>
          </Col>

          {/* Photo Column */}
          <Col xs={24} md={6} style={{ textAlign: 'center' }}>
            <div style={{
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              padding: 16,
              background: '#fafafa'
            }}>
              <Text strong style={{ display: 'block', marginBottom: 8, color: primaryColor }}>
                Student Photo
              </Text>
              {student.photo_url ? (
                <Image
                  src={student.photo_url}
                  alt="Student"
                  style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 4 }}
                  fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2QxZDFkMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkeT0iLjNlbSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gUGhvdG88L3RleHQ+PC9zdmc+"
                />
              ) : (
                <div style={{
                  height: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f0f0f0',
                  borderRadius: 4
                }}>
                  <Text type="secondary">No photo</Text>
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