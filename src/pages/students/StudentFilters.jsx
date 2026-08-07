// src/pages/students/StudentFilters.jsx
import { useState } from 'react'
import { Card, Select, Table, Button, Row, Col, Typography, message, Alert } from 'antd'
import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { exportCSV } from '../../utils/csvExport'
import { exportStudentListPDF } from '../../utils/exportStudentListPDF'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'

const { Title } = Typography
const { Option } = Select

const FILTER_TYPES = [
  { value: 'course', label: 'Course-wise' },
  { value: 'batch', label: 'Batch-wise' },
  { value: 'branch', label: 'Branch-wise' },
  { value: 'age', label: 'Age-wise' },
]

const StudentFilters = () => {
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [filterType, setFilterType] = useState('course')
  const [selectedValue, setSelectedValue] = useState(null)

  // ---------- 1. Fetch students (without batch_id) ----------
  const {
    data: rawStudents,
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ['students-raw', selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, admission_form_number, full_name_formatted, mobile, dob, course_id, branch_id')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: true,
  })

  // ---------- 2. Fetch active enrollments for batch mapping ----------
  const {
    data: enrollmentMap,
    isLoading: enrollLoading,
  } = useQuery({
    queryKey: ['student-batch-map', rawStudents?.map(s => s.id)],
    queryFn: async () => {
      if (!rawStudents || rawStudents.length === 0) return {}
      const studentIds = rawStudents.map(s => s.id)
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('student_id, batch_id')
        .in('student_id', studentIds)
        .eq('status', 'active')
      if (error) throw error
      const map = {}
      ;(data || []).forEach(e => {
        if (!map[e.student_id]) map[e.student_id] = e.batch_id
      })
      return map
    },
    enabled: !!rawStudents && rawStudents.length > 0,
    initialData: {},
  })

  // ---------- 3. Load course / batch / branch names ----------
  const {
    data: courseMap,
    isLoading: courseLoading,
  } = useQuery({
    queryKey: ['courses-map', rawStudents],
    queryFn: async () => {
      if (!rawStudents?.length) return {}
      const ids = [...new Set(rawStudents.map(s => s.course_id).filter(Boolean))]
      if (!ids.length) return {}
      const { data } = await supabase.from('courses').select('id, name').in('id', ids)
      const map = {}
      ;(data || []).forEach(c => { map[c.id] = c.name })
      return map
    },
    enabled: !!rawStudents && rawStudents.length > 0,
    initialData: {},
  })

  const {
    data: batchMap,
    isLoading: batchLoading,
  } = useQuery({
    queryKey: ['batches-map', enrollmentMap],
    queryFn: async () => {
      const batchIds = enrollmentMap ? Object.values(enrollmentMap).filter(Boolean) : []
      if (!batchIds.length) return {}
      const { data } = await supabase.from('batches').select('id, batch_name').in('id', batchIds)
      const map = {}
      ;(data || []).forEach(b => { map[b.id] = b.batch_name })
      return map
    },
    enabled: !!enrollmentMap && Object.keys(enrollmentMap).length > 0,
    initialData: {},
  })

  const {
    data: branchMap,
    isLoading: branchLoading,
  } = useQuery({
    queryKey: ['branches-map', rawStudents],
    queryFn: async () => {
      if (!rawStudents?.length) return {}
      const ids = [...new Set(rawStudents.map(s => s.branch_id).filter(Boolean))]
      if (!ids.length) return {}
      const { data } = await supabase.from('branches').select('id, branch_name').in('id', ids)
      const map = {}
      ;(data || []).forEach(b => { map[b.id] = b.branch_name })
      return map
    },
    enabled: !!rawStudents && rawStudents.length > 0,
    initialData: {},
  })

  // Combine into final student list
  const students = (rawStudents || []).map(s => ({
    id: s.id,
    admission_form_number: s.admission_form_number,
    full_name_formatted: s.full_name_formatted,
    mobile: s.mobile,
    dob: s.dob,
    course_name: courseMap?.[s.course_id] || null,
    batch_name: batchMap?.[enrollmentMap?.[s.id]] || null,
    branch_name: branchMap?.[s.branch_id] || null,
  }))

  // ✅ Fixed loading condition: only wait for map queries if there are actual students
  const isLoading =
    studentsLoading ||
    enrollLoading ||
    (rawStudents &&
      rawStudents.length > 0 &&
      (courseLoading || batchLoading || branchLoading))

  // ---------- Filter options & data ----------
  const filterOptions = (() => {
    if (!students) return []
    if (filterType === 'course') {
      const courses = [...new Set(students.map(s => s.course_name).filter(Boolean))]
      return courses.map(c => ({ value: c, label: c }))
    }
    if (filterType === 'batch') {
      const batches = [...new Set(students.map(s => s.batch_name).filter(Boolean))]
      return batches.map(b => ({ value: b, label: b }))
    }
    if (filterType === 'branch') {
      const branches = [...new Set(students.map(s => s.branch_name).filter(Boolean))]
      return branches.map(b => ({ value: b, label: b }))
    }
    if (filterType === 'age') {
      return [
        { value: '0-5', label: '0 – 5 years' },
        { value: '6-10', label: '6 – 10 years' },
        { value: '11-15', label: '11 – 15 years' },
        { value: '16-20', label: '16 – 20 years' },
        { value: '21+', label: '21+ years' },
      ]
    }
    return []
  })()

  const filteredData = (() => {
    if (!students || !selectedValue) return []
    if (filterType === 'course') return students.filter(s => s.course_name === selectedValue)
    if (filterType === 'batch') return students.filter(s => s.batch_name === selectedValue)
    if (filterType === 'branch') return students.filter(s => s.branch_name === selectedValue)
    if (filterType === 'age') {
      return students.filter(s => {
        if (!s.dob) return false
        const age = new Date().getFullYear() - new Date(s.dob).getFullYear()
        const [min, max] = selectedValue.split('-').map(Number)
        if (selectedValue === '21+') return age >= 21
        return age >= min && age <= max
      })
    }
    return []
  })()

  // ---------- Table columns ----------
  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Adm. Form No</span>,
      dataIndex: 'admission_form_number',
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'full_name_formatted',
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile',
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course_name',
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: 'batch_name',
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Branch</span>,
      dataIndex: 'branch_name',
      render: (text) => <span style={{ color: textColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Age</span>,
      key: 'age',
      render: (_, record) => {
        if (!record.dob) return <span style={{ color: textColor, fontFamily: fontBody }}>-</span>
        const age = new Date().getFullYear() - new Date(record.dob).getFullYear()
        return <span style={{ color: textColor, fontFamily: fontBody }}>{age}</span>
      },
    },
  ]

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      message.warning('No data to export')
      return
    }
    exportCSV(
      [
        { title: 'Adm. Form No', dataIndex: 'admission_form_number' },
        { title: 'Student Name', dataIndex: 'full_name_formatted' },
        { title: 'Mobile', dataIndex: 'mobile' },
        { title: 'Course', dataIndex: 'course_name' },
        { title: 'Batch', dataIndex: 'batch_name' },
        { title: 'Branch', dataIndex: 'branch_name' },
      ],
      filteredData,
      `${filterType}-wise-students.csv`
    )
    message.success('CSV exported')
  }

  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      message.warning('No data to export')
      return
    }
    exportStudentListPDF(filteredData, filterType, selectedValue, org, theme)
    message.success('PDF exported')
  }

  if (studentsError) {
    return (
      <Alert
        message="Error loading students"
        description={studentsError.message}
        type="error"
        showIcon
      />
    )
  }

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
        <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, marginBottom: 16 }}>
          Student Filters
        </Title>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Select
              value={filterType}
              onChange={(val) => { setFilterType(val); setSelectedValue(null) }}
              style={{ width: '100%', fontFamily: fontBody }}
            >
              {FILTER_TYPES.map(ft => (
                <Option key={ft.value} value={ft.value}>{ft.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={10}>
            <Select
              value={selectedValue}
              onChange={setSelectedValue}
              style={{ width: '100%', fontFamily: fontBody }}
              placeholder={`Select ${filterType}`}
              options={filterOptions}
              allowClear
              dropdownStyle={{ fontFamily: fontBody }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
              disabled={!selectedValue}
              style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
            >
              CSV
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              disabled={!selectedValue}
              style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody, marginLeft: 8 }}
            >
              PDF
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, size: 'small' }}
          size="middle"
          locale={{
            emptyText: selectedValue
              ? <span style={{ fontFamily: fontBody, color: textColor }}>No students found</span>
              : <span style={{ fontFamily: fontBody, color: textColor }}>Select a filter to view students</span>
          }}
        />
      </Card>
    </div>
  )
}

export default StudentFilters