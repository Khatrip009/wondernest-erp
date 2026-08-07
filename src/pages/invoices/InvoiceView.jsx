import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Spin, Typography, Table, Divider, Row, Col, Tag, message } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportInvoicePDF } from '../../utils/exportInvoicePDF'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const InvoiceView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const [loadingPDF, setLoadingPDF] = useState(false)

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  // ---- Fetch invoice details from the view ----
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      // Use the invoice_details view (it has items as JSON)
      const { data, error } = await supabase
        .from('invoice_details')
        .select('*')
        .eq('invoice_id', parseInt(id))
        .single()

      if (error) {
        // Fallback: fetch invoice and items separately
        const { data: inv, error: invErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', parseInt(id))
          .single()
        if (invErr) throw invErr

        const { data: items, error: itemsErr } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', parseInt(id))
        if (itemsErr) throw itemsErr

        // Get last payment for this invoice
        const { data: payment, error: payErr } = await supabase
          .from('fee_payments')
          .select('payment_mode, receipt_number, payment_date, transaction_no')
          .eq('invoice_id', parseInt(id))
          .order('payment_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Get student details
        const { data: student, error: stuErr } = await supabase
          .from('students')
          .select('full_name_formatted, admission_no, mobile, email, address, city, state, pincode, gstin')
          .eq('id', inv.student_id)
          .single()
        if (!stuErr && student) {
          inv.student_name = student.full_name_formatted
          inv.student_address = student.address
          inv.student_city = student.city
          inv.student_state = student.state
          inv.student_pincode = student.pincode
          inv.student_mobile = student.mobile
          inv.student_email = student.email
          inv.student_gstin = student.gstin
        }

        // Attach items
        inv.items = items.map(item => ({
          ...item,
          item_id: item.id,
          hsn_code: item.hsn_sac_code,
          tax_rate: item.tax_rate_id ? (() => { /* we'll fetch tax rate separately if needed */ })() : 0,
        }))

        // Attach payment info
        if (payment) {
          inv.payment_mode = payment.payment_mode
          inv.receipt_number = payment.receipt_number
          inv.receipt_date = payment.payment_date
          inv.transaction_no = payment.transaction_no
        }

        return inv
      }

      // If view worked, parse items JSON and attach payment info
      // The view returns `items` as JSON array.
      // We also need to fetch the last payment for this invoice.
      const { data: payment, error: payErr } = await supabase
        .from('fee_payments')
        .select('payment_mode, receipt_number, payment_date, transaction_no')
        .eq('invoice_id', parseInt(id))
        .order('payment_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (payment) {
        data.payment_mode = payment.payment_mode
        data.receipt_number = payment.receipt_number
        data.receipt_date = payment.payment_date
        data.transaction_no = payment.transaction_no
      }

      return data
    },
    enabled: !!id,
  })

  // ---- Loading ----
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  // ---- Error ----
  if (error) {
    return (
      <Card>
        <p>Failed to load invoice: {error.message}</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Go Back</Button>
      </Card>
    )
  }

  // ---- Not found ----
  if (!invoice) {
    return (
      <Card>
        <p>Invoice not found</p>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Go Back</Button>
      </Card>
    )
  }

  // ---- Ensure items is an array ----
  let items = invoice.items || []
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items)
    } catch (e) {
      items = []
    }
  }
  // If items is an object (not array), convert
  if (!Array.isArray(items)) {
    items = Object.values(items)
  }

  // ---- Compute totals ----
  const totalTaxable = items.reduce((sum, i) => sum + (i.taxable_amount || 0), 0)
  const totalTax = items.reduce((sum, i) => sum + (i.tax_amount || 0), 0)
  const grandTotal = Number(invoice.grand_total) || totalTaxable + totalTax

  // ---- Payment details ----
  const paymentMode = invoice.payment_mode || invoice.last_payment_mode || 'N/A'
  const receiptNo = invoice.receipt_number || invoice.last_receipt_no || 'N/A'
  const receiptDate = invoice.receipt_date || invoice.last_payment_date || 'N/A'
  const refNo = invoice.transaction_no || invoice.payment_reference || 'N/A'

  // ---- Tax summary ----
  const cgst = Number(invoice.total_cgst) || 0
  const sgst = Number(invoice.total_sgst) || 0
  const igst = Number(invoice.total_igst) || 0

  // ---- Table columns ----
  const columns = [
    {
      title: 'Sr',
      render: (_, __, idx) => idx + 1,
      width: 50,
      align: 'center',
    },
    {
      title: 'Goods & Service Description',
      dataIndex: 'description',
      key: 'description',
      width: 'auto',
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
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (v) => Number(v || 0).toFixed(0),
      align: 'center',
      width: 80,
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
      render: (_, record) => {
        const total = Number(record.total_amount) || (record.taxable_amount || 0) + (record.cgst_amount || 0) + (record.sgst_amount || 0) + (record.igst_amount || 0)
        return `₹${total.toFixed(2)}`
      },
      align: 'right',
      width: 120,
    },
  ]

  // ---- Subtotal row ----
  const totalCGST = items.reduce((s, i) => s + (i.cgst_amount || 0), 0)
  const totalSGST = items.reduce((s, i) => s + (i.sgst_amount || 0), 0)
  const totalIGST = items.reduce((s, i) => s + (i.igst_amount || 0), 0)

  // ---- Download / Print handlers ----
  const handleDownloadPDF = () => {
    setLoadingPDF(true)
    try {
      // Prepare invoice object for PDF exporter
      const pdfInvoice = {
        ...invoice,
        items: items,
        total_taxable_amount: totalTaxable,
        total_gst_amount: totalTax,
        total_cgst: totalCGST,
        total_sgst: totalSGST,
        total_igst: totalIGST,
        grand_total: grandTotal,
        payment_mode: paymentMode,
        receipt_number: receiptNo,
        receipt_date: receiptDate,
        payment_reference: refNo,
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
        ...invoice,
        items: items,
        total_taxable_amount: totalTaxable,
        total_gst_amount: totalTax,
        total_cgst: totalCGST,
        total_sgst: totalSGST,
        total_igst: totalIGST,
        grand_total: grandTotal,
        payment_mode: paymentMode,
        receipt_number: receiptNo,
        receipt_date: receiptDate,
        payment_reference: refNo,
      }
      const blob = exportInvoicePDF(pdfInvoice, org, theme, { returnBlob: true })
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        message.warning('Please allow pop-ups to print the invoice')
      }
    } catch (err) {
      console.error(err)
      message.error('Failed to generate PDF for printing')
    }
  }

  // ---- Render ----
  return (
    <div style={{ fontFamily: fontBody, padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPDF} loading={loadingPDF}>Download PDF</Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
      </Space>

      <div className="invoice-print" style={{ background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Letterhead (if any) */}
        {org?.letterhead_url && (
          <div style={{ position: 'relative', minHeight: '100%' }}>
            <img
              src={org.letterhead_url}
              alt="Letterhead"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: 'auto',
                opacity: 0.15,
                zIndex: 0,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* content will be rendered here */}
            </div>
          </div>
        )}

        {/* ========== FIRST BOX ========== */}
        <div style={{ border: '1px solid #000', padding: '8px 12px', display: 'flex', background: 'white' }}>
          <div style={{ flex: '0 0 65%', paddingRight: 8 }}>
            <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>{org?.company_name || 'Organization'}</div>
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
              <div><strong>Invoice No:</strong> {invoice.invoice_number}</div>
              <div><strong>Date:</strong> {dayjs(invoice.invoice_date).format('DD-MM-YYYY')}</div>
              {invoice.due_date && <div><strong>Due Date:</strong> {dayjs(invoice.due_date).format('DD-MM-YYYY')}</div>}
              <div><strong>Status:</strong> {invoice.status}</div>
              <div><strong>Payment Mode:</strong> {paymentMode}</div>
            </div>
          </div>
        </div>

        {/* ========== SECOND BOX ========== */}
        <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px 12px', display: 'flex', background: 'white' }}>
          <div style={{ flex: '0 0 65%', paddingRight: 8 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ flex: '0 0 50%' }}>
                <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Bill To</div>
                <div style={{ fontSize: 10 }}>Name: {invoice.student_name || '-'}</div>
                <div style={{ fontSize: 10 }}>Address: {invoice.student_address || '-'}</div>
                <div style={{ fontSize: 10 }}>{invoice.student_city} {invoice.student_state} - {invoice.student_pincode}</div>
                <div style={{ fontSize: 10 }}>Mobile: {invoice.student_mobile || '-'}</div>
                <div style={{ fontSize: 10 }}>GSTIN: {invoice.student_gstin || '-'}</div>
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Ship To</div>
                <div style={{ fontSize: 10 }}>Name: {invoice.student_name || '-'}</div>
                <div style={{ fontSize: 10 }}>Address: {invoice.student_address || '-'}</div>
                <div style={{ fontSize: 10 }}>{invoice.student_city} {invoice.student_state} - {invoice.student_pincode}</div>
                <div style={{ fontSize: 10 }}>State: {invoice.student_state}</div>
                <div style={{ fontSize: 10 }}>GSTIN: {invoice.student_gstin || '-'}</div>
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

        {/* ========== ITEMS TABLE ========== */}
        <Table
          dataSource={items}
          columns={columns}
          rowKey="item_id" // fallback to id if present
          pagination={false}
          size="small"
          bordered
          style={{ marginTop: 0 }}
          footer={() => (
            <div style={{ display: 'flex', fontWeight: 'bold', borderTop: '1px solid #000', padding: '4px 8px', background: 'white' }}>
              <div style={{ width: 50, textAlign: 'center' }}></div>
              <div style={{ flex: 1, textAlign: 'left' }}>Sub-Total:</div>
              <div style={{ width: 80, textAlign: 'center' }}></div>
              <div style={{ width: 80, textAlign: 'center' }}>{items.length}</div>
              <div style={{ width: 100, textAlign: 'right' }}></div>
              <div style={{ width: 110, textAlign: 'right' }}>Rs. {totalTaxable.toFixed(2)}</div>
              <div style={{ width: 80, textAlign: 'right' }}>Rs. {totalCGST.toFixed(2)}</div>
              <div style={{ width: 80, textAlign: 'right' }}>Rs. {totalSGST.toFixed(2)}</div>
              <div style={{ width: 80, textAlign: 'right' }}>Rs. {totalIGST.toFixed(2)}</div>
              <div style={{ width: 120, textAlign: 'right' }}>Rs. {grandTotal.toFixed(2)}</div>
            </div>
          )}
        />

        {/* ========== THIRD BOX ========== */}
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

        {/* ========== FOURTH BOX ========== */}
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