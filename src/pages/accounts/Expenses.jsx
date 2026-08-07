import { Table, Card } from 'antd'
import { useOutletContext } from 'react-router-dom'
import { useExpenseTransactions } from '../../hooks/useAccounts'
import { useTheme } from '../../contexts/ThemeContext'

const Expenses = () => {
  const { theme } = useTheme()
  const { selectedBranch, selectedFinancialYear, orgId } = useOutletContext() || {}
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data, isLoading } = useExpenseTransactions(1, 100, {
    orgId,                                    // ✅ pass organization ID
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  })

  const columns = [
    { title: 'Date', dataIndex: 'expense_date' },
    { title: 'Category', dataIndex: 'category' },
    { title: 'Amount', dataIndex: 'amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Payment Mode', dataIndex: 'payment_mode' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'GST', dataIndex: 'gst_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
  ]

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Table
        dataSource={data?.data || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />
    </Card>
  )
}

export default Expenses