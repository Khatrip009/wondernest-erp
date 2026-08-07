import { useState } from 'react'
import { Table, Card, Button, DatePicker, Space, Typography, Tag, message, Modal, Form, Select, InputNumber } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'  // ✅ added
import { useEmployees } from '../../hooks/useHR'
import dayjs from 'dayjs'

const { Title } = Typography

const Salary = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch } = useScope()
  const { org } = useOrganization()   // ✅ get org
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [month, setMonth] = useState(dayjs())
  const [modal, setModal] = useState(false)
  const [form] = Form.useForm()

  // Fetch salary payments for the selected month and branch
  const start = month.startOf('month').format('YYYY-MM-DD')
  const end = month.endOf('month').format('YYYY-MM-DD')

  const { data: salaries, isLoading, refetch } = useQuery({
    queryKey: ['salary-payments', selectedBranch?.id, start, end],
    queryFn: async () => {
      let query = supabase
        .from('salary_payments')
        .select('*, teachers(first_name, last_name)')
        .order('payment_date', { ascending: false })
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (start && end) {
        query = query.gte('payment_date', start).lte('payment_date', end)
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  const { data: employees } = useEmployees(selectedBranch?.id)

  const handlePay = async (values) => {
    const payload = {
      ...values,
      payment_date: month.format('YYYY-MM-DD'),
      branch_id: selectedBranch?.id,
      financial_year_id: null,
      organization_id: org?.id,   // ✅ required column added
    }
    const { error } = await supabase.from('salary_payments').insert(payload).select().single()
    if (error) {
      message.error(error.message)
    } else {
      message.success('Salary paid')
      setModal(false)
      form.resetFields()
      refetch()
    }
  }

  const columns = [
    {
      title: 'Employee',
      render: (_, r) => r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '-'
    },
    { title: 'Date', dataIndex: 'payment_date' },
    { title: 'Amount', dataIndex: 'amount', render: v => `₹${v}` },
    { title: 'Mode', dataIndex: 'payment_mode' },
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Salary Payments</span>}
        extra={
          <Space>
            <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
            <Button icon={<DollarOutlined />} onClick={() => setModal(true)}>Pay Salary</Button>
          </Space>
        }
      >
        <Table
          dataSource={salaries}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          locale={{ emptyText: 'No salary payments found for the selected month.' }}
        />
      </Card>

      <Modal open={modal} onCancel={() => setModal(false)} onOk={() => form.submit()} title="Pay Salary">
        <Form form={form} layout="vertical" onFinish={handlePay}>
          <Form.Item name="teacher_id" label="Employee" rules={[{ required: true }]}>
            <Select>
              {employees?.map(e => (
                <Select.Option key={e.id} value={e.id}>{e.first_name} {e.last_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_mode" label="Mode" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Cash">Cash</Select.Option>
              <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Salary