import { Row, Col, Card, Statistic, Typography, Table, Skeleton } from 'antd'
import { RiseOutlined, FallOutlined, BookOutlined } from '@ant-design/icons'
import { useIncomeExpenseSummary, useLedger } from '../../hooks/useAccounts'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'

const { Text } = Typography

const AccountsDashboard = () => {
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const orgId = org?.id

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const { data: summary, isLoading: summaryLoading } = useIncomeExpenseSummary(
    orgId,
    selectedBranch?.id,
    selectedFinancialYear?.id
  )

  const { data: ledger, isLoading: ledgerLoading } = useLedger(
    orgId,
    selectedBranch?.id,
    selectedFinancialYear?.id
  )

  if (summaryLoading || ledgerLoading) return <Skeleton active />
  if (!orgId) return <div style={{ color: textColor }}>Please select an organization</div>

  const topAccounts = ledger
    ?.filter(a => a.balance !== 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 5) || []

  const columns = [
    { title: 'Account', dataIndex: 'account_name' },
    { title: 'Code', dataIndex: 'account_code' },
    { title: 'Type', dataIndex: 'account_type' },
    {
      title: 'Balance',
      render: (_, r) => `₹${(r.balance || 0).toFixed(2)}`,
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Total Income</span>}
              value={summary?.totalIncome || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Total Expenses</span>}
              value={summary?.totalExpenses || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Net Profit / Loss</span>}
              value={summary?.netProfit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: (summary?.netProfit || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Total Accounts</span>}
              value={ledger?.length || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: primaryColor }}>Top Accounts by Balance</span>} variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Table dataSource={topAccounts} columns={columns} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: primaryColor }}>Income vs Expenses</span>} variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Text style={{ fontSize: 18, color: primaryColor, fontFamily: fontHeading }}>
                Income: ₹{(summary?.totalIncome || 0).toFixed(2)}
              </Text>
              <br />
              <Text style={{ fontSize: 18, color: primaryColor, fontFamily: fontHeading }}>
                Expenses: ₹{(summary?.totalExpenses || 0).toFixed(2)}
              </Text>
              <br />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: (summary?.netProfit || 0) >= 0 ? '#3f8600' : '#cf1322' }}>
                {(summary?.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}: ₹{Math.abs(summary?.netProfit || 0).toFixed(2)}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AccountsDashboard