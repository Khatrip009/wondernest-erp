// src/pages/inquiries/DemoList.jsx
import { useState } from 'react'
import { Table, Button, Space, Tag, Input, Select, Row, Col, Card, Divider, message, Alert, Typography } from 'antd'
import { SearchOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDemos } from '../../hooks/useDemos'
import { statusColors } from '../../utils/constants'
import { exportCSV } from '../../utils/csvExport'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Option } = Select
const { Title } = Typography

const DemoList = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { selectedBranch } = useScope()
  const { org } = useOrganization()
  const orgId = org?.id

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const bgColor = darkMode ? '#141414' : '#f5f5f5'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const headerBg = darkMode ? '#2c2c2c' : '#fafafa'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ status: '', search: '', branch_name: '' })

  const { data, isLoading, error, refetch } = useDemos(
    page,
    pageSize,
    {
      ...filters,
      branch_id: selectedBranch?.id,
    },
    orgId
  )

  // Early exit states
  if (!orgId) {
    return (
      <Card style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
        <div style={{ padding: 20, textAlign: 'center', color: textColor, fontFamily: fontBody }}>
          Please log in to view demo sessions.
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card style={{ backgroundColor: cardBg, borderTop: `4px solid ${accentColor}` }}>
        <Alert
          message="Failed to load demo sessions"
          description={error.message || 'Please try again later'}
          type="error"
          showIcon
        />
      </Card>
    )
  }

  if (!selectedBranch?.id) {
    return (
      <Card style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
        <div style={{ padding: 20, textAlign: 'center', color: textColor, fontFamily: fontBody }}>
          Please select a branch to view demo sessions.
        </div>
      </Card>
    )
  }

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Branch</span>,
      dataIndex: 'branch_name',
      key: 'branch_name',
      width: 120,
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Inquiry No</span>,
      dataIndex: 'inquiry_no',
      key: 'inquiry_no',
      width: 100,
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'student_name',
      key: 'student_name',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile_no',
      key: 'mobile_no',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course_name',
      key: 'course_name',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    // ✅ Scheduled Date – using scheduled_at directly
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Scheduled Date</span>,
      dataIndex: 'scheduled_at',
      key: 'scheduled_date',
      render: (val) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
          {val ? new Date(val).toLocaleDateString('en-IN') : '-'}
        </span>
      ),
    },
    // ✅ Scheduled Time
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Scheduled Time</span>,
      dataIndex: 'scheduled_at',
      key: 'scheduled_time',
      render: (val) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
          {val ? new Date(val).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
        </span>
      ),
    },
    // ✅ Conducted Date
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Conducted Date</span>,
      dataIndex: 'conducted_at',
      key: 'conducted_date',
      render: (val) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
          {val ? new Date(val).toLocaleDateString('en-IN') : '-'}
        </span>
      ),
    },
    // ✅ Conducted Time
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Conducted Time</span>,
      dataIndex: 'conducted_at',
      key: 'conducted_time',
      render: (val) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
          {val ? new Date(val).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status] || 'default'} style={{ fontFamily: fontBody }}>
          {status || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Action</span>,
      key: 'action',
      render: (_, record) => {
        const demoId = record.id || record.demo_session_id
        return (
          <Button
            icon={<EyeOutlined />}
            size="small"
            disabled={!demoId}
            onClick={() => {
              if (demoId) {
                navigate(`/inquiries/demos/${demoId}`)
              } else {
                message.warning('Demo ID not available')
              }
            }}
            style={{
              borderColor: primaryColor,
              color: primaryColor,
              fontFamily: fontBody,
            }}
          >
            View
          </Button>
        )
      },
    },
  ]

  const handleExport = () => {
    if (data?.data?.length) {
      exportCSV(
        [
          { title: 'Branch', dataIndex: 'branch_name' },
          { title: 'Inquiry No', dataIndex: 'inquiry_no' },
          { title: 'Student Name', dataIndex: 'student_name' },
          { title: 'Mobile', dataIndex: 'mobile_no' },
          { title: 'Course', dataIndex: 'course_name' },
          { title: 'Scheduled Date', dataIndex: 'scheduled_at' },
          { title: 'Scheduled Time', dataIndex: 'scheduled_at' },
          { title: 'Conducted Date', dataIndex: 'conducted_at' },
          { title: 'Conducted Time', dataIndex: 'conducted_at' },
          { title: 'Teacher', dataIndex: 'teacher_name' },
          { title: 'Status', dataIndex: 'status' },
        ],
        data.data,
        'demo_sessions.csv'
      )
      message.success('CSV exported')
    } else {
      message.warning('No data to export')
    }
  }

  return (
    <div style={{ backgroundColor: bgColor, fontFamily: fontBody, padding: 8 }}>
      <Card
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
        title={
          <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
            Demo Sessions
          </Title>
        }
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ fontFamily: fontBody, color: textColor, borderColor }}
          >
            Export CSV
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={8}>
            <Input
              placeholder="Search name, mobile or inquiry no"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
              style={{ fontFamily: fontBody }}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.status || undefined}
              onChange={(val) => setFilters({ ...filters, status: val })}
            >
              <Option value="Scheduled">Scheduled</Option>
              <Option value="Conducted">Conducted</Option>
              <Option value="Rescheduled">Rescheduled</Option>
              <Option value="Cancelled">Cancelled</Option>
              <Option value="No-Show">No-Show</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="Branch name"
              value={filters.branch_name}
              onChange={(e) => setFilters({ ...filters, branch_name: e.target.value })}
              allowClear
              style={{ fontFamily: fontBody }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              onClick={() => refetch()}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Refresh
            </Button>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0', borderColor }} />

        <Table
          dataSource={data?.data || []}
          columns={columns}
          loading={isLoading}
          rowKey={(record) => record.id || record.demo_session_id}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.count || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} demos`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
          size="middle"
          locale={{ emptyText: 'No demo sessions found for the selected branch.' }}
          style={{ backgroundColor: cardBg }}
        />
      </Card>
    </div>
  )
}

export default DemoList