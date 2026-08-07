// src/pages/inventory/PurchaseOrderDetail.jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Button, Space, Spin, Tag, Typography, message,
  Table, Popconfirm, Select
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, DownloadOutlined
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import {
  usePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder
} from '../../hooks/usePurchaseOrders'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportPurchaseOrderPDF } from '../../utils/exportPurchaseOrderPDF'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const PurchaseOrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [updating, setUpdating] = useState(false)

  const { data: order, isLoading } = usePurchaseOrder(id)
  const updateMutation = useUpdatePurchaseOrder()
  const deleteMutation = useDeletePurchaseOrder()

  const handleStatusChange = async (newStatus) => {
    setUpdating(true)
    try {
      await updateMutation.mutateAsync({ id: Number(id), status: newStatus })
      message.success(`Order status updated to ${newStatus}`)
      queryClient.invalidateQueries(['purchase-order', id])
    } catch (err) {
      message.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(Number(id), {
      onSuccess: () => {
        message.success('Order deleted')
        navigate('/inventory/purchase-orders')
      },
      onError: (err) => message.error(err.message),
    })
  }

  const handleDownloadPDF = () => {
    if (!order) return
    exportPurchaseOrderPDF(order, org, theme)
  }

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!order) return <Card>Purchase order not found</Card>

  const items = order.purchase_order_items || []

  // ----- Column definitions with tax breakdown -----
  const itemColumns = [
    { title: 'Item', render: (_, r) => r.inventory_items?.item_name || '-' },
    { title: 'Unit', render: (_, r) => r.inventory_items?.unit || '-' },
    { title: 'Qty Ordered', dataIndex: 'quantity_ordered' },
    { title: 'Qty Received', dataIndex: 'quantity_received' },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      render: (v) => `₹${(v || 0).toFixed(2)}`
    },
    {
      title: 'Tax %',
      render: (_, r) => {
        const rate = r.tax_rates?.rate ?? 0
        return `${rate}%`
      }
    },
    {
      title: 'Taxable',
      render: (_, r) => {
        const qty = r.quantity_ordered || 0
        const price = r.unit_price || 0
        return `₹${(qty * price).toFixed(2)}`
      }
    },
    {
      title: 'CGST',
      render: (_, r) => {
        const qty = r.quantity_ordered || 0
        const price = r.unit_price || 0
        const taxable = qty * price
        const rate = r.tax_rates?.rate ?? 0
        const tax = taxable * rate / 100
        // intra‑state assumption: 50% CGST
        return `₹${(tax / 2).toFixed(2)}`
      }
    },
    {
      title: 'SGST',
      render: (_, r) => {
        const qty = r.quantity_ordered || 0
        const price = r.unit_price || 0
        const taxable = qty * price
        const rate = r.tax_rates?.rate ?? 0
        const tax = taxable * rate / 100
        return `₹${(tax / 2).toFixed(2)}`
      }
    },
    {
      title: 'Total (incl. tax)',
      render: (_, r) => {
        const qty = r.quantity_ordered || 0
        const price = r.unit_price || 0
        const taxable = qty * price
        const rate = r.tax_rates?.rate ?? 0
        const total = taxable * (1 + rate / 100)
        return `₹${total.toFixed(2)}`
      }
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/inventory/purchase-orders')}
        >
          Back
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadPDF}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Download PDF
        </Button>
        <Popconfirm title="Delete this order?" onConfirm={handleDelete}>
          <Button danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      </Space>

      <Card
        bordered={false}
        style={{ borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}
      >
        <Title level={4} style={{ color: primaryColor }}>
          Purchase Order #{order.po_number}
        </Title>

        <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Vendor">{order.vendor}</Descriptions.Item>
          <Descriptions.Item label="Order Date">
            {dayjs(order.order_date).format('DD/MM/YYYY')}
          </Descriptions.Item>
          <Descriptions.Item label="Expected Date">
            {order.expected_date
              ? dayjs(order.expected_date).format('DD/MM/YYYY')
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag
              color={
                order.status === 'Draft'
                  ? 'default'
                  : order.status === 'Approved'
                  ? 'blue'
                  : order.status === 'Received'
                  ? 'green'
                  : 'red'
              }
            >
              {order.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            ₹{(order.total_amount || 0).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="Notes">
            {order.notes || '-'}
          </Descriptions.Item>
        </Descriptions>

        <Space>
          <span>Change status:</span>
          <Select
            defaultValue={order.status}
            style={{ width: 160 }}
            onChange={handleStatusChange}
            loading={updating}
          >
            <Option value="Draft">Draft</Option>
            <Option value="Approved">Approved</Option>
            <Option value="Received">Received</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
        </Space>
      </Card>

      <Card
        title="Items"
        bordered={false}
        style={{ borderTop: `4px solid ${primaryColor}` }}
      >
        <Table
          dataSource={items}
          columns={itemColumns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 1000 }}   // horizontal scroll for extra columns
        />
      </Card>
    </div>
  )
}

export default PurchaseOrderDetail