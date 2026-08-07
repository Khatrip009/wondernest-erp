// src/pages/inventory/PurchaseInvoices.jsx
import { Table, Card, Button, Typography, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Title } = Typography

const PurchaseInvoices = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['purchase-invoices', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*, vendors(vendor_name)')
        .eq('organization_id', org.id)
        .order('invoice_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoice_number' },
    { title: 'Vendor', render: (_, r) => r.vendors?.vendor_name || '-' },
    { title: 'Date', dataIndex: 'invoice_date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Taxable', dataIndex: 'total_taxable_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'GST', dataIndex: 'total_gst_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Grand Total', dataIndex: 'grand_total', render: (v) => `₹${(v || 0).toFixed(2)}` },
    {
      title: 'Status', dataIndex: 'status',
      render: (s) => {
        const color = s === 'Draft' ? 'default' : s === 'Final' ? 'green' : 'red'
        return <Tag color={color}>{s}</Tag>
      }
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Purchase Invoices</Title>}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/inventory/purchase-invoices/new')}
          >
            New Invoice
          </Button>
        }
      >
        <Table dataSource={invoices} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  )
}

export default PurchaseInvoices