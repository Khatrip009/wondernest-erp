import { useState } from 'react'
import {
  Table, Card, Button, Space, Typography, Modal, Form, Input,
  InputNumber, Select, DatePicker, message, Tag, Row, Col
} from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Title } = Typography

const Expenses = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()
  const orgId = org?.id
  const queryClient = useQueryClient()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // Fetch expenses
  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['expenses', orgId, selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: async () => {
      if (!orgId) return []
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', orgId)
        .order('expense_date', { ascending: false })

      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
  })

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const payload = {
        expense_date: values.expense_date ? values.expense_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        category: values.category,
        amount: values.amount,
        payment_mode: values.payment_mode || 'Cash',
        description: values.description || '',
        bill_number: values.bill_number || null,
        vendor_id: values.vendor_id || null,
        vendor_gstin: values.vendor_gstin || null,
        invoice_number: values.invoice_number || null,
        invoice_date: values.invoice_date ? values.invoice_date.format('YYYY-MM-DD') : null,
        gst_amount: values.gst_amount || 0,
        itc_eligible: values.itc_eligible || false,
        tax_rate_id: values.tax_rate_id || null,
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
        organization_id: orgId,
      }

      const { error } = await supabase.from('expenses').insert(payload).select().single()
      if (error) throw error

      message.success('Expense recorded')
      setModalOpen(false)
      form.resetFields()
      refetch()
    } catch (err) {
      message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: 'Date',
      dataIndex: 'expense_date',
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Category', dataIndex: 'category' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v) => `₹${(v || 0).toFixed(2)}`,
      align: 'right',
    },
    { title: 'Payment Mode', dataIndex: 'payment_mode' },
    { title: 'Description', dataIndex: 'description' },
    {
      title: 'GST',
      dataIndex: 'gst_amount',
      render: (v) => (v > 0 ? `₹${v.toFixed(2)}` : '-'),
      align: 'right',
    },
    {
      title: 'ITC',
      dataIndex: 'itc_eligible',
      render: (v) => v ? <Tag color="green">Eligible</Tag> : <Tag>Not Eligible</Tag>,
    },
  ]

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8, fontFamily: fontBody }}>
      <Card
        variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Expenses</Title>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ fontFamily: fontBody }}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
            >
              Add Expense
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={expenses || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, size: 'small' }}
          size="middle"
          locale={{ emptyText: 'No expenses recorded.' }}
        />
      </Card>

      {/* Add Expense Modal */}
      <Modal
        title="Record New Expense"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            expense_date: dayjs(),
            payment_mode: 'Cash',
            itc_eligible: false,
            gst_amount: 0,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="expense_date"
                label="Date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select category">
                  <Option value="Rent">Rent</Option>
                  <Option value="Utilities">Utilities</Option>
                  <Option value="Salary">Salary</Option>
                  <Option value="Supplies">Supplies</Option>
                  <Option value="Marketing">Marketing</Option>
                  <Option value="Travel">Travel</Option>
                  <Option value="Miscellaneous">Miscellaneous</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount (₹)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_mode" label="Payment Mode">
                <Select>
                  <Option value="Cash">Cash</Option>
                  <Option value="Bank Transfer">Bank Transfer</Option>
                  <Option value="UPI">UPI</Option>
                  <Option value="Cheque">Cheque</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bill_number" label="Bill / Reference No">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="vendor_id" label="Vendor ID (optional)">
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vendor_gstin" label="Vendor GSTIN">
                <Input maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="invoice_number" label="Invoice Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="invoice_date" label="Invoice Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gst_amount" label="GST Amount (₹)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tax_rate_id" label="Tax Rate ID">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="itc_eligible" label="ITC Eligible" valuePropName="checked">
                <Select>
                  <Option value={true}>Yes</Option>
                  <Option value={false}>No</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default Expenses