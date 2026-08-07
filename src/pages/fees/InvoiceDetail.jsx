import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Spin, Typography, Table, Divider, message } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useInvoice } from '../../hooks/useFees'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportInvoicePDF } from '../../utils/exportInvoicePDF'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const InvoiceDetail = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const [loadingPDF, setLoadingPDF] = useState(false)

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const orgId = org?.id
  const branchId = selectedBranch?.id
  const financialYearId = selectedFinancialYear?.id

  // Main invoice data (header, student, payments, receipts)
  const { data: invoice, isLoading: invoiceLoading } = useInvoice(invoiceId, {
    orgId,
    branchId,
    financialYearId,
  })

  // ✅ Directly fetch invoice items to guarantee display
  const { data: invoiceItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['invoice-items-direct', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return []
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', parseInt(invoiceId))
      if (error) throw error
      return data || []
    },
    enabled: !!invoiceId,
  })

  // Use directly fetched items for table and PDF
  const items = invoiceItems || []

  // ─── Handle PDF Export ──────────────────────────────
  const handleDownloadPDF = async () => {
    if (!invoice) {
      message.warning('Invoice data not available')
      return
    }

    setLoadingPDF(true)
    try {
      // Get first payment (most recent) – fee_payments is an array sorted by date
      const firstPayment = invoice.fee_payments?.[0] || {}
      const receipt = invoice.receipts?.[0] || {}

      // ✅ Fix: get GST from gst_details (new table) instead of students.gstin
      const gstDetails = invoice.students?.gst_details
      const studentGstin = Array.isArray(gstDetails) ? gstDetails[0]?.gstin : gstDetails?.gstin || ''

      const pdfData = {
        invoice_number: invoice.invoice_number,
        invoice_date: dayjs(invoice.invoice_date).format('DD/MM/YYYY'),
        due_date: invoice.due_date ? dayjs(invoice.due_date).format('DD/MM/YYYY') : null,
        status: invoice.status,
        student_name: invoice.students?.full_name_formatted || '',
        student_address: invoice.students?.address || '',
        student_city: invoice.students?.city || '',
        student_state: invoice.students?.state || '',
        student_pincode: invoice.students?.pincode || '',
        student_mobile: invoice.students?.mobile || '',
        student_gstin: studentGstin,
        grand_total: invoice.grand_total,
        total_taxable_amount: invoice.total_taxable_amount,
        total_cgst: invoice.total_cgst,
        total_sgst: invoice.total_sgst,
        total_igst: invoice.total_igst,
        items: items.map(item => ({
          description: item.description || '',
          hsn_sac_code: item.hsn_sac_code || '-',
          quantity: Number(item.quantity) || 1,
          taxable_amount: Number(item.taxable_amount) || 0,
          cgst_amount: Number(item.cgst_amount) || 0,
          sgst_amount: Number(item.sgst_amount) || 0,
          igst_amount: Number(item.igst_amount) || 0,
          total_amount: Number(item.total_amount) || 0,
        })),
        // Use payment data
        last_payment_mode: firstPayment.payment_mode || 'N/A',
        receipt_number: receipt.receipt_no || firstPayment.receipt_number || 'N/A',
        last_payment_date: firstPayment.payment_date
          ? dayjs(firstPayment.payment_date).format('DD/MM/YYYY')
          : 'N/A',
        transaction_no: firstPayment.transaction_no || 'N/A',
      }

      exportInvoicePDF(pdfData, org, theme)
      message.success('PDF downloaded successfully')
    } catch (err) {
      console.error(err)
      message.error('Failed to generate PDF')
    } finally {
      setLoadingPDF(false)
    }
  }

  // ─── Loading / Not Found ──────────────────────────────
  if (invoiceLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  if (!invoice) return <Card><p>Invoice not found</p><Button onClick={() => navigate('/fees/invoices')}>Back</Button></Card>

  const columns = [
    { title: 'Item', dataIndex: 'description' },
    { title: 'HSN/SAC', dataIndex: 'hsn_sac_code' },
    { title: 'Qty', dataIndex: 'quantity' },
    { title: 'Rate', dataIndex: 'unit_price', render: (v) => `₹${Number(v).toFixed(2)}` },
    { title: 'Taxable', dataIndex: 'taxable_amount', render: (v) => `₹${Number(v).toFixed(2)}` },
    { title: 'CGST', dataIndex: 'cgst_amount', render: (v) => `₹${Number(v).toFixed(2)}` },
    { title: 'SGST', dataIndex: 'sgst_amount', render: (v) => `₹${Number(v).toFixed(2)}` },
    { title: 'Total', dataIndex: 'total_amount', render: (v) => `₹${Number(v).toFixed(2)}` },
  ]

  return (
    <div style={{ fontFamily: fontBody }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/fees/invoices')}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Back
        </Button>
        <Button
          icon={<DownloadOutlined />}
          type="primary"
          onClick={handleDownloadPDF}
          loading={loadingPDF}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
        >
          Download PDF
        </Button>
        <Button
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Print (Browser)
        </Button>
      </Space>

      <Card
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading }}>
          Invoice #{invoice.invoice_number}
        </Title>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2 }}
          size="small"
          labelStyle={{ fontWeight: 500, color: primaryColor }}
          contentStyle={{ fontFamily: fontBody }}
        >
          <Descriptions.Item label="Student">{invoice.students?.full_name_formatted}</Descriptions.Item>
          <Descriptions.Item label="Admission No">{invoice.students?.admission_no}</Descriptions.Item>
          <Descriptions.Item label="Date">{dayjs(invoice.invoice_date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Due Date">{invoice.due_date ? dayjs(invoice.due_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={invoice.status === 'Paid' ? 'green' : invoice.status === 'Partially Paid' ? 'orange' : 'blue'}>
              {invoice.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Grand Total">₹{Number(invoice.grand_total).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Paid">₹{Number(invoice.paid_amount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Balance">₹{Number(invoice.balance_due).toFixed(2)}</Descriptions.Item>
        </Descriptions>

        <Divider style={{ borderColor: primaryColor }}>Invoice Items</Divider>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          loading={itemsLoading}
          locale={{ emptyText: 'No items found' }}
        />

        <Divider style={{ borderColor: primaryColor }}>Tax Summary</Divider>
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2 }}
          size="small"
          labelStyle={{ fontWeight: 500, color: primaryColor }}
          contentStyle={{ fontFamily: fontBody }}
        >
          <Descriptions.Item label="Taxable Amount">₹{Number(invoice.total_taxable_amount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Total GST">₹{Number(invoice.total_gst_amount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="CGST">₹{Number(invoice.total_cgst).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="SGST">₹{Number(invoice.total_sgst).toFixed(2)}</Descriptions.Item>
          {invoice.total_igst > 0 && (
            <Descriptions.Item label="IGST">₹{Number(invoice.total_igst).toFixed(2)}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  )
}

export default InvoiceDetail