import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider } from 'antd'
import { SearchOutlined, EyeOutlined, EditOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'

const { Option } = Select

const StudentList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext()
  const { selectedBranch, selectedFinancialYear, selectedOrganization } = outletContext || {}

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const initialFilters = {
    search: '',
    status: '',
    course_id: '',
    batch_id: '',
    level_id: '',
  }

  const [filters, setFilters] = useState(initialFilters)

  // Fetch courses (root courses only) – no alias
  const { data: courses } = useQuery({
  queryKey: ['courses-dropdown', selectedBranch?.id],
  queryFn: async () => {
    let query = supabase
      .from('courses')
      .select('id, name')          // ✅ no alias
      .is('parent_id', null)
      .eq('status', true)
      .is('deleted_at', null)
      .order('name')
    if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
    const { data } = await query
    return data?.map(c => ({ ...c, course_name: c.name })) || []
  },
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
      const { data } = await query
      return data
    },
    enabled: true,
  })

  // Fetch levels – no alias
  const { data: levels } = useQuery({
    queryKey: ['levels-dropdown', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('id, name, level_number')
        .not('parent_id', 'is', null)
        .eq('status', true)
        .is('deleted_at', null)
        .order('level_number')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data } = await query
      // Rename to level_name
      return data?.map(l => ({ ...l, level_name: l.name })) || []
    },
  })

  // Fetch students from the updated student_summary view
  const { data: students, isLoading } = useQuery({
    queryKey: ['students', filters, selectedBranch?.id, selectedFinancialYear?.id, selectedOrganization?.id],
    queryFn: async () => {
      let query = supabase.from('student_summary').select('*')

      const orgId = selectedOrganization?.id || selectedBranch?.organization_id
      if (orgId) query = query.eq('organization_id', orgId)

      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)

      if (filters.search) {
        query = query.or(
          `full_name_formatted.ilike.%${filters.search}%,` +
          `mobile.ilike.%${filters.search}%,` +
          `admission_no.ilike.%${filters.search}%`
        )
      }
      if (filters.status) query = query.eq('student_status', filters.status)
      if (filters.course_id) query = query.eq('course_id', filters.course_id)
      if (filters.batch_id) query = query.eq('batch_id', filters.batch_id)
      if (filters.level_id) query = query.eq('level_id', filters.level_id)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: true,
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: 'admission_no',
      width: 120,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'full_name_formatted',
      sorter: (a, b) => (a.full_name_formatted || '').localeCompare(b.full_name_formatted || ''),
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
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Level</span>,
      dataIndex: 'level_name',
      responsive: ['lg'],
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: 'batch_name',
      responsive: ['lg'],
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
            style={{ fontFamily: fontBody }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ]

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
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search name, mobile, admission no"
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
                <Option key={c.id} value={c.id}>{c.course_name}</Option>
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
                <Option key={l.id} value={l.id}>{l.level_name}</Option>
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
              style={{ fontFamily: fontBody }}
              block
            >
              Clear
            </Button>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

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