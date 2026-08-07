// src/pages/inventory/TransferForm.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Form, Select, InputNumber, Button, Row, Col, Space, Typography, message, Input   // ← Input added
} from 'antd'
import { SwapOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'
import { useTheme } from '../../contexts/ThemeContext'

const { Title } = Typography
const { Option } = Select

const TransferForm = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [form] = Form.useForm()

  // Fetch active inventory items for the organisation
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory-items-active', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, unit')
        .eq('organization_id', org.id)
        .eq('is_active', true)
        .order('item_name')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  // Fetch branches for the organisation
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('branches')
        .select('id, branch_name')
        .eq('organization_id', org.id)
        .order('branch_name')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  // Transfer mutation: inserts two transactions
  const transferMutation = useMutation({
    mutationFn: async (values) => {
      const { item_id, quantity, from_branch, to_branch, notes } = values

      // 1. Issue from source branch (stock out)
      const { error: issueErr } = await supabase
        .from('inventory_transactions')
        .insert({
          item_id,
          transaction_type: 'issue',
          quantity,
          unit_price: 0,   // no financial impact for transfer
          reference: `Transfer to branch ${to_branch}`,
          notes: notes || '',
          branch_id: from_branch,
          financial_year_id: selectedFinancialYear?.id || null,
          organization_id: org.id,
        })

      if (issueErr) throw new Error(`Issue failed: ${issueErr.message}`)

      // 2. Receive at destination branch (stock in)
      const { error: receiveErr } = await supabase
        .from('inventory_transactions')
        .insert({
          item_id,
          transaction_type: 'purchase',
          quantity,
          unit_price: 0,
          reference: `Transfer from branch ${from_branch}`,
          notes: notes || '',
          branch_id: to_branch,
          financial_year_id: selectedFinancialYear?.id || null,
          organization_id: org.id,
        })

      if (receiveErr) throw new Error(`Receive failed: ${receiveErr.message}`)
    },
    onSuccess: () => {
      message.success('Transfer completed successfully')
      queryClient.invalidateQueries(['inventory-transactions'])
      queryClient.invalidateQueries(['inventory-branch-stock'])
      navigate('/inventory/transactions')
    },
    onError: (err) => message.error(err.message),
  })

  // Set default source branch to current scope branch
  const defaultSourceBranch = selectedBranch?.id || null

  if (itemsLoading || branchesLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
  }

  return (
    <div style={{ padding: 8, maxWidth: 550, margin: '0 auto' }}>
      <Title level={4} style={{ color: primaryColor }}>
        <SwapOutlined /> Transfer Stock Between Branches
      </Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => transferMutation.mutate(values)}
        initialValues={{ from_branch: defaultSourceBranch }}
      >
        <Card
          bordered={false}
          style={{
            borderTop: `4px solid ${primaryColor}`,
            marginBottom: 16,
          }}
        >
          {/* Item selection */}
          <Form.Item
            name="item_id"
            label="Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select
              showSearch
              placeholder="Search for an item"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {items?.map((item) => (
                <Option key={item.id} value={item.id}>
                  {item.item_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Quantity */}
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true, message: 'Enter quantity' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          {/* Source and Destination Branches */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="from_branch"
                label="From Branch"
                rules={[{ required: true, message: 'Select source branch' }]}
              >
                <Select placeholder="Source">
                  {branches?.map((b) => (
                    <Option key={b.id} value={b.id}>
                      {b.branch_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="to_branch"
                label="To Branch"
                rules={[
                  { required: true, message: 'Select destination branch' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('from_branch') !== value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(
                        new Error('Destination must be different from source')
                      )
                    },
                  }),
                ]}
              >
                <Select placeholder="Destination">
                  {branches?.map((b) => (
                    <Option key={b.id} value={b.id}>
                      {b.branch_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Notes */}
          <Form.Item name="notes" label="Notes">
            <Input placeholder="Optional remarks" />
          </Form.Item>
        </Card>

        {/* Action buttons */}
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SwapOutlined />}
            loading={transferMutation.isLoading}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Transfer Stock
          </Button>
          <Button onClick={() => navigate('/inventory/transactions')}>
            Cancel
          </Button>
        </Space>
      </Form>
    </div>
  )
}

export default TransferForm