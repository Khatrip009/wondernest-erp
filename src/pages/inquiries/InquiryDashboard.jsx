import { useState } from 'react'
import { Row, Col, Card, Statistic, Button, Typography, Skeleton, Table, Tag } from 'antd'
import {
  PhoneOutlined,
  CheckCircleOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useInquiryStats, useUpcomingDemos, useRecentDemos } from '../../hooks/useInquiries'
import DemoScheduleModal from './DemoScheduleModal'
import ConductDemoModal from './ConductDemoModal'
import { useTheme } from '../../contexts/ThemeContext'

const { Text } = Typography

const FunnelStep = ({ label, count, color, total, fontBody }) => {
  const width = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center mb-3">
      <div style={{ width: 120, textAlign: 'right', paddingRight: 12, fontFamily: fontBody }}>
        {label}
      </div>
      <div className="flex-1">
        <div
          style={{
            background: color,
            height: 28,
            borderRadius: 4,
            width: `${width}%`,
            minWidth: count > 0 ? 20 : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'width 0.3s',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 500, fontFamily: fontBody }}>
            {count}
          </Text>
        </div>
      </div>
    </div>
  )
}

const InquiryDashboard = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  // Get selected branch from outlet context (provided by MainLayout via InquiryPortal)
  const { selectedBranch, selectedFinancialYear, setSelectedBranch, setSelectedFinancialYear } =
    useOutletContext() || {}

  // Theme values with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [scheduleModalInquiry, setScheduleModalInquiry] = useState(null)
  const [conductModalDemo, setConductModalDemo] = useState(null)

  const { data: stats, isLoading: statsLoading } = useInquiryStats(selectedBranch?.id)
  const { data: upcomingDemos, isLoading: upcomingLoading } = useUpcomingDemos(selectedBranch?.id)
  const { data: recentDemos, isLoading: recentLoading } = useRecentDemos(selectedBranch?.id)

  // Ensure arrays even if data is undefined or null
  const upcomingData = Array.isArray(upcomingDemos) ? upcomingDemos : []
  const recentData = Array.isArray(recentDemos) ? recentDemos : []

  if (statsLoading) return <Skeleton active />

  const statusColorsMap = {
    Contacted: '#1677ff',
    'Demo Scheduled': '#faad14',
    'Demo Conducted': '#722ed1',
    Converted: '#52c41a',
    Lost: '#ff4d4f',
    Rejected: '#ff7875',
  }

  const statusOrder = ['Contacted', 'Demo Scheduled', 'Demo Conducted', 'Converted', 'Lost', 'Rejected']
  const funnelData = statusOrder.map((status) => ({
    name: status,
    count: stats?.statusCounts?.[status] || 0,
    color: statusColorsMap[status] || '#d9d9d9',
  }))

  const pieData = stats?.sourceDistribution?.map((s) => ({ name: s.name, value: s.count })) || []
  const barData = stats?.courseDistribution?.map((c) => ({ name: c.name, inquiries: c.count })) || []
  const conversionRate = stats?.total
    ? ((stats.statusCounts?.['Converted'] || 0) / stats.total * 100).toFixed(1)
    : 0

  const upcomingColumns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: ['inquiries', 'student_name'],
      key: 'student',
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Scheduled At</span>,
      dataIndex: 'scheduled_at',
      key: 'scheduled_at',
      render: (d) => (
        <span style={{ fontFamily: fontBody, color: primaryColor }}>
          {d ? new Date(d).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      key: 'teacher',
      render: (_, r) => (
        <span style={{ fontFamily: fontBody, color: primaryColor }}>
          {r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Duration</span>,
      dataIndex: 'duration_minutes',
      key: 'duration',
      render: (d) => (
        <span style={{ fontFamily: fontBody, color: primaryColor }}>
          {d ? `${d} min` : '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Action</span>,
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<VideoCameraOutlined />}
          onClick={() => setConductModalDemo(record)}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
        >
          Conduct
        </Button>
      ),
    },
  ]

  const recentColumns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: ['inquiries', 'student_name'],
      key: 'student',
      render: (text) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Conducted At</span>,
      dataIndex: 'conducted_at',
      key: 'conducted_at',
      render: (d) => (
        <span style={{ fontFamily: fontBody, color: primaryColor }}>
          {d ? new Date(d).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Outcome</span>,
      dataIndex: 'outcome',
      key: 'outcome',
      render: (o) =>
        o ? (
          <Tag
            color={o === 'Success' ? 'green' : o === 'Fail' ? 'red' : 'default'}
            style={{ fontFamily: fontBody }}
          >
            {o}
          </Tag>
        ) : (
          <span style={{ fontFamily: fontBody, color: primaryColor }}>-</span>
        ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      key: 'teacher',
      render: (_, r) => (
        <span style={{ fontFamily: fontBody, color: primaryColor }}>
          {r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '-'}
        </span>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody }}>
      {/* Quick Stats Cards */}
      <Row gutter={16} className="mb-4">
        <Col xs={24} sm={12} md={4}>
          <Card
            bordered={false}
            style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
          >
            <Statistic
              title={<span style={{ fontFamily: fontBody }}>Total Inquiries</span>}
              value={stats?.total || 0}
              prefix={<PhoneOutlined style={{ color: primaryColor }} />}
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${statusColorsMap['Contacted']}` }}>
            <Statistic
              title={<span style={{ fontFamily: fontBody }}>Contacted</span>}
              value={stats?.statusCounts?.['Contacted'] || 0}
              valueStyle={{ color: statusColorsMap['Contacted'], fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${statusColorsMap['Demo Scheduled']}` }}>
            <Statistic
              title={<span style={{ fontFamily: fontBody }}>Demo Scheduled</span>}
              value={stats?.statusCounts?.['Demo Scheduled'] || 0}
              valueStyle={{ color: statusColorsMap['Demo Scheduled'], fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${statusColorsMap['Converted']}` }}>
            <Statistic
              title={<span style={{ fontFamily: fontBody }}>Converted</span>}
              value={stats?.statusCounts?.['Converted'] || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: statusColorsMap['Converted'], fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ fontFamily: fontBody }}>Conversion Rate</span>}
              value={conversionRate}
              suffix="%"
              precision={1}
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
          </Card>
        </Col>
      </Row>

      {/* Inquiry Funnel */}
      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Inquiry Funnel</span>}
        className="mb-4"
        bordered={false}
        style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {funnelData.map((step) => (
            <FunnelStep
              key={step.name}
              label={step.name}
              count={step.count}
              color={step.color}
              total={stats?.total || 0}
              fontBody={fontBody}
            />
          ))}
        </div>
      </Card>

      {/* Two tables: Upcoming Demos & Recent Conducted Demos */}
      <Row gutter={16} className="mb-4">
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Upcoming Demos</span>}
            extra={
              <Button
                type="link"
                onClick={() => navigate('/inquiries/demos')}
                style={{ color: primaryColor, fontFamily: fontBody }}
              >
                View all
              </Button>
            }
            bordered={false}
            style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
          >
            {upcomingLoading ? (
              <Skeleton active />
            ) : (
              <Table
                dataSource={upcomingData}
                columns={upcomingColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'No upcoming demos' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Recently Conducted Demos</span>}
            extra={
              <Button
                type="link"
                onClick={() => navigate('/inquiries/demos')}
                style={{ color: primaryColor, fontFamily: fontBody }}
              >
                View all
              </Button>
            }
            bordered={false}
            style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
          >
            {recentLoading ? (
              <Skeleton active />
            ) : (
              <Table
                dataSource={recentData}
                columns={recentColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'No recent demos' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Source Distribution</span>}
            bordered={false}
            style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c'][index % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Course Interest</span>}
            bordered={false}
            style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inquiries" fill={primaryColor} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Modals */}
      {scheduleModalInquiry && (
        <DemoScheduleModal
          open={true}
          inquiryId={scheduleModalInquiry}
          onClose={() => setScheduleModalInquiry(null)}
        />
      )}
      {conductModalDemo && (
        <ConductDemoModal
          open={true}
          demo={conductModalDemo}
          inquiryId={conductModalDemo.inquiry_id}
          onClose={() => setConductModalDemo(null)}
        />
      )}
    </div>
  )
}

export default InquiryDashboard