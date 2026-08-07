import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider, Popconfirm } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useHomeworkList, useDeleteHomework } from '../../../hooks/useAcademics'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import { useScope } from '../../../contexts/ScopeContext'
import dayjs from 'dayjs'

const { Option } = Select

const HomeworkList = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ search: '', batch_id: '', subject_id: '' })

  const { data, isLoading, refetch } = useHomeworkList(page, pageSize, {
    ...filters,
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  })

  const deleteMutation = useDeleteHomework()

  // Fetch batches for filter
  const { data: batches } = useQuery({
    queryKey: ['batches-filter', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Fetch subjects for filter
  const { data: subjects } = useQuery({
    queryKey: ['subjects-filter', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('id, subject_name')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Title</span>,
      dataIndex: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/academics/homework/${record.id}`)} style={{ fontFamily: fontBody, color: primaryColor }}>
          {text}
        </a>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: ['batches', 'batch_name'],
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Subject</span>,
      dataIndex: ['subjects', 'subject_name'],
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Due Date</span>,
      dataIndex: 'due_date',
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      render: (_, record) => {
        const now = dayjs()
        const due = dayjs(record.due_date)
        if (record.status === 'closed') return <Tag color="red" style={{ fontFamily: fontBody }}>Closed</Tag>
        if (due.isBefore(now)) return <Tag color="orange" style={{ fontFamily: fontBody }}>Overdue</Tag>
        return <Tag color="green" style={{ fontFamily: fontBody }}>Active</Tag>
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/academics/homework/${record.id}`)} style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/academics/homework/${record.id}/edit`)} style={{ fontFamily: fontBody, color: textColor, borderColor }}>Edit</Button>
          <Popconfirm
            title="Delete this homework?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ fontFamily: fontBody }}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8, fontFamily: fontBody }}>
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
              placeholder="Search by title or description"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
              style={{ fontFamily: fontBody }}
            />
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
          <Col xs={24} sm={5}>
            <Select
              placeholder="Subject"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.subject_id || undefined}
              onChange={(val) => setFilters({ ...filters, subject_id: val })}
            >
              {subjects?.map(s => <Option key={s.id} value={s.id}>{s.subject_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/academics/homework/new')} style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}>
                Add Homework
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ fontFamily: fontBody, color: textColor, borderColor }}>
                Refresh
              </Button>
            </Space>
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

export default HomeworkList