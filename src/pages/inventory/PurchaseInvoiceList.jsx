// src/pages/inventory/PurchaseInvoiceList.jsx
import { Table, Card, Button, Space, Typography, Tag, message, Popconfirm } from 'antd'
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { usePurchaseInvoices } from '../../hooks/usePurchaseInvoices'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Title } = Typography   // ✅ fixed: destructure Title

const PurchaseInvoiceList = () => {
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const navigate = useNavigate()
  const { org } = useOrganization()
  const queryClient = useQueryClient()

  const { data: invoices, isLoading } = usePurchaseInvoices()

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('purchase_invoices')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Invoice deleted')
      queryClient.invalidateQueries(['purchase-invoices'])
    },
    onError: (err) => message.error(err.message),
  })

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      render: (text, record) => (
        <a onClick={() => navigate(`/inventory/purchase-invoices/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Vendor',
      render: (_, r) => r.vendors?.vendor_name || '-',
    },
    {
      title: 'Date',
      dataIndex: 'invoice_date',
      render: (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Taxable',
      dataIndex: 'total_taxable_amount',
      render: (v) => `₹${(v || 0).toFixed(2)}`,
    },
    {
      title: 'GST',
      dataIndex: 'total_gst_amount',
      render: (v) => `₹${(v || 0).toFixed(2)}`,
    },
    {
      title: 'Grand Total',
      dataIndex: 'grand_total',
      render: (v) => `₹${(v || 0).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s) => {
        const color = s === 'Draft' ? 'default' : s === 'Final' ? 'green' : 'red'
        return <Tag color={color}>{s}</Tag>
      },
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/inventory/purchase-invoices/${record.id}`)}
          />
          <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={<Title level={4} style={{ color: primaryColor }}>Purchase Invoices</Title>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/purchase-invoices/new')}>
          New Invoice
        </Button>
      }
      bordered={false}
      style={{ borderTop: `4px solid ${primaryColor}` }}
    >
      <Table
        dataSource={invoices}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />
    </Card>
  )
}

export default PurchaseInvoiceList