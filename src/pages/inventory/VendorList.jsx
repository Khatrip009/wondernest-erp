// src/pages/inventory/VendorList.jsx
import { useState } from 'react'
import { Table, Card, Button, Space, Typography, Tag, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'

const { Title } = Typography

const VendorList = () => {
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const navigate = useNavigate()
  const { org } = useOrganization()
  const queryClient = useQueryClient()

  // Fetch vendors for the current organisation
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendor-list', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', org.id)
        .order('vendor_name')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Vendor deleted')
      queryClient.invalidateQueries(['vendor-list'])
    },
    onError: (err) => message.error(err.message),
  })

  const columns = [
    { title: 'Vendor Name', dataIndex: 'vendor_name' },
    { title: 'GSTIN', dataIndex: 'gstin', render: v => v || '-' },
    { title: 'Phone', dataIndex: 'phone', render: v => v || '-' },
    { title: 'Contact Person', dataIndex: 'contact_person', render: v => v || '-' },
    { title: 'Email', dataIndex: 'email', render: v => v || '-' },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/inventory/vendors/${record.id}/edit`)}>Edit</Button>
          <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={<Title level={4} style={{ color: primaryColor }}>Vendors</Title>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/vendors/new')}>Add Vendor</Button>}
      bordered={false}
      style={{ borderTop: `4px solid ${primaryColor}` }}
    >
      <Table dataSource={vendors} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
    </Card>
  )
}

export default VendorList