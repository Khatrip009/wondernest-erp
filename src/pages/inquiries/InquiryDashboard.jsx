import { useState } from 'react'
import { Row, Col, Card, Statistic, Button, Typography, Skeleton, Table, Tag } from 'antd'
import {
  PhoneOutlined,
  CheckCircleOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useInquiryStats, useUpcomingDemos, useRecentDemos } from '../../hooks/useInquiries'
import DemoScheduleModal from './DemoScheduleModal'
import ConductDemoModal from './ConductDemoModal'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'

const { Text } = Typography

// ─── Funnel Step ────────────────────────────────────────────────────────
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

// ─── Dashboard Component ────────────────────────────────────────────────
const InquiryDashboard = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  const [scheduleModalInquiry, setScheduleModalInquiry] = useState(null)
  const [conductModalDemo, setConductModalDemo] = useState(null)

  const { data: stats, isLoading: statsLoading } = useInquiryStats(selectedBranch?.id)
  const { data: upcomingDemos, isLoading: upcomingLoading } = useUpcomingDemos(selectedBranch?.id)
  const { data: recentDemos, isLoading: recentLoading } = useRecentDemos(selectedBranch?.id)

  // ✅ Fix: extract the `data` array from the hook result
  const upcomingData = upcomingDemos?.data || []
  const recentData = recentDemos?.data || []

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
      dataIndex: 'student_name',   // ✅ fixed from ['inquiries', 'student_name']
      key: 'student',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Scheduled At</span>,
      dataIndex: 'scheduled_at',
      key: 'scheduled_at',
      render: (d) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
          {d ? new Date(d).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      key: 'teacher',
      render: (_, r) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
          {r.teacher_name || '-'}   
        </span>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Duration</span>,
      dataIndex: 'duration_minutes',
      key: 'duration',
      render: (d) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
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
      dataIndex: 'student_name',   // ✅ fixed from ['inquiries', 'student_name']
      key: 'student',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Conducted At</span>,
      dataIndex: 'conducted_at',
      key: 'conducted_at',
      render: (d) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
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
          <span style={{ fontFamily: fontBody, color: textColor }}>-</span>
        ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      key: 'teacher',
      render: (_, r) => (
        <span style={{ fontFamily: fontBody, color: textColor }}>
          {r.teacher_name || '-'} 
        </span>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5' }}>
      {/* Quick Stats */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12} md={4}>
          <Card
            bordered={false}
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: fontBody, color: textColor }}>Total Inquiries</span>}
              value={stats?.total || 0}
              prefix={<PhoneOutlined style={{ color: primaryColor }} />}
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card
            bordered={false}
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${statusColorsMap['Contacted']}`,
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: fontBody, color: textColor }}>Contacted</span>}
              value={stats?.statusCounts?.['Contacted'] || 0}
              valueStyle={{ color: statusColorsMap['Contacted'], fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card
            bordered={false}
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${statusColorsMap['Demo Scheduled']}`,
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: fontBody, color: textColor }}>Demo Scheduled</span>}
              value={stats?.statusCounts?.['Demo Scheduled'] || 0}
              valueStyle={{ color: statusColorsMap['Demo Scheduled'], fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card
            bordered={false}
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${statusColorsMap['Converted']}`,
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: fontBody, color: textColor }}>Converted</span>}
              value={stats?.statusCounts?.['Converted'] || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: statusColorsMap['Converted'], fontFamily: fontHeading }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card
            bordered={false}
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <Statistic
              title={<span style={{ fontFamily: fontBody, color: textColor }}>Conversion Rate</span>}
              value={conversionRate}
              suffix="%"
              precision={1}
              valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
            />
          </Card>
        </Col>
      </Row>

      {/* Two tables: Upcoming & Recent Demos */}
      <Row gutter={[16, 16]} className="mb-4">
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
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
            }}
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
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
            }}
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
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Source Distribution</span>}
            bordered={false}
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c'][idx % 5]} />
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
            style={{
              backgroundColor: cardBg,
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke={textColor} />
                <YAxis allowDecimals={false} stroke={textColor} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inquiries" fill={primaryColor} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Inquiry Funnel */}
      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Inquiry Funnel</span>}
        className="mb-4"
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          borderTop: `4px solid ${primaryColor}`,
          marginTop: 16,
        }}
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