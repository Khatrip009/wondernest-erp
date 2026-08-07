// src/pages/inventory/PurchaseInvoiceDetail.jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Button, Space, Spin, Tag, Typography, message,
  Table, Popconfirm
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { usePurchaseInvoice } from '../../hooks/usePurchaseInvoices'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportPurchaseInvoicePDF } from '../../utils/exportPurchaseInvoicePDF'
import dayjs from 'dayjs'

const { Title } = Typography

const PurchaseInvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [loading, setLoading] = useState(false)

  const { data: invoice, isLoading } = usePurchaseInvoice(id)

  const handleFinalize = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('purchase_invoices')
        .update({ status: 'Final', updated_at: new Date().toISOString() })
        .eq('id', Number(id))
      if (error) throw error
      message.success('Invoice finalized – stock updated & journal entry created')
      queryClient.invalidateQueries(['purchase-invoice', id])
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const { error } = await supabase
      .from('purchase_invoices')
      .delete()
      .eq('id', Number(id))
    if (error) {
      message.error(error.message)
      return
    }
    message.success('Invoice deleted')
    navigate('/inventory/purchase-invoices')
  }

  const handleDownloadPDF = () => {
    if (!invoice) return
    exportPurchaseInvoicePDF(invoice, org, theme)
  }

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!invoice) return <Card>Purchase invoice not found</Card>

  const vendor = invoice.vendors || {}
  const items = invoice.purchase_invoice_items || []

  // totals from invoice object (already stored)
  const totalCGST = Number(invoice.total_cgst) || items.reduce((s, i) => s + Number(i.cgst_amount || 0), 0)
  const totalSGST = Number(invoice.total_sgst) || items.reduce((s, i) => s + Number(i.sgst_amount || 0), 0)
  const totalIGST = Number(invoice.total_igst) || items.reduce((s, i) => s + Number(i.igst_amount || 0), 0)
  const totalTaxable = Number(invoice.total_taxable_amount) || items.reduce((s, i) => s + Number(i.taxable_amount || 0), 0)
  const totalGST = totalCGST + totalSGST + totalIGST
  const grandTotal = Number(invoice.grand_total) || totalTaxable + totalGST
  const balanceDue = grandTotal - (Number(invoice.paid_amount) || 0)

  const itemColumns = [
    { title: 'Item', render: (_, r) => r.inventory_items?.item_name || r.description || '-' },
    { title: 'HSN/SAC', dataIndex: 'hsn_sac_code' },
    { title: 'Qty', dataIndex: 'quantity' },
    { title: 'Unit Price', dataIndex: 'unit_price', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Taxable', dataIndex: 'taxable_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'CGST', dataIndex: 'cgst_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'SGST', dataIndex: 'sgst_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'IGST', dataIndex: 'igst_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Total', dataIndex: 'total_amount', render: (v) => `₹${(v || 0).toFixed(2)}` },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inventory/purchase-invoices')}>
          Back
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadPDF}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Download PDF
        </Button>
        {invoice.status === 'Draft' && (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleFinalize}
            loading={loading}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Finalize
          </Button>
        )}
        <Popconfirm title="Delete this invoice?" onConfirm={handleDelete}>
          <Button danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}>
        <Title level={4} style={{ color: primaryColor }}>
          Purchase Invoice #{invoice.invoice_number}
        </Title>

        <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Vendor">{vendor.vendor_name || invoice.vendor_id}</Descriptions.Item>
          <Descriptions.Item label="Invoice Date">{dayjs(invoice.invoice_date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{invoice.due_date ? dayjs(invoice.due_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Reference">{invoice.reference || '-'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={invoice.status === 'Final' ? 'green' : invoice.status === 'Draft' ? 'default' : 'red'}>
              {invoice.status}
            </Tag>
          </Descriptions.Item>
          {/* Detailed tax breakdown */}
          <Descriptions.Item label="Taxable Amount">₹{totalTaxable.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="CGST">₹{totalCGST.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="SGST">₹{totalSGST.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="IGST">₹{totalIGST.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Total GST">₹{totalGST.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Grand Total">₹{grandTotal.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Paid">₹{(invoice.paid_amount || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Balance Due">₹{balanceDue.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Notes">{invoice.notes || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Items" bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Table dataSource={items} columns={itemColumns} rowKey="id" pagination={false} size="small" scroll={{ x: 1000 }} />
      </Card>
    </div>
  )
}

export default PurchaseInvoiceDetail