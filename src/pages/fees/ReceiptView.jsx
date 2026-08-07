import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Button, Space, Spin, Typography, Descriptions, Tag, Divider, Row, Col, message, Alert } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons'
import { useReceipt } from '../../hooks/useFees'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportReceiptPDF, numberToWords } from '../../utils/exportReceiptPDF'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const ReceiptView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const [loadingPDF, setLoadingPDF] = useState(false)

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  const orgId = org?.id
  const branchId = selectedBranch?.id
  const financialYearId = selectedFinancialYear?.id

  const { data: receipt, isLoading, error } = useReceipt(
    parseInt(id),
    {
      orgId,
      branchId,
      financialYearId,
    }
  )

  // ─── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  }

  // ─── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <Card>
        <Alert message="Error loading receipt" description={error.message} type="error" showIcon />
        <Button onClick={() => navigate(-1)} style={{ marginTop: 16 }}>Back</Button>
      </Card>
    )
  }

  // ─── Not Found ────────────────────────────────────────────
  if (!receipt) {
    return (
      <Card>
        <p>Receipt not found</p>
        <Button onClick={() => navigate(-1)}>Back</Button>
      </Card>
    )
  }

  // ─── PDF Export ───────────────────────────────────────────
  const handleDownloadPDF = () => {
    setLoadingPDF(true)
    try {
      // Build the data object for PDF export
      const pdfReceipt = {
        receipt_no: receipt.receipt_no,
        receipt_date: receipt.receipt_date,
        invoice_number: receipt.invoices?.invoice_number || 'N/A',
        student_name: receipt.students?.full_name_formatted || '',
        student_address: receipt.students?.address || '',
        student_city: receipt.students?.city || '',
        student_state: receipt.students?.state || '',
        student_pincode: receipt.students?.pincode || '',
        student_mobile: receipt.students?.mobile || '',
        amount: receipt.amount,
        payment_mode: receipt.fee_payments?.payment_mode || 'N/A',
        transaction_no: receipt.fee_payments?.transaction_no || 'N/A',
        // If invoice exists, use its items; otherwise empty array
        items: receipt.invoices?.invoice_items || receipt.invoices?.items || [],
        invoices: receipt.invoices,
      }

      exportReceiptPDF(pdfReceipt, org, theme)
      message.success('PDF downloaded')
    } catch (err) {
      console.error(err)
      message.error('PDF generation failed: ' + err.message)
    } finally {
      setLoadingPDF(false)
    }
  }

  // ─── Print ─────────────────────────────────────────────────
  const handlePrint = async () => {
    try {
      const pdfReceipt = {
        receipt_no: receipt.receipt_no,
        receipt_date: receipt.receipt_date,
        invoice_number: receipt.invoices?.invoice_number || 'N/A',
        student_name: receipt.students?.full_name_formatted || '',
        student_address: receipt.students?.address || '',
        student_mobile: receipt.students?.mobile || '',
        amount: receipt.amount,
        payment_mode: receipt.fee_payments?.payment_mode || 'N/A',
        transaction_no: receipt.fee_payments?.transaction_no || 'N/A',
        items: receipt.invoices?.invoice_items || receipt.invoices?.items || [],
        invoices: receipt.invoices,
      }
      const blob = exportReceiptPDF(pdfReceipt, org, theme, { returnBlob: true })
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => printWindow.print()
      } else {
        message.warning('Please allow pop-ups to print')
      }
    } catch (err) {
      console.error(err)
      message.error('Failed to print: ' + err.message)
    }
  }

  return (
    <div style={{ fontFamily: fontBody, padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPDF} loading={loadingPDF}>
          Download PDF
        </Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
      </Space>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}` }}>
        <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading }}>Payment Receipt</Title>
        <Divider />

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text strong>Receipt No:</Text> <Text>{receipt.receipt_no}</Text><br />
            <Text strong>Date:</Text> <Text>{dayjs(receipt.receipt_date).format('DD/MM/YYYY')}</Text><br />
            <Text strong>Invoice Reference:</Text> <Text>{receipt.invoices?.invoice_number || 'N/A'}</Text>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Text strong>Amount:</Text> <Text style={{ fontSize: 18, color: primaryColor }}>₹{Number(receipt.amount).toFixed(2)}</Text>
          </Col>
        </Row>

        <Divider />

        <Descriptions bordered column={1} size="small" labelStyle={{ fontWeight: 500 }}>
          <Descriptions.Item label="Student">{receipt.students?.full_name_formatted}</Descriptions.Item>
          <Descriptions.Item label="Address">{receipt.students?.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{receipt.students?.mobile || '-'}</Descriptions.Item>
          <Descriptions.Item label="Payment Mode">{receipt.fee_payments?.payment_mode || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Transaction No">{receipt.fee_payments?.transaction_no || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Amount in Words">
            <Text italic>{numberToWords(receipt.amount)}</Text>
          </Descriptions.Item>
        </Descriptions>

        <Divider />
        <Row justify="end">
          <Col>
            <Text strong>Authorised Signatory</Text><br />
            <Text>____________________</Text>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default ReceiptView