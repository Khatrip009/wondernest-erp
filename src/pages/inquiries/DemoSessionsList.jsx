import { useState } from 'react'
import { Table, Button, Space, Tag, Input, Select, Row, Col, Card, Divider, message, Alert } from 'antd'
import { SearchOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useDemos } from '../../hooks/useDemos'
import { statusColors } from '../../utils/constants'
import { exportCSV } from '../../utils/csvExport'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext' // 👈 import

const { Option } = Select

const DemoList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear, orgId: contextOrgId } = outletContext

  // 👇 fallback: get org from context if not provided via outlet
  const { org: orgFromProvider } = useOrganization()
  const orgId = contextOrgId || orgFromProvider?.id

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

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

  // If orgId is missing, show message
  if (!orgId) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <div style={{ padding: 20, textAlign: 'center', color: '#999', fontFamily: fontBody }}>
          Please log in to view demo sessions.
        </div>
      </Card>
    )
  }

  // If error, show alert
  if (error) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Alert
          message="Failed to load demo sessions"
          description={error.message || 'Please try again later'}
          type="error"
          showIcon
        />
      </Card>
    )
  }

  // Show a message if no branch selected
  if (!selectedBranch?.id) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <div style={{ padding: 20, textAlign: 'center', color: '#999', fontFamily: fontBody }}>
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
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Inquiry No</span>,
      dataIndex: 'inquiry_no',
      key: 'inquiry_no',
      width: 100,
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'student_full_name',
      key: 'student_full_name',
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile_no',
      key: 'mobile_no',
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course_name',
      key: 'course_name',
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Scheduled Date</span>,
      dataIndex: 'scheduled_date',
      key: 'scheduled_date',
      render: (d) =>
        d ? (
          <span style={{ fontFamily: fontBody }}>{new Date(d).toLocaleDateString()}</span>
        ) : (
          <span style={{ fontFamily: fontBody }}>-</span>
        ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Scheduled Time</span>,
      dataIndex: 'scheduled_time',
      key: 'scheduled_time',
      render: (t) =>
        t ? (
          <span style={{ fontFamily: fontBody }}>
            {new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span style={{ fontFamily: fontBody }}>-</span>
        ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Conducted Date</span>,
      dataIndex: 'conducted_date',
      key: 'conducted_date',
      render: (d) =>
        d ? (
          <span style={{ fontFamily: fontBody }}>{new Date(d).toLocaleDateString()}</span>
        ) : (
          <span style={{ fontFamily: fontBody }}>-</span>
        ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Conducted Time</span>,
      dataIndex: 'conducted_time',
      key: 'conducted_time',
      render: (t) =>
        t ? (
          <span style={{ fontFamily: fontBody }}>
            {new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span style={{ fontFamily: fontBody }}>-</span>
        ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
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
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/inquiries/demos/${record.demo_session_id}`)}
          style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
        >
          View
        </Button>
      ),
    },
  ]

  const handleExport = () => {
    if (data?.data?.length) {
      exportCSV(
        [
          { title: 'Branch', dataIndex: 'branch_name' },
          { title: 'Inquiry No', dataIndex: 'inquiry_no' },
          { title: 'Student Name', dataIndex: 'student_full_name' },
          { title: 'Mobile', dataIndex: 'mobile_no' },
          { title: 'Course', dataIndex: 'course_name' },
          { title: 'Scheduled Date', dataIndex: 'scheduled_date' },
          { title: 'Scheduled Time', dataIndex: 'scheduled_time' },
          { title: 'Conducted Date', dataIndex: 'conducted_date' },
          { title: 'Conducted Time', dataIndex: 'conducted_time' },
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
    <div style={{ fontFamily: fontBody }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleExport} style={{ fontFamily: fontBody }}>
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

        <Divider style={{ margin: '16px 0' }} />

        <Table
          dataSource={data?.data || []}
          columns={columns}
          loading={isLoading}
          rowKey="demo_session_id"
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
        />
      </Card>
    </div>
  )
}

export default DemoList