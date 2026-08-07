// src/pages/inventory/PurchaseInvoiceForm.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Form, Input, Select, DatePicker, Button, InputNumber,
  Row, Col, Space, Typography, message, Table, Switch
} from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useCreatePurchaseInvoice } from '../../hooks/usePurchaseInvoices'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const PurchaseInvoiceForm = () => {
  const navigate = useNavigate()
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [form] = Form.useForm()
  const createMutation = useCreatePurchaseInvoice()
  const [finalize, setFinalize] = useState(false)

  const [items, setItems] = useState([])

  // Vendors
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

  // Inventory items
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

  // Purchase Orders (headers only – fast, no join errors)
  const { data: purchaseOrders } = useQuery({
    queryKey: ['purchase-orders-headers', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, vendor_id, vendor')
        .eq('organization_id', org.id)
        .in('status', ['Draft', 'Approved', 'Received'])
        .order('order_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  // When a PO is selected, fetch its line items (and auto‑fill vendor)
  const handlePOChange = async (poId) => {
    if (!poId) return
    try {
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .select(`
          vendor_id, vendor,
          purchase_order_items(
            item_id, quantity_ordered, unit_price, tax_rate_id,
            tax_rates(rate),
            inventory_items(item_name, unit_price, hsn_sac_code)
          )
        `)
        .eq('id', poId)
        .single()

      if (error) throw error
      if (!po) {
        message.error('Purchase order not found')
        return
      }

      // Set vendor
      form.setFieldsValue({ vendor_id: po.vendor_id })

      // Map PO items to form items
      const poItems = (po.purchase_order_items || []).map((item, idx) => {
        const inv = item.inventory_items || {}
        const qty = Number(item.quantity_ordered || 1)
        const price = Number(item.unit_price || 0)
        const taxRate = item.tax_rates?.rate ? Number(item.tax_rates.rate) : 0
        const taxable = qty * price
        const tax = taxable * (taxRate / 100)

        return {
          key: Date.now() + idx,
          item_id: item.item_id,
          quantity: qty,
          unit_price: price,
          tax_rate: taxRate,
          tax_rate_id: item.tax_rate_id,
          cgst_amount: tax / 2,
          sgst_amount: tax / 2,
          igst_amount: 0,
          taxable_amount: taxable,
          total_amount: taxable + tax,
          hsn_sac_code: inv.hsn_sac_code || '',
        }
      })

      setItems(poItems)
      message.success(`Loaded ${poItems.length} items from PO ${po.po_number || poId}`)
    } catch (err) {
      message.error('Failed to load PO items: ' + err.message)
    }
  }

  // Add/remove items
  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        item_id: null,
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        tax_rate_id: null,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        taxable_amount: 0,
        total_amount: 0,
      },
    ])
  }

  const removeItem = (key) => {
    setItems(items.filter((item) => item.key !== key))
  }

  // Handle item field changes
  const handleItemChange = (key, field, value) => {
    const updated = items.map((item) => {
      if (item.key !== key) return item
      const newItem = { ...item, [field]: value }

      if (field === 'item_id' && value) {
        const inv = inventoryItems?.find((i) => i.id === value)
        if (inv) {
          newItem.unit_price = inv.unit_price || 0
          newItem.hsn_sac_code = inv.hsn_sac_code || ''
          newItem.tax_rate = inv.tax_rates?.rate || 0
          newItem.tax_rate_id = inv.tax_rate_id
        }
      }

      const qty = newItem.quantity || 0
      const price = newItem.unit_price || 0
      const taxRate = newItem.tax_rate || 0
      const taxable = qty * price
      const tax = taxable * (taxRate / 100)

      newItem.taxable_amount = taxable
      newItem.cgst_amount = tax / 2
      newItem.sgst_amount = tax / 2
      newItem.igst_amount = 0   // intra-state assumption
      newItem.total_amount = taxable + tax
      return newItem
    })
    setItems(updated)
  }

  // Totals
  const grandTotal = items.reduce((sum, item) => sum + (item.total_amount || 0), 0)
  const totalTaxable = items.reduce((sum, item) => sum + (item.taxable_amount || 0), 0)
  const totalCGST = items.reduce((sum, item) => sum + (item.cgst_amount || 0), 0)
  const totalSGST = items.reduce((sum, item) => sum + (item.sgst_amount || 0), 0)
  const totalIGST = items.reduce((sum, item) => sum + (item.igst_amount || 0), 0)
  const totalTax = totalCGST + totalSGST + totalIGST

  const handleSubmit = async (values) => {
    if (items.length === 0) {
      message.warning('Please add at least one item.')
      return
    }

    const header = {
      invoice_number: values.invoice_number || `PINV-${dayjs().format('YYYYMMDD')}-${Date.now()}`,
      vendor_id: values.vendor_id,
      purchase_order_id: values.purchase_order_id || null,
      invoice_date: values.invoice_date.format('YYYY-MM-DD'),
      due_date: values.due_date?.format('YYYY-MM-DD') || null,
      reference: values.reference || '',
      notes: values.notes || '',
      total_taxable_amount: totalTaxable,
      total_gst_amount: totalTax,
      total_cgst: totalCGST,
      total_sgst: totalSGST,
      total_igst: totalIGST,
      total_cess: 0,
      grand_total: grandTotal,
      status: finalize ? 'Final' : 'Draft',
      branch_id: selectedBranch?.id || null,
      financial_year_id: selectedFinancialYear?.id || null,
      organization_id: org.id,
    }

    const itemsPayload = items.map((item) => ({
      item_id: item.item_id,
      description: inventoryItems?.find((i) => i.id === item.item_id)?.item_name || '',
      hsn_sac_code: item.hsn_sac_code || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      taxable_amount: item.taxable_amount,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      cess_amount: 0,
      total_amount: item.total_amount,
      tax_rate_id: item.tax_rate_id || null,
      branch_id: selectedBranch?.id || null,
      financial_year_id: selectedFinancialYear?.id || null,
      organization_id: org.id,
    }))

    try {
      await createMutation.mutateAsync({ header, items: itemsPayload })
      message.success(finalize ? 'Invoice finalized – stock updated & journal entry created' : 'Invoice saved as Draft')
      navigate('/inventory/purchase-invoices')
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
          {inventoryItems?.map((item) => (
            <Option key={item.id} value={item.id}>
              {item.item_name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      render: (val, record) => (
        <InputNumber min={1} value={val} onChange={(v) => handleItemChange(record.key, 'quantity', v)} style={{ width: 80 }} />
      ),
    },
    {
      title: 'Price',
      dataIndex: 'unit_price',
      render: (val, record) => (
        <InputNumber min={0} value={val} onChange={(v) => handleItemChange(record.key, 'unit_price', v)} style={{ width: 100 }} />
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
      title: 'CGST',
      dataIndex: 'cgst_amount',
      render: (val) => `₹${(val || 0).toFixed(2)}`,
    },
    {
      title: 'SGST',
      dataIndex: 'sgst_amount',
      render: (val) => `₹${(val || 0).toFixed(2)}`,
    },
    {
      title: 'IGST',
      dataIndex: 'igst_amount',
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
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeItem(record.key)} />
      ),
    },
  ]

  return (
    <div style={{ padding: 8, maxWidth: 1100, margin: '0 auto' }}>
      <Title level={4} style={{ color: primaryColor }}>
        New Purchase Invoice
      </Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          invoice_date: dayjs(),
          invoice_number: `PINV-${dayjs().format('YYYYMMDD')}-${Date.now()}`,
        }}
      >
        <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="invoice_number" label="Invoice Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="vendor_id" label="Vendor" rules={[{ required: true }]}>
                <Select placeholder="Select vendor" showSearch optionFilterProp="children">
                  {vendors?.map((v) => (
                    <Option key={v.id} value={v.id}>
                      {v.vendor_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invoice_date" label="Invoice Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="purchase_order_id" label="Link to Purchase Order (optional)">
                <Select
                  placeholder="Select PO to auto-fill"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  onChange={handlePOChange}
                >
                  {purchaseOrders?.map((po) => (
                    <Option key={po.id} value={po.id}>
                      {po.po_number} – {po.vendor}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reference" label="Reference">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <span>Finalize invoice (post to accounts & update stock):</span>
              <Switch checked={finalize} onChange={setFinalize} />
            </Space>
          </Form.Item>
        </Card>

        <Card
          title="Items"
          bordered={false}
          style={{ borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}
          extra={
            <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
              Add Item
            </Button>
          }
        >
          <Table
            dataSource={items}
            columns={itemColumns}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ x: 1300 }}
            locale={{ emptyText: 'No items added. Click "Add Item" to start.' }}
          />
          {items.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 12, fontSize: 14 }}>
              <div><strong>Taxable Amount:</strong> ₹{totalTaxable.toFixed(2)}</div>
              <div><strong>CGST:</strong> ₹{totalCGST.toFixed(2)}</div>
              <div><strong>SGST:</strong> ₹{totalSGST.toFixed(2)}</div>
              <div><strong>IGST:</strong> ₹{totalIGST.toFixed(2)}</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8 }}>
                Grand Total: ₹{grandTotal.toFixed(2)}
              </div>
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
            {finalize ? 'Save & Finalize' : 'Save as Draft'}
          </Button>
          <Button onClick={() => navigate('/inventory/purchase-invoices')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  )
}

export default PurchaseInvoiceForm