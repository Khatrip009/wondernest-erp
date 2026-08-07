import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider, Alert } from 'antd'
import { SearchOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select

const StudentBatchList = () => {
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext

  // Theme values with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [filters, setFilters] = useState({ search: '', course_id: '', batch_id: '' })

  // Use the student_summary view
  const { data: students, isLoading, refetch, error } = useQuery({
    queryKey: ['student-batch-list', selectedBranch?.id, selectedFinancialYear?.id, filters],
    queryFn: async () => {
      console.log('🔍 Fetching student summary with branch:', selectedBranch?.id, 'filters:', filters)
      let query = supabase
        .from('student_summary')
        .select('*')

      if (selectedBranch?.id) {
        query = query.eq('branch_id', selectedBranch.id)
      }
      if (selectedFinancialYear?.id) {
        query = query.eq('financial_year_id', selectedFinancialYear.id)
      }

      if (filters.search) {
        query = query.or(
          `full_name_formatted.ilike.%${filters.search}%,` +
          `admission_no.ilike.%${filters.search}%,` +
          `mobile.ilike.%${filters.search}%`
        )
      }
      if (filters.course_id) {
        query = query.eq('course_id', filters.course_id)
      }
      if (filters.batch_id) {
        query = query.eq('batch_id', filters.batch_id)
      }

      const { data, error } = await query
      if (error) throw error
      console.log('✅ Student data loaded:', data?.length, 'records')
      return data
    },
    enabled: true,
  })

  // Fetch courses for filter dropdown
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .is('parent_id', null)
        .eq('status', true)
        .order('name')
      if (error) throw error
      console.log('📚 Courses loaded for filter:', data?.length || 0, 'courses')
      return data
    },
  })

  // Fetch batches for filter dropdown
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
        .order('batch_name')
      if (error) throw error
      return data
    },
  })

  // ---- Table columns (with theme styling) ----
  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: 'admission_no',
      width: 120,
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: 'full_name_formatted',
      sorter: (a, b) => (a.full_name_formatted || '').localeCompare(b.full_name_formatted || ''),
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile',
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course_name',
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: 'batch_name',
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text || 'Not Assigned'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Enrolled On</span>,
      dataIndex: 'enrollment_date',
      render: (d) => (
        <span style={{ fontFamily: fontBody, color: primaryColor }}>
          {d ? dayjs(d).format('DD/MM/YYYY') : '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Fee Status</span>,
      dataIndex: 'fee_status',
      render: (s) => (
        <Tag
          color={s === 'Paid' ? 'green' : s === 'Partially Paid' ? 'orange' : 'red'}
          style={{ fontFamily: fontBody }}
        >
          {s || '-'}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Status</span>,
      dataIndex: 'student_status',
      render: (s) => (
        <Tag color={s === 'active' ? 'green' : 'red'} style={{ fontFamily: fontBody }}>
          {s}
        </Tag>
      ),
    },
  ]

  if (error) {
    return <Alert message="Error loading data" description={error.message} type="error" showIcon />
  }

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 8,
        borderTop: `4px solid ${primaryColor}`,
        fontFamily: fontBody,
      }}
    >
      {/* Filters Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search student name, admission no, mobile"
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            allowClear
            style={{ fontFamily: fontBody }}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Select
            placeholder="Filter by Course"
            allowClear
            style={{ width: '100%', fontFamily: fontBody }}
            value={filters.course_id || undefined}
            onChange={(val) => setFilters({ ...filters, course_id: val })}
            loading={coursesLoading}
            notFoundContent={coursesLoading ? 'Loading courses...' : 'No courses found'}
          >
            {courses?.map(c => (
              <Option key={c.id} value={c.id} style={{ fontFamily: fontBody }}>
                {c.name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={6}>
          <Select
            placeholder="Filter by Batch"
            allowClear
            style={{ width: '100%', fontFamily: fontBody }}
            value={filters.batch_id || undefined}
            onChange={(val) => setFilters({ ...filters, batch_id: val })}
            loading={batchesLoading}
            notFoundContent={batchesLoading ? 'Loading batches...' : 'No batches found'}
          >
            {batches?.map(b => (
              <Option key={b.id} value={b.id} style={{ fontFamily: fontBody }}>
                {b.batch_name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={4}>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              style={{ fontFamily: fontBody }}
            >
              Refresh
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={() => setFilters({ search: '', course_id: '', batch_id: '' })}
              style={{ fontFamily: fontBody }}
            >
              Clear
            </Button>
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0', borderColor: primaryColor }} />

      {/* Students Table */}
      <Table
        dataSource={students || []}
        columns={columns}
        rowKey="student_id"
        loading={isLoading}
        pagination={{
          pageSize: 20,
          showTotal: (total) => <span style={{ fontFamily: fontBody, color: primaryColor }}>Total {total} students</span>,
        }}
        size="middle"
        locale={{ emptyText: 'No students found' }}
        style={{ fontFamily: fontBody }}
      />
    </Card>
  )
}

export default StudentBatchList