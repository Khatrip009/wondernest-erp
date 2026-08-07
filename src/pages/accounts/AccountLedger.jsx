import { useState } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { Card, Table, Tag, Button, Space, Spin, DatePicker, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useAccountLedger, useAccounts } from '../../hooks/useAccounts'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Text } = Typography
const { RangePicker } = DatePicker

const AccountLedger = () => {
  const { accountId } = useParams()
  const { theme } = useTheme()
  const { selectedBranch, selectedFinancialYear, orgId } = useOutletContext() || {}
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const [dateRange, setDateRange] = useState(null)

  const { data: account, isLoading: acctLoading } = useAccounts(null, orgId, selectedBranch?.id, selectedFinancialYear?.id)
  const accountInfo = account?.find(a => a.id === parseInt(accountId))

  const fromDate = dateRange ? dateRange[0]?.format('YYYY-MM-DD') : null
  const toDate = dateRange ? dateRange[1]?.format('YYYY-MM-DD') : null

  const { data: entries, isLoading } = useAccountLedger(
    parseInt(accountId),
    orgId,
    selectedBranch?.id,
    selectedFinancialYear?.id,
    fromDate,
    toDate
  )

  const columns = [
    { title: 'Date', dataIndex: ['journal_entries', 'entry_date'], render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Reference', dataIndex: ['journal_entries', 'reference'] },
    { title: 'Description', dataIndex: ['journal_entries', 'description'] },
    { title: 'Debit', render: (_, r) => r.debit > 0 ? `₹${r.debit.toFixed(2)}` : '-' },
    { title: 'Credit', render: (_, r) => r.credit > 0 ? `₹${r.credit.toFixed(2)}` : '-' },
    { title: 'Balance', render: (_, r) => `₹${(r.running_balance || 0).toFixed(2)}` },
  ]

  const handleExport = () => {
    if (!entries || entries.length === 0) return
    const csv = entries.map(e => ({
      Date: dayjs(e.journal_entries?.entry_date).format('DD/MM/YYYY'),
      Reference: e.journal_entries?.reference || '',
      Description: e.journal_entries?.description || '',
      Debit: e.debit || 0,
      Credit: e.credit || 0,
      Balance: e.running_balance || 0,
    }))
    const headers = Object.keys(csv[0]).join(',')
    const rows = csv.map(r => Object.values(r).join(',')).join('\n')
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger_${accountInfo?.account_code || accountId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading || acctLoading) return <Spin />

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Space style={{ marginBottom: 16 }}>
        <Text strong style={{ color: primaryColor }}>Account: {accountInfo?.account_name} ({accountInfo?.account_code})</Text>
        <RangePicker onChange={(dates) => setDateRange(dates)} />
        <Button icon={<DownloadOutlined />} onClick={handleExport}>Export CSV</Button>
      </Space>
      <Table dataSource={entries || []} columns={columns} rowKey="id" pagination={false} size="small" />
    </Card>
  )
}

export default AccountLedger