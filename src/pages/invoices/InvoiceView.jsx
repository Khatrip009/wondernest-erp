import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Spin, Typography, Table, Divider, message } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportInvoicePDF } from '../../utils/exportInvoicePDF'
import dayjs from 'dayjs'

const { Title } = Typography

const InvoiceView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const [loadingPDF, setLoadingPDF] = useState(false)

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  // Main data fetch – always use direct table queries for reliability
  const { data: invoiceData, isLoading, error } = useQuery({
    queryKey: ['invoice-full', id],
    queryFn: async () => {
      if (!id) return null

      // 1. Fetch invoice header
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', parseInt(id))
        .single()
      if (invErr) throw invErr

      // 2. Fetch invoice items
      const { data: items, error: itemsErr } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', parseInt(id))
        .order('id')
      if (itemsErr) throw itemsErr

      // 3. Fetch last payment (for receipt/mode)
      const { data: payment } = await supabase
        .from('fee_payments')
        .select('payment_mode, receipt_number, payment_date, transaction_no')
        .eq('invoice_id', parseInt(id))
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 4. Fetch student details (no removed gstin)
      let student = null
      if (inv.student_id) {
        const { data: stu, error: stuErr } = await supabase
          .from('students')
          .select('full_name_formatted, admission_no, mobile, email, address, city, state, pincode, gst_details_id')
          .eq('id', inv.student_id)
          .single()
        if (!stuErr && stu) {
          student = stu
          // Fetch GST from gst_details if available
          if (stu.gst_details_id) {
            const { data: gstData } = await supabase
              .from('gst_details')
              .select('gstin')
              .eq('id', stu.gst_details_id)
              .maybeSingle()
            student.gstin = gstData?.gstin || null
          } else {
            student.gstin = null
          }
        }
      }

      // Build a complete invoice object
      const enrichedInvoice = {
        ...inv,
        items: items || [], // array of invoice_items rows
        student_name: student?.full_name_formatted || null,
        student_address: student?.address || null,
        student_city: student?.city || null,
        student_state: student?.state || null,
        student_pincode: student?.pincode || null,
        student_mobile: student?.mobile || null,
        student_email: student?.email || null,
        student_gstin: student?.gstin || null,
        payment_mode: payment?.payment_mode || null,
        receipt_number: payment?.receipt_number || null,
        receipt_date: payment?.payment_date || null,
        transaction_no: payment?.transaction_no || null,
      }

      return enrichedInvoice
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
        <p>Failed to load invoice: {error.message}</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Go Back</Button>
      </Card>
    )
  }

  if (!invoiceData) {
    return (
      <Card>
        <p>Invoice not found</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Go Back</Button>
      </Card>
    )
  }

  // Items are already an array of objects with fields:
  // description, hsn_sac_code, quantity, unit_price, taxable_amount,
  // cgst_amount, sgst_amount, igst_amount, total_amount
  const items = invoiceData.items || []

  // Compute totals (fallback to stored values)
  const totalTaxable = items.reduce((sum, i) => sum + (Number(i.taxable_amount) || 0), 0)
  const totalCGST = items.reduce((sum, i) => sum + (Number(i.cgst_amount) || 0), 0)
  const totalSGST = items.reduce((sum, i) => sum + (Number(i.sgst_amount) || 0), 0)
  const totalIGST = items.reduce((sum, i) => sum + (Number(i.igst_amount) || 0), 0)
  const totalTax = totalCGST + totalSGST + totalIGST
  const grandTotal = Number(invoiceData.grand_total) || totalTaxable + totalTax

  const paymentMode = invoiceData.payment_mode || 'N/A'
  const receiptNo = invoiceData.receipt_number || 'N/A'
  const receiptDate = invoiceData.receipt_date ? dayjs(invoiceData.receipt_date).format('DD/MM/YYYY') : 'N/A'
  const refNo = invoiceData.transaction_no || 'N/A'

  // Table columns
  const columns = [
    {
      title: 'Sr',
      render: (_, __, idx) => idx + 1,
      width: 50,
      align: 'center',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'HSN',
      dataIndex: 'hsn_sac_code',
      key: 'hsn_sac_code',
      render: (v) => v || '-',
      width: 80,
      align: 'center',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v) => Number(v || 0).toFixed(0),
      align: 'center',
      width: 60,
    },
    {
      title: 'Rate',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
      width: 100,
    },
    {
      title: 'Taxable',
      dataIndex: 'taxable_amount',
      key: 'taxable_amount',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
      width: 110,
    },
    {
      title: 'CGST',
      dataIndex: 'cgst_amount',
      key: 'cgst_amount',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
      width: 80,
    },
    {
      title: 'SGST',
      dataIndex: 'sgst_amount',
      key: 'sgst_amount',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
      width: 80,
    },
    {
      title: 'IGST',
      dataIndex: 'igst_amount',
      key: 'igst_amount',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
      width: 80,
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (v) => `₹${Number(v || 0).toFixed(2)}`,
      align: 'right',
      width: 120,
    },
  ]

  const handleDownloadPDF = () => {
    setLoadingPDF(true)
    try {
      const pdfInvoice = {
        ...invoiceData,
        items: items,
        total_taxable_amount: totalTaxable,
        total_cgst: totalCGST,
        total_sgst: totalSGST,
        total_igst: totalIGST,
        grand_total: grandTotal,
        payment_mode: paymentMode,
        receipt_number: receiptNo,
        receipt_date: receiptDate,
        transaction_no: refNo,
      }
      exportInvoicePDF(pdfInvoice, org, theme)
      message.success('PDF downloaded')
    } catch (err) {
      console.error(err)
      message.error('PDF generation failed')
    } finally {
      setLoadingPDF(false)
    }
  }

  const handlePrint = async () => {
    try {
      const pdfInvoice = {
        ...invoiceData,
        items: items,
        total_taxable_amount: totalTaxable,
        total_cgst: totalCGST,
        total_sgst: totalSGST,
        total_igst: totalIGST,
        grand_total: grandTotal,
        payment_mode: paymentMode,
        receipt_number: receiptNo,
        receipt_date: receiptDate,
        transaction_no: refNo,
      }
      const blob = exportInvoicePDF(pdfInvoice, org, theme, { returnBlob: true })
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => printWindow.print()
      } else {
        message.warning('Please allow pop-ups to print the invoice')
      }
    } catch (err) {
      console.error(err)
      message.error('Failed to generate PDF for printing')
    }
  }

  return (
    <div style={{ fontFamily: fontBody, padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPDF} loading={loadingPDF}>Download PDF</Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
      </Space>

      <div className="invoice-print" style={{ background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ border: '1px solid #000', padding: '8px 12px', display: 'flex', background: 'white' }}>
          <div style={{ flex: '0 0 65%', paddingRight: 8 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12 }}>{org?.company_name || 'Organization'}</div>
            {org?.address && <div style={{ fontSize: 10 }}>{org.address}</div>}
            <div style={{ fontSize: 10 }}>
              {org?.phone && <span>Phone: {org.phone} &nbsp;|&nbsp;</span>}
              {org?.email && <span>Email: {org.email}</span>}
            </div>
            {org?.gstin && <div style={{ fontSize: 10 }}>GSTIN: {org.gstin}</div>}
          </div>
          <div style={{ flex: '1', textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>TAX INVOICE</div>
            <div style={{ fontSize: 10, color: '#888' }}>Original / Duplicate Bill</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>
              <div><strong>Invoice No:</strong> {invoiceData.invoice_number}</div>
              <div><strong>Date:</strong> {dayjs(invoiceData.invoice_date).format('DD-MM-YYYY')}</div>
              {invoiceData.due_date && <div><strong>Due Date:</strong> {dayjs(invoiceData.due_date).format('DD-MM-YYYY')}</div>}
              <div><strong>Status:</strong> {invoiceData.status}</div>
              <div><strong>Payment Mode:</strong> {paymentMode}</div>
            </div>
          </div>
        </div>

        {/* Bill To / Payment */}
        <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 12px', display: 'flex', background: 'white' }}>
          <div style={{ flex: '0 0 65%', paddingRight: 8 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ flex: '0 0 50%' }}>
                <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Bill To</div>
                <div style={{ fontSize: 10 }}>Name: {invoiceData.student_name || '-'}</div>
                <div style={{ fontSize: 10 }}>Address: {invoiceData.student_address || '-'}</div>
                <div style={{ fontSize: 10 }}>{invoiceData.student_city} {invoiceData.student_state} - {invoiceData.student_pincode}</div>
                <div style={{ fontSize: 10 }}>Mobile: {invoiceData.student_mobile || '-'}</div>
                <div style={{ fontSize: 10 }}>GSTIN: {invoiceData.student_gstin || '-'}</div>
              </div>
             
            </div>
          </div>
          <div style={{ flex: '1', textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Payment Details</div>
            <div style={{ fontSize: 10 }}>Reference No: {refNo}</div>
            <div style={{ fontSize: 10 }}>Receipt No: {receiptNo}</div>
            <div style={{ fontSize: 10 }}>Receipt Date: {receiptDate}</div>
          </div>
        </div>

        {/* Items Table */}
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
          style={{ marginTop: 0 }}
          locale={{ emptyText: 'No items found' }}
          footer={() => (
            <div style={{ display: 'flex', fontWeight: 'bold', borderTop: '1px solid #000', padding: '4px 8px', background: 'white' }}>
              <div style={{ width: 50, textAlign: 'center' }}></div>
              <div style={{ flex: 1, textAlign: 'left' }}>Sub-Total:</div>
              <div style={{ width: 60, textAlign: 'center' }}></div>
              <div style={{ width: 80, textAlign: 'center' }}></div>
              <div style={{ width: 100, textAlign: 'right' }}></div>
              <div style={{ width: 110, textAlign: 'right' }}>Rs. {totalTaxable.toFixed(2)}</div>
              <div style={{ width: 80, textAlign: 'right' }}>Rs. {totalCGST.toFixed(2)}</div>
              <div style={{ width: 80, textAlign: 'right' }}>Rs. {totalSGST.toFixed(2)}</div>
              <div style={{ width: 80, textAlign: 'right' }}>Rs. {totalIGST.toFixed(2)}</div>
              <div style={{ width: 120, textAlign: 'right' }}>Rs. {grandTotal.toFixed(2)}</div>
            </div>
          )}
        />

        {/* Bottom sections */}
        <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 12px', display: 'flex', background: 'white' }}>
          <div style={{ flex: '0 0 60%', paddingRight: 8 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Bank Details</div>
            <div style={{ fontSize: 10 }}>
              Bank Name: {org?.bank_name || 'N/A'}<br />
              Branch: {org?.branch_name || 'N/A'}<br />
              Account No: {org?.account_number || 'N/A'}<br />
              IFSC Code: {org?.ifsc_code || 'N/A'}<br />
              UPI ID: {org?.upi_id || 'N/A'}
            </div>
            <Divider style={{ margin: '6px 0' }} />
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Amount in Words</div>
            <div style={{ fontSize: 10 }}>Rupees {grandTotal.toFixed(2)} Only</div>
          </div>
          <div style={{ flex: '1', textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Tax Summary</div>
            <div style={{ fontSize: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Grand Total</span>
                <span>Rs. {grandTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SGST</span>
                <span>Rs. {totalSGST.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CGST</span>
                <span>Rs. {totalCGST.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>IGST</span>
                <span>Rs. {totalIGST.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Round Off</span>
                <span>Rs. 0.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Total Amount</span>
                <span>Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 12px', display: 'flex', background: 'white' }}>
          <div style={{ flex: '0 0 65%', paddingRight: 8 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Payment Terms & Conditions</div>
            <ul style={{ fontSize: 10, margin: 0, paddingLeft: 16 }}>
              <li>Payment is due within 15 days from the invoice date.</li>
              <li>Late payments may incur a penalty of 2% per month.</li>
              <li>Please quote invoice number when making payment.</li>
            </ul>
          </div>
          <div style={{ flex: '1', textAlign: 'center' }}>
            <div style={{ border: '1px solid #000', padding: '4px 8px', display: 'inline-block', marginBottom: 8 }}>
              <span style={{ fontSize: 8 }}>Barcode</span>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Authorised Signatory</div>
              <div style={{ fontSize: 10 }}>____________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoiceView