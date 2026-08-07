// BatchList.jsx (fixed)
import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider, message } from 'antd'
import { SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useBatches, useDeleteBatch } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import { useScope } from '../../../contexts/ScopeContext'
import { useOrganization } from '../../../contexts/OrganizationContext'

const { Option } = Select

const BatchList = () => {
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

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ search: '', status: '', course_id: '', teacher_id: '' })

  const { data, isLoading } = useBatches(page, pageSize, {
    ...filters,
    branch_id: selectedBranch?.id,
  })

  const deleteBatch = useDeleteBatch()

  // Fetch courses – only for the current organization, NO parent_id filter
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

  // Fetch teachers for dropdown (unchanged)
  const { data: teachers } = useQuery({
    queryKey: ['teachers-dropdown'],
    queryFn: async () => {
      const { data } = await supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('status', 'active')
      return data
    },
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch Name</span>,
      dataIndex: 'batch_name',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: ['courses', 'name'],
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      render: (_, record) => {
        const t = record.teachers
        return <span style={{ fontFamily: fontBody, color: textColor }}>{t ? `${t.first_name} ${t.last_name}` : '-'}</span>
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Start Date</span>,
      dataIndex: 'start_date',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>End Date</span>,
      dataIndex: 'end_date',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      render: (s) => (
        <Tag color={s === 'active' ? 'green' : s === 'completed' ? 'blue' : 'red'} style={{ fontFamily: fontBody }}>
          {s}
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
            onClick={() => navigate(`/academics/batches/${record.id}`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/academics/batches/${record.id}/edit`)}
            style={{ fontFamily: fontBody, color: textColor, borderColor }}
          >
            Edit
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (window.confirm('Delete this batch?')) {
                deleteBatch.mutate(record.id, {
                  onSuccess: () => message.success('Batch deleted'),
                  onError: () => message.error('Failed to delete'),
                })
              }
            }}
          >
            Delete
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
          <Col xs={24} sm={8}>
            <Input
              placeholder="Search batch name"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
              style={{ fontFamily: fontBody }}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.status || undefined}
              onChange={(val) => setFilters({ ...filters, status: val })}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="completed">Completed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
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
          <Col xs={24} sm={4}>
            <Select
              placeholder="Teacher"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.teacher_id || undefined}
              onChange={(val) => setFilters({ ...filters, teacher_id: val })}
            >
              {teachers?.map(t => <Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button
              icon={<ClearOutlined />}
              onClick={() => setFilters({ search: '', status: '', course_id: '', teacher_id: '' })}
              style={{ fontFamily: fontBody, color: textColor, borderColor }}
              block
            >
              Clear
            </Button>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0', borderColor }} />

        <Table
          dataSource={data?.data}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.count,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default BatchList