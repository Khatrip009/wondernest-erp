import { Row, Col, Card, Statistic, Typography, Table, Tag, Skeleton, Alert } from 'antd'
import { DollarOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useOutletContext } from 'react-router-dom'
import { useFeeStats } from '../../hooks/useFees'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Text } = Typography

const FeesDashboard = () => {
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  
  const orgId = org?.id
  const branchId = selectedBranch?.id
  const financialYearId = selectedFinancialYear?.id  // ✅ extract ID
  

  // Only fetch if branch and financial year are selected
  const isReady = !!orgId && !!branchId && !!financialYearId

   const { data: stats, isLoading, error } = useFeeStats(
    orgId,
    branchId,
    financialYearId,  // ✅ pass the ID, not the object
    { enabled: isReady }
  )

  if (!isReady) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          Please select a branch and financial year to view fee statistics.
        </div>
      </Card>
    )
  }
  if (isLoading) return <Skeleton active />
  if (error) {
    console.error('Fee stats error:', error)
    return (
      <Alert
        message="Error loading statistics"
        description={error.message || 'Something went wrong'}
        type="error"
        showIcon
      />
    )
  }

  const cards = [
    { title: 'Total Fees', value: stats?.total || 0, icon: <DollarOutlined />, color: '#1677ff' },
    { title: 'Paid', value: stats?.paid || 0, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: 'Pending', value: stats?.pending || 0, icon: <ClockCircleOutlined />, color: '#faad14' },
    { title: 'Partially Paid', value: stats?.partial || 0, icon: <DollarOutlined />, color: '#722ed1' },
    { title: 'Overdue', value: stats?.overdue || 0, icon: <ExclamationCircleOutlined />, color: '#ff4d4f' },
    { title: 'Collected (₹)', value: stats?.totalCollected?.toFixed(2) || '0.00', icon: <DollarOutlined />, color: '#52c41a' },
    { title: 'Pending (₹)', value: stats?.totalPending?.toFixed(2) || '0.00', icon: <DollarOutlined />, color: '#ff4d4f' },
  ]

  const recentColumns = [
    {
      title: 'Student',
      dataIndex: ['students', 'full_name_formatted'],
      render: (name, record) => name || `Student #${record.student_id}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => (
        <Tag color={v === 'Paid' ? 'green' : v === 'Partially Paid' ? 'orange' : 'red'}>
          {v || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'final_fee',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'Paid',
      dataIndex: 'paid_amount',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      render: (d) => d || '-',
    },
  ]

  return (
    <div style={{ fontFamily: fontBody }}>
      <Row gutter={[16, 16]}>
        {cards.map((c, idx) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={idx}>
            <Card
              bordered={false}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderTop: `4px solid ${c.color}`,
                height: '100%',
              }}
            >
              <Statistic
                title={<span style={{ fontFamily: fontBody, color: primaryColor }}>{c.title}</span>}
                value={c.value}
                prefix={<span style={{ color: c.color }}>{c.icon}</span>}
                valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={<Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>Recent Fee Activity</Text>}
        bordered={false}
        style={{ marginTop: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}` }}
      >
        <Table
          dataSource={stats?.recent || []}
          columns={recentColumns}
          rowKey={(_, i) => i}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No recent activity' }}
        />
      </Card>
    </div>
  )
}

export default FeesDashboard