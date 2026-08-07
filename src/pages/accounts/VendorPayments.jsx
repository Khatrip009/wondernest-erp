// src/pages/accounts/VendorPayments.jsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom' 
import {
  Card, Table, Button, Space, Typography, Modal, Form, InputNumber,
  Select, DatePicker, Input, message, Descriptions, Tag
} from 'antd'
import { PlusOutlined, PayCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useVendorPayments, useSettleVendorPayment } from '../../hooks/useVendorPayments'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const VendorPayments = () => {
  const navigate = useNavigate()
   const location = useLocation()
  const { org } = useOrganization()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState(0)

  const { data: payments, isLoading } = useVendorPayments()
  const settleMutation = useSettleVendorPayment()

  // Unpaid invoices with full tax breakdown
  const { data: unpaidInvoices } = useQuery({
    queryKey: ['unpaid-purchase-invoices', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data: invoices, error } = await supabase
        .from('purchase_invoices')
        .select('id, invoice_number, grand_total, paid_amount, vendor_id, total_taxable_amount, total_cgst, total_sgst, total_igst, total_gst_amount')
        .eq('organization_id', org.id)
        .in('status', ['Final', 'Partially Paid'])   // include partially paid
        .order('invoice_date', { ascending: false })

      if (error) throw error
      if (!invoices?.length) return []

      const vendorIds = [...new Set(invoices.map(inv => inv.vendor_id))]
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, vendor_name')
        .in('id', vendorIds)
      const vendorMap = {}
      ;(vendors || []).forEach(v => { vendorMap[v.id] = v.vendor_name })

      return invoices
        .map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          vendor_name: vendorMap[inv.vendor_id] || 'Unknown',
          grand_total: inv.grand_total,
          paid_amount: inv.paid_amount || 0,
          balance_due: (inv.grand_total || 0) - (inv.paid_amount || 0),
          total_taxable_amount: inv.total_taxable_amount || 0,
          total_cgst: inv.total_cgst || 0,
          total_sgst: inv.total_sgst || 0,
          total_igst: inv.total_igst || 0,
          total_gst_amount: inv.total_gst_amount || 0,
        }))
        .filter(inv => inv.balance_due > 0)
    },
    enabled: !!org?.id,
  })

  const onInvoiceChange = (invId) => {
    const inv = unpaidInvoices?.find(i => i.id === invId)
    setSelectedInvoice(inv)
    setPaymentAmount(0)
    form.setFieldsValue({ amount: 0 })
  }

  const handlePayFull = () => {
    if (selectedInvoice) {
      form.setFieldsValue({ amount: selectedInvoice.balance_due })
      setPaymentAmount(selectedInvoice.balance_due)
    }
  }

  // Live tax split calculation
  const computedBase =
    selectedInvoice && paymentAmount && selectedInvoice.grand_total > 0
      ? (paymentAmount * selectedInvoice.total_taxable_amount) / selectedInvoice.grand_total
      : 0
  const computedTax = paymentAmount ? paymentAmount - computedBase : 0
  const computedCGST = selectedInvoice?.total_cgst > 0 ? computedTax / 2 : 0
  const computedSGST = selectedInvoice?.total_sgst > 0 ? computedTax / 2 : 0
  const computedIGST = selectedInvoice?.total_igst > 0 ? computedTax : 0

  const handleSettle = async (values) => {
    try {
      await settleMutation.mutateAsync({
        p_purchase_invoice_id: values.invoice_id,
        p_amount: values.amount,               // ✅ now defined because name="amount"
        p_payment_mode: values.payment_mode,
        p_payment_date: values.payment_date.format('YYYY-MM-DD'),
        p_remarks: values.remarks || '',
      })
      message.success('Payment settled')
      setModalOpen(false)
      form.resetFields()
      setSelectedInvoice(null)
      setPaymentAmount(0)
    } catch (err) {
      message.error(err.message)
    }
  }

  const paymentColumns = [
    {
      title: 'Vendor',
      render: (_, r) => r.vendors?.vendor_name || '-',
    },
    {
      title: 'Invoice',
      render: (_, r) => r.purchase_invoices?.invoice_number || '-',
    },
    {
      title: 'Date',
      dataIndex: 'payment_date',
    },
    {
      title: 'Total Paid',
      dataIndex: 'amount',
      render: (val) => `₹${(Number(val) || 0).toFixed(2)}`,
    },
    {
      title: 'Base Amount',
      dataIndex: 'base_amount',
      render: (val) => `₹${(Number(val) || 0).toFixed(2)}`,
    },
    {
      title: 'Tax Amount',
      dataIndex: 'tax_amount',
      render: (val) => `₹${(Number(val) || 0).toFixed(2)}`,
    },
    {
      title: 'Mode',
      dataIndex: 'payment_mode',
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
    },
  ]

  return (
    <div>
      <Card
        title={<Title level={4} style={{ color: primaryColor }}>Vendor Payments</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Settle Invoice
          </Button>
        }
        bordered={false}
        style={{ borderTop: `4px solid ${primaryColor}` }}
      >
       <Table
    dataSource={payments}
    columns={paymentColumns}
    rowKey="id"
    loading={isLoading}
    pagination={{ pageSize: 10 }}
    onRow={(record) => {
      const basePath = location.pathname.endsWith('/')
        ? location.pathname.slice(0, -1)
        : location.pathname
      return {
        onClick: () => navigate(`${basePath}/${record.id}`),
        style: { cursor: 'pointer' },
      }
    }}
  />
      </Card>

      <Modal
        title="Settle Purchase Invoice – Payment"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          setSelectedInvoice(null)
          setPaymentAmount(0)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={settleMutation.isLoading}
        width={650}
      >
        <Form form={form} layout="vertical" onFinish={handleSettle}>
          <Form.Item name="invoice_id" label="Select Invoice" rules={[{ required: true }]}>
            <Select placeholder="Choose an invoice to settle" onChange={onInvoiceChange} showSearch optionFilterProp="children">
              {unpaidInvoices?.map(inv => (
                <Option key={inv.id} value={inv.id}>
                  {inv.invoice_number} – {inv.vendor_name} (Balance: ₹{inv.balance_due.toFixed(2)})
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedInvoice && (
            <>
              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Invoice Number">{selectedInvoice.invoice_number}</Descriptions.Item>
                <Descriptions.Item label="Vendor">{selectedInvoice.vendor_name}</Descriptions.Item>
                <Descriptions.Item label="Grand Total">₹{selectedInvoice.grand_total.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Paid So Far">₹{selectedInvoice.paid_amount.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Balance Due">
                  <Tag color="volcano">₹{selectedInvoice.balance_due.toFixed(2)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Taxable Amount">₹{selectedInvoice.total_taxable_amount.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="CGST">₹{selectedInvoice.total_cgst.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="SGST">₹{selectedInvoice.total_sgst.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="IGST">₹{selectedInvoice.total_igst.toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Total GST">₹{selectedInvoice.total_gst_amount.toFixed(2)}</Descriptions.Item>
              </Descriptions>

              {/* ✅ name="amount" added here */}
              <Form.Item name="amount" label="Payment Amount (₹)" rules={[{ required: true }]}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <InputNumber
                    min={0}
                    max={selectedInvoice.balance_due}
                    value={paymentAmount}
                    onChange={(val) => setPaymentAmount(val || 0)}
                    style={{ width: '100%' }}
                    placeholder="Enter amount to pay"
                  />
                  <Button
                    icon={<PayCircleOutlined />}
                    onClick={handlePayFull}
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    Pay Full Balance (₹{selectedInvoice.balance_due.toFixed(2)})
                  </Button>
                </Space>
              </Form.Item>

              {paymentAmount > 0 && (
                <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Base (Taxable) component">
                    <Text strong>₹{computedBase.toFixed(2)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax component">
                    <Text strong>₹{computedTax.toFixed(2)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="CGST in this payment">₹{computedCGST.toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="SGST in this payment">₹{computedSGST.toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="IGST in this payment">₹{computedIGST.toFixed(2)}</Descriptions.Item>
                </Descriptions>
              )}
            </>
          )}

          <Form.Item name="payment_mode" label="Payment Mode" initialValue="Cash">
            <Select>
              <Option value="Cash">Cash</Option>
              <Option value="Bank Transfer">Bank Transfer</Option>
              <Option value="UPI">UPI</Option>
              <Option value="Cheque">Cheque</Option>
            </Select>
          </Form.Item>

          <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default VendorPayments