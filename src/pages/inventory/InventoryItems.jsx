// src/pages/inventory/InventoryItems.jsx
import { useState } from 'react'
import { Table, Card, Button, Space, Typography, Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useInventoryItems, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from '../../hooks/useInventory'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'

const { Title } = Typography
const { Option } = Select

const InventoryItems = () => {
  const { org } = useOrganization()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const { data: items, isLoading } = useInventoryItems()
  const createMut = useCreateInventoryItem()
  const updateMut = useUpdateInventoryItem()
  const deleteMut = useDeleteInventoryItem()

  const { data: taxRates } = useQuery({
    queryKey: ['tax-rates-dropdown', org?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tax_rates').select('id, name, rate').eq('is_active', true).eq('organization_id', org?.id)
      return data || []
    },
    enabled: !!org?.id,
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-dropdown', org?.id],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, name').eq('organization_id', org?.id).eq('status', true)
      return data || []
    },
    enabled: !!org?.id,
  })

  const handleSave = async (values) => {
    const payload = {
      ...values,
      organization_id: org.id,
    }
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...payload })
      message.success('Updated')
    } else {
      await createMut.mutateAsync(payload)
      message.success('Created')
    }
    setModalOpen(false)
    form.resetFields()
    setEditing(null)
  }

  const columns = [
    { title: 'Name', dataIndex: 'item_name' },
    { title: 'Type', dataIndex: 'item_type', render: t => t === 'service' ? 'Service' : 'Product' },
    { title: 'Price', dataIndex: 'unit_price', render: v => `₹${(v || 0).toFixed(2)}` },
    { title: 'Stock', dataIndex: 'current_stock' },
    { title: 'Tax Rate', render: (_, r) => taxRates?.find(t => t.id === r.tax_rate_id)?.name || '-' },
    { title: 'Active', dataIndex: 'is_active', render: v => v ? 'Yes' : 'No' },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true) }} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMut.mutate(record.id)} />
        </Space>
      ),
    },
  ]

  return (
    <Card title={<Title level={4} style={{ color: primaryColor }}>Inventory Items</Title>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true) }}>Add Item</Button>}
      bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Table dataSource={items} columns={columns} rowKey="id" loading={isLoading} />

      <Modal title={editing ? 'Edit Item' : 'New Item'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}
        confirmLoading={createMut.isLoading || updateMut.isLoading}>
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ item_type: 'product', is_active: true, unit: 'pcs' }}>
          <Form.Item name="item_name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="item_type" label="Type"><Select><Option value="product">Product</Option><Option value="service">Service</Option></Select></Form.Item>
          <Form.Item name="unit" label="Unit"><Input /></Form.Item>
          <Form.Item name="unit_price" label="Unit Price (₹)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="current_stock" label="Initial Stock"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reorder_level" label="Reorder Level"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="hsn_sac_code" label="HSN/SAC"><Input /></Form.Item>
          <Form.Item name="tax_rate_id" label="Tax Rate">
            <Select allowClear>{taxRates?.map(t => <Option key={t.id} value={t.id}>{t.name} ({t.rate}%)</Option>)}</Select>
          </Form.Item>
          <Form.Item name="course_id" label="Course (for services)"><Select allowClear>{courses?.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}</Select></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default InventoryItems