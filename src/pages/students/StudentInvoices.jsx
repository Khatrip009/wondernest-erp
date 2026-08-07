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
  const { theme, darkMode } = useTheme()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

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
      <Card style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
        <p style={{ color: textColor, fontFamily: fontBody }}>Failed to load invoices</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Card>
    )
  }

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Invoice No</span>,
      dataIndex: 'invoice_number',
      render: (text) => <Text strong style={{ color: textColor, fontFamily: fontBody }}>{text}</Text>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Date</span>,
      dataIndex: 'invoice_date',
      render: (v) => <span style={{ color: textColor, fontFamily: fontBody }}>{dayjs(v).format('DD-MM-YYYY')}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Total Amount</span>,
      dataIndex: 'grand_total',
      render: (v) => <span style={{ color: textColor, fontFamily: fontBody }}>₹{Number(v).toFixed(2)}</span>,
      align: 'right',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Paid</span>,
      dataIndex: 'paid_amount',
      render: (v) => <span style={{ color: textColor, fontFamily: fontBody }}>₹{Number(v || 0).toFixed(2)}</span>,
      align: 'right',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Balance</span>,
      dataIndex: 'balance_due',
      render: (v) => <span style={{ color: textColor, fontFamily: fontBody }}>₹{Number(v || 0).toFixed(2)}</span>,
      align: 'right',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'Paid' ? 'green' : status === 'Partially Paid' ? 'orange' : 'red'} style={{ fontFamily: fontBody }}>
          {status}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Action</span>,
      key: 'action',
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/invoices/${record.id}`)}
          style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, padding: 16, backgroundColor: darkMode ? '#141414' : '#f5f5f5' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/students/${id}`)}
          style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
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
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
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
            <Text type="secondary" style={{ color: textColor, fontFamily: fontBody }}>No invoices found for this student.</Text>
          </div>
        )}
      </Card>
    </div>
  )
}

export default StudentInvoices