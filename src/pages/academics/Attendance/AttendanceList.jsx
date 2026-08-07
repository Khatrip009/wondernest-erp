import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider, DatePicker } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAttendanceSessions } from '../../../hooks/useAcademics'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const AttendanceList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ search: '', batch_id: '', date_range: null })

  const { data, isLoading, refetch } = useAttendanceSessions(page, pageSize, {
    ...filters,
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  })

  // Fetch batches for filter
  const { data: batches } = useQuery({
    queryKey: ['batches-attendance-filter', selectedBranch?.id],
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

  const columns = [
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Date</span>,
      dataIndex: 'attendance_date',
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Batch</span>,
      dataIndex: ['batches', 'batch_name'],
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text}</span>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Topic</span>,
      dataIndex: 'topic_covered',
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Start Time</span>,
      dataIndex: 'start_time',
      render: (t) => t ? dayjs(t, 'HH:mm:ss').format('HH:mm') : '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>End Time</span>,
      dataIndex: 'end_time',
      render: (t) => t ? dayjs(t, 'HH:mm:ss').format('HH:mm') : '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Teacher</span>,
      dataIndex: ['teachers', 'first_name'],
      render: (first, record) => {
        const teacher = record.teachers
        return teacher ? `${teacher.first_name} ${teacher.last_name}` : '-'
      },
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Status</span>,
      render: (_, record) => {
        // You could add logic to show status based on whether attendance was taken
        return <Tag color="blue">Completed</Tag>
      },
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Actions</span>,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/academics/attendance/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search topic"
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
            {batches?.map(b => <Option key={b.id} value={b.id} style={{ fontFamily: fontBody }}>{b.batch_name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={8}>
          <RangePicker
            style={{ width: '100%' }}
            onChange={(dates) => {
              if (dates) {
                setFilters({ ...filters, date_from: dates[0].format('YYYY-MM-DD'), date_to: dates[1].format('YYYY-MM-DD') })
              } else {
                setFilters({ ...filters, date_from: null, date_to: null })
              }
            }}
          />
        </Col>
        <Col xs={24} sm={3}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/academics/attendance/new')} style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
              Take
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            <Button icon={<ClearOutlined />} onClick={() => setFilters({ search: '', batch_id: '', date_range: null })}>Clear</Button>
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

export default AttendanceList