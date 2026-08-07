// src/pages/students/StudentReports.jsx
import { useState } from 'react'
import { Typography, Select, Button, Row, Col, message, Spin } from 'antd'
import { FilePdfOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { exportAdmissionPDF } from '../../utils/exportAdmissionPDF'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import StudentFilters from './StudentFilters'

const { Title } = Typography
const { Option } = Select

const StudentReports = () => {
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const [selectedStudentId, setSelectedStudentId] = useState(null)

  // Fetch all students for admission form dropdown
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-for-reports', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name_formatted, admission_no, admission_form_number')
        .eq('organization_id', org.id)
        .order('full_name_formatted')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  const handleGenerateAdmissionPDF = async () => {
    if (!selectedStudentId) {
      message.warning('Please select a student')
      return
    }
    const student = students?.find(s => s.id === selectedStudentId)
    if (!student) {
      message.error('Student not found')
      return
    }
    try {
      await exportAdmissionPDF(student, org, theme)
      message.success('Admission form PDF downloaded')
    } catch (err) {
      message.error('Failed to generate PDF')
    }
  }

  return (
    <div style={{ fontFamily: fontBody, padding: 8 }}>
      <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, marginBottom: 16 }}>
        Student Reports
      </Title>

      {/* 1. Student Filters – already includes its own Card */}
      <div style={{ marginBottom: 16 }}>
        <StudentFilters />
      </div>

      {/* 2. Generate Admission Form PDF */}
      <div
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
          padding: 16,
        }}
      >
        <Title level={5} style={{ color: primaryColor, fontFamily: fontHeading, marginBottom: 16 }}>
          <FilePdfOutlined style={{ marginRight: 8 }} /> Admission Form
        </Title>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12}>
            <Select
              showSearch
              placeholder="Search student"
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              style={{ width: '100%', fontFamily: fontBody }}
              notFoundContent={studentsLoading ? <Spin size="small" /> : null}
            >
              {students?.map(s => (
                <Option key={s.id} value={s.id}>
                  {s.full_name_formatted || s.admission_no} ({s.admission_form_number || 'No AFN'})
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleGenerateAdmissionPDF}
              disabled={!selectedStudentId}
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                fontFamily: fontBody,
              }}
            >
              Download PDF
            </Button>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default StudentReports