import { Row, Col, Card, Statistic, Typography, Table, Skeleton } from 'antd'
import { RiseOutlined, FallOutlined, BookOutlined } from '@ant-design/icons'
import { useOutletContext } from 'react-router-dom'
import { useIncomeExpenseSummary, useLedger } from '../../hooks/useAccounts'
import { useTheme } from '../../contexts/ThemeContext'

const { Text } = Typography

const AccountsDashboard = () => {
  const { theme } = useTheme()
  const { selectedBranch, selectedFinancialYear, orgId } = useOutletContext() || {}
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

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
  if (!orgId) return <div>Please select an organization</div>

  const topAccounts = ledger
    ?.filter(a => a.balance !== 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 5) || []

  const columns = [
    { title: 'Account', dataIndex: 'account_name' },
    { title: 'Code', dataIndex: 'account_code' },
    { title: 'Type', dataIndex: 'account_type' },
    { title: 'Balance', render: (_, r) => `₹${(r.balance || 0).toFixed(2)}` },
  ]

  return (
    <div style={{ fontFamily: fontBody }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title="Total Income"
              value={summary?.totalIncome || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title="Total Expenses"
              value={summary?.totalExpenses || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#cf1322' }}
              prefix={<FallOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title="Net Profit / Loss"
              value={summary?.netProfit || 0}
              precision={2}
              prefix="₹"
              valueStyle={{ color: (summary?.netProfit || 0) >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title="Total Accounts"
              value={ledger?.length || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Top Accounts by Balance" bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Table dataSource={topAccounts} columns={columns} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Income vs Expenses" bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
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