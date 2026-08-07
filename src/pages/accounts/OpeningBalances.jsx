// src/pages/accounts/OpeningBalances.jsx
import { useState } from 'react'
import {
  Card, Table, Button, Space, Typography, Modal, Form, InputNumber,
  DatePicker, Select, message, Popconfirm
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  useOpeningBalances,
  useUpsertOpeningBalance,
  useDeleteOpeningBalance
} from '../../hooks/useOpeningBalances'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const OpeningBalances = () => {
  const { org } = useOrganization()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()
  const [postingDate, setPostingDate] = useState(dayjs())   // for the posting button

  const { data: balances, isLoading } = useOpeningBalances()
  const upsertMutation = useUpsertOpeningBalance()
  const deleteMutation = useDeleteOpeningBalance()

  // Mutation to call the posting RPC
  const postMutation = useMutation({
    mutationFn: async (date) => {
      const { error } = await supabase.rpc('post_opening_balances', {
        p_organization_id: org.id,
        p_as_of_date: date,
      })
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Opening balances posted to journal')
      queryClient.invalidateQueries(['opening-balances'])
    },
    onError: (err) => message.error(err.message),
  })

  // Fetch chart of accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['accounts-dropdown', org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('id, account_name, account_code')
        .eq('organization_id', org?.id)
        .eq('is_active', true)
        .order('account_code')
      return data || []
    },
    enabled: !!org?.id,
  })

  const handleSave = async (values) => {
    const payload = {
      id: editing?.id,
      organization_id: org.id,
      account_id: values.account_id,
      as_of_date: values.as_of_date.format('YYYY-MM-DD'),
      debit: values.debit || 0,
      credit: values.credit || 0,
    }
    try {
      await upsertMutation.mutateAsync(payload)
      message.success(editing ? 'Updated' : 'Created')
      setModalOpen(false)
      form.resetFields()
      setEditing(null)
    } catch (err) {
      message.error(err.message)
    }
  }

  const handleEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      account_id: record.account_id,
      as_of_date: dayjs(record.as_of_date),
      debit: record.debit,
      credit: record.credit,
    })
    setModalOpen(true)
  }

  const handleDelete = (id) => {
    deleteMutation.mutate(id, {
      onSuccess: () => message.success('Deleted'),
      onError: (err) => message.error(err.message),
    })
  }

  const handlePost = () => {
    const dateStr = postingDate.format('YYYY-MM-DD')
    // Optional: check if there are any balances for that date
    const hasBalances = balances?.some(b => b.as_of_date === dateStr)
    if (!hasBalances) {
      message.warning(`No opening balances found for ${dateStr}`)
      return
    }
    postMutation.mutate(dateStr)
  }

  const columns = [
    { title: 'Account', render: (_, r) => r.chart_of_accounts?.account_name || '-' },
    { title: 'Date', dataIndex: 'as_of_date' },
    { title: 'Debit (₹)', dataIndex: 'debit' },
    { title: 'Credit (₹)', dataIndex: 'credit' },
    {
      title: 'Actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={<Title level={4} style={{ color: primaryColor }}>Opening Balances</Title>}
        extra={
          <Space>
            <DatePicker value={postingDate} onChange={setPostingDate} format="DD/MM/YYYY" />
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handlePost}
              loading={postMutation.isLoading}
              type="primary"
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Post to Ledger
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true) }}>
              Add
            </Button>
          </Space>
        }
        bordered={false}
        style={{ borderTop: `4px solid ${primaryColor}` }}
      >
        <Table dataSource={balances} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
      </Card>

      <Modal
        title={editing ? 'Edit Opening Balance' : 'New Opening Balance'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={upsertMutation.isLoading}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="account_id" label="Account" rules={[{ required: true }]}>
            <Select placeholder="Select account">
              {accounts?.map(a => <Option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="as_of_date" label="As Of Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="debit" label="Debit (₹)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="credit" label="Credit (₹)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default OpeningBalances