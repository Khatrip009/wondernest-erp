import { Table, Card, Tag } from 'antd'
import { useOutletContext } from 'react-router-dom'
import { useTrialBalance } from '../../hooks/useAccounts'
import { useTheme } from '../../contexts/ThemeContext'

const TrialBalance = () => {
  const { theme } = useTheme()
  const { selectedBranch, selectedFinancialYear, orgId } = useOutletContext() || {}
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const { data, isLoading } = useTrialBalance(
    orgId,
    selectedBranch?.id,
    selectedFinancialYear?.id
  )

  const columns = [
    { title: 'Account Code', dataIndex: 'account_code' },
    { title: 'Account Name', dataIndex: 'account_name' },
    { title: 'Type', dataIndex: 'account_type', render: (t) => <Tag>{t}</Tag> },
    {
      title: 'Debit Balance',
      render: (_, r) => (r.balance > 0 ? `₹${(r.balance || 0).toFixed(2)}` : '-')
    },
    {
      title: 'Credit Balance',
      render: (_, r) => (r.balance < 0 ? `₹${Math.abs(r.balance || 0).toFixed(2)}` : '-')
    },
  ]

  const totalDebit = data?.reduce((s, r) => s + (r.balance > 0 ? r.balance : 0), 0) || 0
  const totalCredit = data?.reduce((s, r) => s + (r.balance < 0 ? Math.abs(r.balance) : 0), 0) || 0

  return (
    <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}>
      <Table
        dataSource={data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
      />
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 32 }}>
        <span style={{ fontWeight: 'bold', color: primaryColor }}>Total Debit: ₹{totalDebit.toFixed(2)}</span>
        <span style={{ fontWeight: 'bold', color: primaryColor }}>Total Credit: ₹{totalCredit.toFixed(2)}</span>
        <span style={{ fontWeight: 'bold', color: totalDebit === totalCredit ? '#3f8600' : '#cf1322' }}>
          {totalDebit === totalCredit ? 'Balanced' : 'Unbalanced'}
        </span>
      </div>
    </Card>
  )
}

export default TrialBalance