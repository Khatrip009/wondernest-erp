// src/pages/accounts/VendorPaymentDetail.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, Spin, Typography, Table } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title } = Typography

const VendorPaymentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: payment, isLoading } = useQuery({
    queryKey: ['vendor-payment', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('vendor_payments')
        .select(`
          *,
          vendors(vendor_name, gstin, contact_person),
          purchase_invoices(invoice_number, invoice_date, grand_total, total_taxable_amount, total_cgst, total_sgst, total_igst),
          journal_entries(
            id,
            entry_date,
            journal_entry_lines(account_id, debit, credit, description, chart_of_accounts(account_name, account_code))
          )
        `)
        .eq('id', Number(id))
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!payment) return <Card>Payment not found</Card>

  const vendor = payment.vendors || {}
  const invoice = payment.purchase_invoices || {}

  // Ensure journal_entries is always an array (Supabase may return a single object)
  const rawJournals = payment.journal_entries
  const journalEntries = rawJournals
    ? (Array.isArray(rawJournals) ? rawJournals : [rawJournals])
    : []

  // Flatten journal entry lines
  const journalLines = journalEntries.flatMap(je =>
    (je.journal_entry_lines || []).map((line, idx) => ({
      key: `${je.id}-${idx}`,
      account: `${line.chart_of_accounts?.account_code || '?'} – ${line.chart_of_accounts?.account_name || 'Unknown'}`,
      debit: line.debit,
      credit: line.credit,
      description: line.description,
      entryDate: je.entry_date,
    }))
  )

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}>
        <Title level={4} style={{ color: primaryColor }}>Vendor Payment Detail</Title>

        <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Payment ID">{payment.id}</Descriptions.Item>
          <Descriptions.Item label="Vendor">{vendor.vendor_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Invoice">{invoice.invoice_number || '-'}</Descriptions.Item>
          <Descriptions.Item label="Payment Date">{dayjs(payment.payment_date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Total Paid">₹{(payment.amount || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Payment Mode">{payment.payment_mode || '-'}</Descriptions.Item>
          <Descriptions.Item label="Base Amount (Taxable)">₹{(payment.base_amount || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Tax Amount">₹{(payment.tax_amount || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Reference">{payment.reference || '-'}</Descriptions.Item>
          <Descriptions.Item label="Remarks">{payment.remarks || '-'}</Descriptions.Item>
          <Descriptions.Item label="Invoice Date">
            {invoice.invoice_date ? dayjs(invoice.invoice_date).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Invoice Grand Total">₹{(invoice.grand_total || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Taxable Amount (Invoice)">₹{(invoice.total_taxable_amount || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="CGST (Invoice)">₹{(invoice.total_cgst || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="SGST (Invoice)">₹{(invoice.total_sgst || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="IGST (Invoice)">₹{(invoice.total_igst || 0).toFixed(2)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Journal Entries" bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        {journalLines.length > 0 ? (
          <Table
            dataSource={journalLines}
            columns={[
              { title: 'Account', dataIndex: 'account' },
              { title: 'Debit (₹)', dataIndex: 'debit', render: (v) => Number(v).toFixed(2) },
              { title: 'Credit (₹)', dataIndex: 'credit', render: (v) => Number(v).toFixed(2) },
              { title: 'Description', dataIndex: 'description' },
              { title: 'Entry Date', dataIndex: 'entryDate', render: (v) => dayjs(v).format('DD/MM/YYYY') },
            ]}
            rowKey="key"
            pagination={false}
            size="small"
          />
        ) : (
          <div>No journal entries yet.</div>
        )}
      </Card>
    </div>
  )
}

export default VendorPaymentDetail