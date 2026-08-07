import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider, Popconfirm } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useHomeworkList, useDeleteHomework } from '../../../hooks/useAcademics'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select

const HomeworkList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

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
      title: 'Title',
      dataIndex: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/academics/homework/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Batch',
      dataIndex: ['batches', 'batch_name'],
    },
    {
      title: 'Subject',
      dataIndex: ['subjects', 'subject_name'],
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Status',
      render: (_, record) => {
        const now = dayjs()
        const due = dayjs(record.due_date)
        if (record.status === 'closed') return <Tag color="red">Closed</Tag>
        if (due.isBefore(now)) return <Tag color="orange">Overdue</Tag>
        return <Tag color="green">Active</Tag>
      },
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/academics/homework/${record.id}`)}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/academics/homework/${record.id}/edit`)}>Edit</Button>
          <Popconfirm
            title="Delete this homework?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search by title or description"
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} sm={5}>
          <Select
            placeholder="Batch"
            allowClear
            style={{ width: '100%' }}
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
            style={{ width: '100%' }}
            value={filters.subject_id || undefined}
            onChange={(val) => setFilters({ ...filters, subject_id: val })}
          >
            {subjects?.map(s => <Option key={s.id} value={s.id}>{s.subject_name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={6}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/academics/homework/new')}>Add Homework</Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
          </Space>
        </Col>
      </Row>
      <Divider style={{ margin: '16px 0' }} />
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
  )
}

export default HomeworkList