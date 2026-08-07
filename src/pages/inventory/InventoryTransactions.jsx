// src/pages/inventory/InventoryTransactions.jsx
import { Table, Card, Typography, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Title } = Typography

const InventoryTransactions = () => {
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['inventory-transactions', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      // Fetch via branch (since transactions have branch_id)
      const { data: branches } = await supabase.from('branches').select('id').eq('organization_id', org.id)
      const branchIds = (branches || []).map(b => b.id)
      if (branchIds.length === 0) return []

      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, inventory_items(item_name)')
        .in('branch_id', branchIds)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  const columns = [
    { title: 'Date', dataIndex: 'created_at', render: (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-' },
    { title: 'Item', render: (_, r) => r.inventory_items?.item_name || '-' },
    {
      title: 'Type', dataIndex: 'transaction_type',
      render: (t) => {
        const color = t === 'purchase' ? 'green' : t === 'issue' ? 'red' : 'orange'
        return <Tag color={color}>{t}</Tag>
      }
    },
    { title: 'Quantity', dataIndex: 'quantity' },
    { title: 'Unit Price', dataIndex: 'unit_price', render: (v) => v ? `₹${v.toFixed(2)}` : '-' },
    { title: 'Total', dataIndex: 'total_amount', render: (v) => v ? `₹${v.toFixed(2)}` : '-' },
    { title: 'Reference', dataIndex: 'reference' },
  ]

  return (
    <div style={{ fontFamily: fontBody, padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Inventory Transactions</Title>}
      >
        <Table dataSource={transactions} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  )
}

export default InventoryTransactions