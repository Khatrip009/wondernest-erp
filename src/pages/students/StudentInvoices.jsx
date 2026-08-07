import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, Button, Space, Tag, Typography, Spin, message } from 'antd'
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const StudentInvoices = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  // Fetch all invoices for this student
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['student-invoices', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, grand_total, status, paid_amount, balance_due, student_fee_id')
        .eq('student_id', id)
        .order('invoice_date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <p>Failed to load invoices</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Card>
    )
  }

  const columns = [
    {
      title: 'Invoice No',
      dataIndex: 'invoice_number',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'invoice_date',
      render: (v) => dayjs(v).format('DD-MM-YYYY'),
    },
    {
      title: 'Total Amount',
      dataIndex: 'grand_total',
      render: (v) => `₹${Number(v).toFixed(2)}`,
      align: 'right',
    },
    {
      title: 'Paid',
      dataIndex: 'paid_amount',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
    },
    {
      title: 'Balance',
      dataIndex: 'balance_due',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'Paid' ? 'green' : status === 'Partially Paid' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/invoices/${record.id}`)}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/students/${id}`)}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Back to Student
        </Button>
      </Space>

      <Card
        title={
          <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
            Invoices
          </Title>
        }
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        {invoices && invoices.length > 0 ? (
          <Table
            dataSource={invoices}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Text type="secondary">No invoices found for this student.</Text>
          </div>
        )}
      </Card>
    </div>
  )
}

export default StudentInvoices