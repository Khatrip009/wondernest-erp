import { Table, Card, Button, Space, Typography, Tag, message, Modal, Form, Input, Select, DatePicker, InputNumber, Divider } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { usePurchaseOrders, useDeletePurchaseOrder } from '../../hooks/usePurchaseOrders'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const PurchaseOrderList = () => {
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const navigate = useNavigate()
  const { org } = useOrganization()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const { data: orders, isLoading } = usePurchaseOrders()
  const deleteMut = useDeletePurchaseOrder()

  const columns = [
    { title: 'PO Number', dataIndex: 'po_number' },
    { title: 'Vendor', dataIndex: 'vendor' },
    { title: 'Order Date', dataIndex: 'order_date', render: d => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Expected', dataIndex: 'expected_date', render: d => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    { title: 'Total', dataIndex: 'total_amount', render: v => `₹${(v || 0).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'Draft' ? 'default' : s === 'Approved' ? 'blue' : s === 'Received' ? 'green' : 'red'}>{s}</Tag> },
    {
      title: 'Actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/inventory/purchase-orders/${r.id}`)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMut.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  return (
    <Card title={<Title level={4} style={{ color: primaryColor }}>Purchase Orders</Title>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/purchase-orders/new')}>New Order</Button>}
      bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Table dataSource={orders} columns={columns} rowKey="id" loading={isLoading} />
    </Card>
  )
}

export default PurchaseOrderList