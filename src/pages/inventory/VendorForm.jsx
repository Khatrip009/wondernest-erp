// src/pages/inventory/VendorForm.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Card, Form, Input, Button, Row, Col, Space, Typography, message, Spin
} from 'antd'
import { SaveOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'

const { Title } = Typography

// ---------- Mock GST lookup ----------
// Replace this function with a real API call when ready.
// It should return an object with vendor details based on GSTIN.
const fetchGSTDetails = async (gstin) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock response – you can map the fields as needed
  return {
    legal_name: 'MOCK SUPPLIER PVT LTD',
    trade_name: 'Mock Supplier',
    address: '123, Industrial Area, Mumbai, Maharashtra 400001',
    state_code: '27',
    contact_person: 'Mr. Supplier',
    phone: '9876543210',
    email: 'supplier@mock.com',
  }
}

const VendorForm = () => {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { org } = useOrganization()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [looking, setLooking] = useState(false)

  // Fetch vendor for editing
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').eq('id', Number(id)).single()
      if (error) throw error
      return data
    },
    enabled: isEdit,
  })

  useEffect(() => {
    if (vendor) form.setFieldsValue(vendor)
  }, [vendor, form])

  const upsertMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        ...values,
        organization_id: org.id,
        branch_id: null,
        financial_year_id: null,
      }
      if (isEdit) {
        const { error } = await supabase.from('vendors').update(payload).eq('id', Number(id))
        if (error) throw error
      } else {
        const { error } = await supabase.from('vendors').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      message.success(isEdit ? 'Vendor updated' : 'Vendor created')
      queryClient.invalidateQueries(['vendor-list'])
      navigate('/inventory/vendors')
    },
    onError: (err) => message.error(err.message),
  })

  // GST Lookup handler
  const handleGSTLookup = async () => {
    const gstin = form.getFieldValue('gstin')
    if (!gstin || gstin.length !== 15) {
      message.warning('Please enter a valid 15-digit GSTIN')
      return
    }
    setLooking(true)
    try {
      const details = await fetchGSTDetails(gstin)
      // Auto-fill form fields (only if they are empty to avoid overwriting manually entered data)
      const currentValues = form.getFieldsValue()
      const fieldsToUpdate = {}
      if (details.legal_name && !currentValues.vendor_name) fieldsToUpdate.vendor_name = details.legal_name
      if (details.trade_name && !currentValues.trade_name) fieldsToUpdate.trade_name = details.trade_name
      if (details.address && !currentValues.address) fieldsToUpdate.address = details.address
      if (details.state_code && !currentValues.state_code) fieldsToUpdate.state_code = details.state_code
      if (details.contact_person && !currentValues.contact_person) fieldsToUpdate.contact_person = details.contact_person
      if (details.phone && !currentValues.phone) fieldsToUpdate.phone = details.phone
      if (details.email && !currentValues.email) fieldsToUpdate.email = details.email

      if (Object.keys(fieldsToUpdate).length > 0) {
        form.setFieldsValue(fieldsToUpdate)
        message.success('GST details auto-filled')
      } else {
        message.info('All fields already filled')
      }
    } catch (err) {
      message.error('Failed to fetch GST details')
    } finally {
      setLooking(false)
    }
  }

  if (isEdit && vendorLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>

  return (
    <Card
      title={<Title level={4} style={{ color: primaryColor }}>{isEdit ? 'Edit Vendor' : 'New Vendor'}</Title>}
      bordered={false}
      style={{ borderTop: `4px solid ${primaryColor}`, maxWidth: 800, margin: '0 auto' }}
    >
      <Form form={form} layout="vertical" onFinish={(values) => upsertMutation.mutate(values)}>
        <Row gutter={16} align="bottom">
          <Col span={16}>
            <Form.Item name="gstin" label="GSTIN" rules={[{ len: 15, message: 'GSTIN must be 15 digits' }]}>
              <Input maxLength={15} placeholder="Enter 15-digit GSTIN" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Button
              icon={<SearchOutlined />}
              loading={looking}
              onClick={handleGSTLookup}
              style={{ marginBottom: 24, width: '100%', borderColor: primaryColor, color: primaryColor }}
            >
              Lookup GST
            </Button>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="vendor_name" label="Vendor Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="pan" label="PAN">
              <Input maxLength={10} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="state_code" label="State Code">
              <Input maxLength={2} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="trade_name" label="Trade Name">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="address" label="Address">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="contact_person" label="Contact Person">
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="bank_name" label="Bank Name">
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="account_number" label="Account Number">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ifsc_code" label="IFSC Code">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={upsertMutation.isLoading}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
          <Button onClick={() => navigate('/inventory/vendors')}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  )
}

export default VendorForm