// src/pages/inventory/PurchaseOrderForm.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Form, Input, Select, DatePicker, Button, InputNumber,
  Row, Col, Space, Typography, message, Table
} from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useCreatePurchaseOrder } from '../../hooks/usePurchaseOrders'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const PurchaseOrderForm = () => {
  const navigate = useNavigate()
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [form] = Form.useForm()
  const createMutation = useCreatePurchaseOrder()

  const [items, setItems] = useState([])

  // Fetch vendors (org‑scoped)
  const { data: vendors } = useQuery({
    queryKey: ['vendors', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name')
        .eq('organization_id', org.id)
        .order('vendor_name')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  // Fetch inventory items (org‑scoped, active only)
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items-dropdown', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, unit_price, tax_rate_id, tax_rates(rate), hsn_sac_code')
        .eq('organization_id', org.id)
        .eq('is_active', true)
        .order('item_name')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  // Add a new empty row to the items table
  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        item_id: null,
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        tax_rate_id: null,          // ✅ store the FK reference
        taxable_amount: 0,
        total_amount: 0,
      },
    ])
  }

  // Remove a row
  const removeItem = (key) => {
    setItems(items.filter(item => item.key !== key))
  }

  // When a user changes a field, update the item and recalculate
  const handleItemChange = (key, field, value) => {
    const updated = items.map(item => {
      if (item.key !== key) return item
      const newItem = { ...item, [field]: value }

      // If the item_id was changed, auto‑fill price, tax rate, and tax_rate_id
      if (field === 'item_id' && value) {
        const inv = inventoryItems?.find(i => i.id === value)
        if (inv) {
          newItem.unit_price = inv.unit_price || 0
          newItem.tax_rate = inv.tax_rates?.rate || 0
          newItem.tax_rate_id = inv.tax_rate_id
          newItem.hsn_sac_code = inv.hsn_sac_code || ''
        }
      }

      const qty = newItem.quantity || 0
      const price = newItem.unit_price || 0
      const taxRate = newItem.tax_rate || 0
      newItem.taxable_amount = qty * price
      newItem.total_amount = qty * price * (1 + taxRate / 100)

      return newItem
    })
    setItems(updated)
  }

  // Calculate grand total
  const grandTotal = items.reduce((sum, item) => sum + (item.total_amount || 0), 0)

  const handleSubmit = async (values) => {
    if (items.length === 0) {
      message.warning('Please add at least one item.')
      return
    }

    const header = {
      po_number: values.po_number || `PO-${dayjs().format('YYYYMMDD')}-${Date.now()}`,
      vendor: vendors?.find(v => v.id === values.vendor_id)?.vendor_name || '',
      vendor_id: values.vendor_id,   // store both name and id
      order_date: values.order_date.format('YYYY-MM-DD'),
      expected_date: values.expected_date?.format('YYYY-MM-DD') || null,
      notes: values.notes || '',
      total_amount: grandTotal,
      status: 'Draft',
      branch_id: selectedBranch?.id || null,
      financial_year_id: selectedFinancialYear?.id || null,
      organization_id: org.id,
    }

    const itemsPayload = items.map(item => ({
      item_id: item.item_id,
      quantity_ordered: item.quantity,
      unit_price: item.unit_price,
      tax_rate_id: item.tax_rate_id || null,   // ✅ now includes tax_rate_id
      branch_id: selectedBranch?.id || null,
      financial_year_id: selectedFinancialYear?.id || null,
      organization_id: org.id,
    }))

    try {
      await createMutation.mutateAsync({ header, items: itemsPayload })
      message.success('Purchase order created')
      navigate('/inventory/purchase-orders')
    } catch (err) {
      message.error(err.message)
    }
  }

  const itemColumns = [
    {
      title: 'Item',
      dataIndex: 'item_id',
      render: (val, record) => (
        <Select
          value={val}
          showSearch
          placeholder="Select item"
          style={{ width: 200 }}
          onChange={(v) => handleItemChange(record.key, 'item_id', v)}
          filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
        >
          {inventoryItems?.map(item => (
            <Option key={item.id} value={item.id}>{item.item_name}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      render: (val, record) => (
        <InputNumber
          min={1}
          value={val}
          onChange={(v) => handleItemChange(record.key, 'quantity', v)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      render: (val, record) => (
        <InputNumber
          min={0}
          value={val}
          onChange={(v) => handleItemChange(record.key, 'unit_price', v)}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: 'Tax %',
      dataIndex: 'tax_rate',
      render: (val, record) => (
        <InputNumber
          min={0}
          max={28}
          value={val}
          onChange={(v) => handleItemChange(record.key, 'tax_rate', v)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: 'Taxable',
      dataIndex: 'taxable_amount',
      render: (val) => `₹${(val || 0).toFixed(2)}`,
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      render: (val) => `₹${(val || 0).toFixed(2)}`,
    },
    {
      title: '',
      render: (_, record) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: 8, maxWidth: 900, margin: '0 auto' }}>
      <Title level={4} style={{ color: primaryColor }}>New Purchase Order</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          order_date: dayjs(),
          po_number: `PO-${dayjs().format('YYYYMMDD')}-${Date.now()}`,
        }}
      >
        <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="po_number" label="PO Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="vendor_id" label="Vendor" rules={[{ required: true }]}>
                <Select placeholder="Select vendor" showSearch optionFilterProp="children">
                  {vendors?.map(v => <Option key={v.id} value={v.id}>{v.vendor_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="order_date" label="Order Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expected_date" label="Expected Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status" initialValue="Draft">
                <Select disabled>
                  <Option value="Draft">Draft</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>

        <Card
          title="Items"
          bordered={false}
          style={{ borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}
          extra={<Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>}
        >
          <Table
            dataSource={items}
            columns={itemColumns}
            rowKey="key"
            pagination={false}
            size="small"
            locale={{ emptyText: 'No items added. Click "Add Item" to start.' }}
          />
          {items.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>
              Grand Total: ₹{grandTotal.toFixed(2)}
            </div>
          )}
        </Card>

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={createMutation.isLoading}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Save Purchase Order
          </Button>
          <Button onClick={() => navigate('/inventory/purchase-orders')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  )
}

export default PurchaseOrderForm