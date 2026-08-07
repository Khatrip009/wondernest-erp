// StudentList.jsx (fixed - no longer uses student_detail_view)
import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider } from 'antd'
import { SearchOutlined, EyeOutlined, EditOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Option } = Select

const StudentList = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  const initialFilters = {
    search: '',
    status: '',
    course_id: '',
    batch_id: '',
    level_id: '',
  }

  const [filters, setFilters] = useState(initialFilters)

  // Fetch courses (org-wide)
  const { data: courses } = useQuery({
    queryKey: ['courses-dropdown', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .order('name')
      return data || []
    },
    enabled: !!org?.id,
  })

  // Fetch batches
  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
        .is('deleted_at', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data } = await query
      return data || []
    },
  })

  // Fetch levels (from course_levels)
  const { data: levels } = useQuery({
    queryKey: ['levels-dropdown', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data } = await supabase
        .from('course_levels')
        .select('id, name, level_number')
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .order('level_number')
      return data || []
    },
    enabled: !!org?.id,
  })

  // Build maps for quick lookup
  const courseMap = {}
  ;(courses || []).forEach(c => { courseMap[c.id] = c.name })
  const levelMap = {}
  ;(levels || []).forEach(l => { levelMap[l.id] = `${l.name} (Lv.${l.level_number})` })
  const batchMap = {}
  ;(batches || []).forEach(b => { batchMap[b.id] = b.batch_name })

  // Fetch students from underlying tables, then enrich
  const { data: students, isLoading } = useQuery({
    queryKey: ['students-final', filters, selectedBranch?.id, selectedFinancialYear?.id, courses, levels, batches],
    queryFn: async () => {
      // 1. Query students table with filters that apply directly
      let query = supabase
        .from('students')
        .select('id, admission_form_number, full_name_formatted, mobile, status, course_id, level_id, branch_id, financial_year_id')
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
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.course_id) query = query.eq('course_id', filters.course_id)
      if (filters.level_id) query = query.eq('level_id', filters.level_id)

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

      // 3. Fetch latest fee status per student
      const { data: fees, error: feeError } = await supabase
        .from('student_fees')
        .select('student_id, status')
        .in('student_id', studentIds)
        .order('id', { ascending: false })
      if (feeError) throw feeError

      const feeMap = {}
      ;(fees || []).forEach(f => {
        if (!feeMap[f.student_id]) feeMap[f.student_id] = f.status
      })

      // 4. Build final array with names
      let finalStudents = studentData.map(s => ({
        student_id: s.id,
        admission_form_number: s.admission_form_number,
        full_name_formatted: s.full_name_formatted,
        mobile: s.mobile,
        student_status: s.status,
        course_name: courseMap[s.course_id] || null,
        level_name: levelMap[s.level_id] || null,
        batch_name: batchMap[enrollmentMap[s.id]] || null,
        fee_status: feeMap[s.id] || null,
        branch_id: s.branch_id,
        financial_year_id: s.financial_year_id,
      }))

      // 5. Apply batch filter if present
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
      width: 120,
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'full_name_formatted',
      sorter: (a, b) => (a.full_name_formatted || '').localeCompare(b.full_name_formatted || ''),
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile',
      responsive: ['md'],
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course_name',
      responsive: ['lg'],
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Level</span>,
      dataIndex: 'level_name',
      responsive: ['lg'],
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: 'batch_name',
      responsive: ['lg'],
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Fee Status</span>,
      dataIndex: 'fee_status',
      render: (v) => (
        <Tag
          color={
            v === 'Paid' ? 'green' :
            v === 'Partially Paid' ? 'orange' :
            v === 'Unpaid' ? 'volcano' :
            'default'
          }
          style={{ fontFamily: fontBody }}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'student_status',
      render: (v) => (
        <Tag color={v === 'active' ? 'green' : 'red'} style={{ fontFamily: fontBody }}>
          {v}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/students/${record.student_id}`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/students/${record.student_id}/edit`)}
            style={{ fontFamily: fontBody, color: textColor, borderColor }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search name, mobile, adm. form no"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
              style={{ fontFamily: fontBody }}
            />
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.status || undefined}
              onChange={(val) => setFilters({ ...filters, status: val })}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Course"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.course_id || undefined}
              onChange={(val) => setFilters({ ...filters, course_id: val })}
            >
              {courses?.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Select
              placeholder="Level"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.level_id || undefined}
              onChange={(val) => setFilters({ ...filters, level_id: val })}
            >
              {levels?.map((l) => (
                <Option key={l.id} value={l.id}>{l.name} (Lv.{l.level_number})</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Batch"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.batch_id || undefined}
              onChange={(val) => setFilters({ ...filters, batch_id: val })}
            >
              {batches?.map((b) => (
                <Option key={b.id} value={b.id}>{b.batch_name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Button
              icon={<ClearOutlined />}
              onClick={() => setFilters(initialFilters)}
              style={{ fontFamily: fontBody, color: textColor, borderColor }}
              block
            >
              Clear
            </Button>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0', borderColor }} />

        <Table
          dataSource={students}
          columns={columns}
          rowKey="student_id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={{ size: 'small' }}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default StudentList