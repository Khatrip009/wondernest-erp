// StudentBatchList.jsx (fixed – no longer uses student_detail_view)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Table, Input, Select, Row, Col, Button, Space, Tag } from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import { useScope } from '../../../contexts/ScopeContext'
import { useOrganization } from '../../../contexts/OrganizationContext'

const { Option } = Select

const StudentBatchList = () => {
  const navigate = useNavigate()

  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [filters, setFilters] = useState({
    search: '',
    course_id: '',
    batch_id: '',
  })

  // Fetch courses (org-wide)
  const { data: courses } = useQuery({
    queryKey: ['courses-dropdown', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data } = await supabase
        .from('courses')
        .select('id, name')
        .eq('organization_id', org.id)
        .eq('status', true)
        .is('deleted_at', null)
        .order('name')
      return data || []
    },
    enabled: !!org?.id,
  })

  // Fetch batches for dropdown
  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
        .is('deleted_at', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  // Build maps for quick lookup
  const courseMap = {}
  ;(courses || []).forEach(c => { courseMap[c.id] = c.name })
  const batchMap = {}
  ;(batches || []).forEach(b => { batchMap[b.id] = b.batch_name })

  // ✅ Fetch students and enrich with batch/course names (no view)
  const { data: students, isLoading } = useQuery({
    queryKey: ['student-batch-list', filters, selectedBranch?.id, selectedFinancialYear?.id, courses, batches],
    queryFn: async () => {
      // 1. Query students table
      let query = supabase
        .from('students')
        .select('id, admission_form_number, full_name_formatted, mobile, status, course_id, branch_id, financial_year_id')
        .is('deleted_at', null)

      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
      if (filters.search) {
        query = query.or(
          `full_name_formatted.ilike.%${filters.search}%,` +
          `mobile.ilike.%${filters.search}%,` +
          `admission_form_number.ilike.%${filters.search}%`
        )
      }
      if (filters.course_id) query = query.eq('course_id', filters.course_id)

      const { data: studentData, error: studentError } = await query
      if (studentError) throw studentError
      if (!studentData || studentData.length === 0) return []

      const studentIds = studentData.map(s => s.id)

      // 2. Fetch active enrollments (to get batch_id per student)
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('student_id, batch_id')
        .in('student_id', studentIds)
        .eq('status', 'active')
      if (enrollError) throw enrollError

      const enrollmentMap = {}
      ;(enrollments || []).forEach(e => {
        if (!enrollmentMap[e.student_id]) enrollmentMap[e.student_id] = e.batch_id
      })

      // 3. Build final array with names
      let finalStudents = studentData.map(s => ({
        student_id: s.id,
        admission_form_number: s.admission_form_number,
        full_name_formatted: s.full_name_formatted,
        mobile: s.mobile,
        student_status: s.status,
        course_name: courseMap[s.course_id] || null,
        batch_name: batchMap[enrollmentMap[s.id]] || null,
      }))

      // 4. Apply batch filter if present
      if (filters.batch_id) {
        finalStudents = finalStudents.filter(s => enrollmentMap[s.student_id] === filters.batch_id)
      }

      return finalStudents
    },
    enabled: true,
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Adm. Form No</span>,
      dataIndex: 'admission_form_number',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: 'full_name_formatted',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile',
      responsive: ['md'],
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course_name',
      responsive: ['lg'],
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: 'batch_name',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'student_status',
      render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v}</Tag>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => navigate(`/students/${record.student_id}`)}
          style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
        >
          Manage
        </Button>
      ),
    },
  ]

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}`, backgroundColor: cardBg }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search students..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            allowClear
            style={{ fontFamily: fontBody }}
          />
        </Col>
        <Col xs={24} sm={5}>
          <Select
            placeholder="Course"
            allowClear
            style={{ width: '100%', fontFamily: fontBody }}
            value={filters.course_id || undefined}
            onChange={(val) => setFilters({ ...filters, course_id: val })}
          >
            {courses?.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={5}>
          <Select
            placeholder="Batch"
            allowClear
            style={{ width: '100%', fontFamily: fontBody }}
            value={filters.batch_id || undefined}
            onChange={(val) => setFilters({ ...filters, batch_id: val })}
          >
            {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={6}>
          <Space>
            <Button icon={<ClearOutlined />} onClick={() => setFilters({ search: '', course_id: '', batch_id: '' })}>
              Clear
            </Button>
          </Space>
        </Col>
      </Row>
      <Table
        dataSource={students}
        columns={columns}
        rowKey="student_id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        size="middle"
        style={{ marginTop: 16 }}
      />
    </Card>
  )
}

export default StudentBatchList