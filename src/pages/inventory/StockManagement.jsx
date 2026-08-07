// src/pages/inventory/StockManagement.jsx
import { useState } from 'react'
import { Table, Card, InputNumber, Button, Space, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'

const { Title } = Typography

const StockManagement = () => {
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const { selectedBranch } = useScope()
  const queryClient = useQueryClient()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const [adjustments, setAdjustments] = useState({})

  // Fetch inventory items with branch stock
  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ['branch-stock', selectedBranch?.id, org?.id],
    queryFn: async () => {
      if (!org?.id || !selectedBranch?.id) return []

      // Get all active products for the org
      const { data: products } = await supabase
        .from('inventory_items')
        .select('id, item_name, unit')
        .eq('organization_id', org.id)
        .eq('item_type', 'product')
        .eq('is_active', true)

      if (!products || products.length === 0) return []

      // Get stock for this branch
      const itemIds = products.map(p => p.id)
      const { data: stocks } = await supabase
        .from('inventory_branch_stock')
        .select('item_id, quantity')
        .eq('branch_id', selectedBranch.id)
        .in('item_id', itemIds)

      const stockMap = {}
      ;(stocks || []).forEach(s => { stockMap[s.item_id] = s.quantity })

      return products.map(p => ({
        ...p,
        current_stock: stockMap[p.id] || 0,
      }))
    },
    enabled: !!org?.id && !!selectedBranch?.id,
  })

  const adjustMutation = useMutation({
    mutationFn: async ({ itemId, newStock, branchId }) => {
      // Upsert branch stock
      const { error } = await supabase
        .from('inventory_branch_stock')
        .upsert({
          item_id: itemId,
          branch_id: branchId,
          quantity: newStock,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'item_id, branch_id' })
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Stock updated')
      queryClient.invalidateQueries(['branch-stock'])
    },
    onError: (err) => message.error(err.message),
  })

  const handleAdjust = (itemId, currentStock) => {
    const newStock = adjustments[itemId]
    if (newStock === undefined || newStock === null) {
      message.warning('Enter a quantity')
      return
    }
    adjustMutation.mutate({ itemId, newStock, branchId: selectedBranch.id })
    setAdjustments(prev => ({ ...prev, [itemId]: undefined }))
  }

  const columns = [
    { title: 'Item', dataIndex: 'item_name' },
    { title: 'Unit', dataIndex: 'unit' },
    { title: 'Current Stock', dataIndex: 'current_stock' },
    {
      title: 'Adjust To',
      render: (_, record) => (
        <InputNumber
          min={0}
          style={{ width: 80 }}
          value={adjustments[record.id] !== undefined ? adjustments[record.id] : undefined}
          onChange={(val) => setAdjustments({ ...adjustments, [record.id]: val })}
          placeholder="Qty"
        />
      ),
    },
    {
      title: 'Action',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          onClick={() => handleAdjust(record.id, record.current_stock)}
          loading={adjustMutation.isLoading}
        >
          Save
        </Button>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Branch Stock Management</Title>}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
        }
      >
        <Table dataSource={items} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  )
}

export default StockManagement