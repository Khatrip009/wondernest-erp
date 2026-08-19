import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Space, Spin, Typography,
  Table, Tabs
} from 'antd'
import {
  EditOutlined,
  ArrowLeftOutlined,
  DollarOutlined,
  PrinterOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useFee } from '../../hooks/useFees'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import AddPaymentModal from './AddPaymentModal'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TabPane } = Tabs

const FeesDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const orgId = org?.id || selectedBranch?.organization_id
  const branchId = selectedBranch?.id
  const financialYearId = selectedFinancialYear?.id

  // Get fee details with organisation filter
  const { data: fee, isLoading } = useFee(id, {
    orgId,
    branchId: branchId,
    financialYearId: financialYearId,
  })

  const [paymentModal, setPaymentModal] = useState(false)

  // Fetch invoices linked to this fee
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['fee-invoices', id, orgId, branchId, financialYearId],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          receipts ( receipt_no, receipt_date, id ),
          fee_payments ( payment_mode, amount, receipt_number ),
          branches!inner ( organization_id )
        `)
        .eq('student_fee_id', parseInt(id))
        .order('invoice_date', { ascending: false })

      if (orgId) {
        query = query.eq('branches.organization_id', orgId)
      }
      if (branchId) {
        query = query.eq('branch_id', branchId)
      }
      if (financialYearId) {
        query = query.eq('financial_year_id', financialYearId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!id && !!orgId,
  })

  // Fetch receipts separately
  const { data: receipts } = useQuery({
    queryKey: ['fee-receipts', id, orgId, branchId],
    queryFn: async () => {
      if (!fee?.student_id) return []
      let query = supabase
        .from('receipts')
        .select(`
          *,
          fee_payments ( payment_mode, amount, payment_date ),
          branches!inner ( organization_id )
        `)
        .eq('student_id', fee.student_id)
        .order('receipt_date', { ascending: false })

      if (orgId) {
        query = query.eq('branches.organization_id', orgId)
      }
      if (branchId) {
        query = query.eq('branch_id', branchId)
      }
      if (financialYearId) {
        query = query.eq('financial_year_id', financialYearId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!fee?.student_id && !!orgId,
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  if (!fee) return <Card><p>Fee record not found</p><Button onClick={() => navigate('/fees')}>Back</Button></Card>

  const balance = fee.final_fee - (fee.paid_amount || 0)

  // ---- Invoice columns ----
  const invoiceColumns = [
    {
      title: <span style={{ fontFamily: fontHeading }}>Invoice No</span>,
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text) => <Text strong style={{ fontFamily: fontBody }}>{text}</Text>,
    },
    {
      title: <span style={{ fontFamily: fontHeading }}>Date</span>,
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: <span style={{ fontFamily: fontHeading }}>Amount</span>,
      dataIndex: 'grand_total',
      key: 'grand_total',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: <span style={{ fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      key: 'status',
      render: (s) => (
        <Tag color={s === 'Paid' ? 'green' : s === 'Partially Paid' ? 'orange' : 'blue'}>
          {s}
        </Tag>
      ),
    },
    {
      title: <span style={{ fontFamily: fontHeading }}>Receipt No</span>,
      dataIndex: ['receipts', 'receipt_no'],
      key: 'receipt_no',
      render: (r) => r || '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading }}>Payment Mode</span>,
      dataIndex: ['fee_payments', 'payment_mode'],
      key: 'payment_mode',
      render: (mode) => mode || '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading }}>Actions</span>,
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/invoices/${record.id}`)}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            View
          </Button>
          {record.receipts && (
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => navigate(`/receipts/${record.receipts.id}`)}
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              Receipt
            </Button>
          )}
        </Space>
      ),
    },
  ]

  // ---- Payment history columns ----
  const paymentColumns = [
    { title: 'Date', dataIndex: 'payment_date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Amount', dataIndex: 'amount', render: (v) => `₹${Number(v).toFixed(2)}` },
    { title: 'Mode', dataIndex: 'payment_mode' },
    { title: 'Transaction No', dataIndex: 'transaction_no' },
    { title: 'Receipt No', dataIndex: 'receipt_number' },
    { title: 'Remarks', dataIndex: 'remarks' },
  ]

  return (
    <div style={{ fontFamily: fontBody }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/fees')}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Back
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={() => navigate(`/fees/${id}/edit`)}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Edit
        </Button>
        <Button
          icon={<DollarOutlined />}
          type="primary"
          onClick={() => setPaymentModal(true)}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
        >
          Add Payment
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            queryClient.invalidateQueries(['fee', id])
            queryClient.invalidateQueries(['fee-invoices', id])
            refetchInvoices()
          }}
        >
          Refresh
        </Button>
      </Space>

      <Card
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Fee Details</Title>}
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}` }}
      >
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          labelStyle={{ color: primaryColor, fontWeight: 500 }}
          contentStyle={{ fontFamily: fontBody, color: primaryColor }}
        >
          <Descriptions.Item label="Student">{fee.students?.full_name_formatted}</Descriptions.Item>
          <Descriptions.Item label="Admission No">{fee.students?.admission_no}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{fee.students?.mobile}</Descriptions.Item>
          <Descriptions.Item label="Service">{fee.inventory_items?.item_name}</Descriptions.Item>
          <Descriptions.Item label="Total Fee">₹{Number(fee.total_fee).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Discount">₹{Number(fee.discount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Final Fee">₹{Number(fee.final_fee).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Paid">₹{Number(fee.paid_amount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Balance">₹{balance.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={fee.status === 'Paid' ? 'green' : fee.status === 'Partially Paid' ? 'orange' : 'red'}>
              {fee.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Due Date">{fee.due_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Created">{dayjs(fee.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        bordered={false}
        style={{ marginTop: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}` }}
      >
        <Tabs defaultActiveKey="invoices" style={{ fontFamily: fontBody }}>
          <TabPane tab={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Invoices</span>} key="invoices">
            <Table
              dataSource={invoices || []}
              columns={invoiceColumns}
              rowKey="id"
              loading={invoicesLoading}
              pagination={false}
              size="small"
              locale={{ emptyText: 'No invoices for this fee yet.' }}
            />
          </TabPane>
          <TabPane tab={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Payment History</span>} key="payments">
            <Table
              dataSource={fee.fee_payments || []}
              columns={paymentColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'No payments recorded yet.' }}
            />
          </TabPane>
          <TabPane tab={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Receipts</span>} key="receipts">
            <Table
              dataSource={receipts || []}
              columns={[
                { title: 'Receipt No', dataIndex: 'receipt_no' },
                { title: 'Date', dataIndex: 'receipt_date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
                { title: 'Amount', dataIndex: 'amount', render: (v) => `₹${Number(v).toFixed(2)}` },
                { title: 'Mode', dataIndex: ['fee_payments', 'payment_mode'] },
                {
                  title: 'Actions',
                  render: (_, record) => (
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/receipts/${record.id}`)}
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      View
                    </Button>
                  ),
                },
              ]}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'No receipts found.' }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* ✅ Pass required IDs to the modal */}
      <AddPaymentModal
        open={paymentModal}
        feeId={fee.id}
        orgId={orgId}
        branchId={branchId}
        financialYearId={financialYearId}
        onClose={() => {
          setPaymentModal(false)
          queryClient.invalidateQueries({ queryKey: ['fee', id] })
          queryClient.invalidateQueries({ queryKey: ['fee-invoices', id] })
          refetchInvoices()
        }}
      />
    </div>
  )
}

export default FeesDetail