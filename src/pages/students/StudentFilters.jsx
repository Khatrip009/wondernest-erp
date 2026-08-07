import { useState } from 'react'
import { Card, Select, Table, Button, Row, Col, Typography, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { exportCSV } from '../../utils/csvExport'
import { useTheme } from '../../contexts/ThemeContext'
import { useOutletContext } from 'react-router-dom'

const { Title } = Typography
const { Option } = Select

const FILTER_TYPES = [
  { value: 'course', label: 'Course-wise' },
  { value: 'batch', label: 'Batch-wise' },
  { value: 'branch', label: 'Branch-wise' },
  { value: 'age', label: 'Age-wise' },
]

const StudentFilters = () => {
  const { theme } = useTheme()
  const outletContext = useOutletContext()
  const { selectedBranch, selectedFinancialYear } = outletContext || {}

  // Theme values with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [filterType, setFilterType] = useState('course')
  const [selectedValue, setSelectedValue] = useState(null)

  // Fetch students filtered by branch and financial year (if available)
  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students-for-filter', selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('student_full_details')
        .select('admission_no, full_name_formatted, mobile, course_name, batch_name, branch_name, dob')

      if (selectedBranch?.id) {
        query = query.eq('branch_id', selectedBranch.id)
      }
      if (selectedFinancialYear?.id) {
        query = query.eq('financial_year_id', selectedFinancialYear.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: true, // always fetch, but the query will be filtered
  })

  // Derive filter options from the data
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

  // Filtered data based on selection
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

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: 'admission_no',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'full_name_formatted',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course_name',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: 'batch_name',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Branch</span>,
      dataIndex: 'branch_name',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Age</span>,
      key: 'age',
      render: (_, record) => {
        if (!record.dob) return <span style={{ color: primaryColor, fontFamily: fontBody }}>-</span>
        const age = new Date().getFullYear() - new Date(record.dob).getFullYear()
        return <span style={{ color: primaryColor, fontFamily: fontBody }}>{age}</span>
      },
    },
  ]

  const handleExport = () => {
    if (filteredData.length === 0) {
      message.warning('No data to export')
      return
    }
    exportCSV(
      [
        { title: 'Admission No', dataIndex: 'admission_no' },
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

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
              onChange={(val) => {
                setFilterType(val)
                setSelectedValue(null)
              }}
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
              onClick={handleExport}
              disabled={!selectedValue}
              style={{
                borderColor: primaryColor,
                color: primaryColor,
                fontFamily: fontBody,
              }}
            >
              Export CSV
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="admission_no"
          loading={isLoading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, size: 'small' }}
          size="middle"
          locale={{
            emptyText: selectedValue
              ? <span style={{ fontFamily: fontBody, color: primaryColor }}>No students found</span>
              : <span style={{ fontFamily: fontBody, color: primaryColor }}>Select a filter to view students</span>
          }}
        />
      </Card>
    </div>
  )
}

export default StudentFilters