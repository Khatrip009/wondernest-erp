import { useState } from 'react'
import {
  Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic,
  message, DatePicker, Select, Tabs
} from 'antd'
import {
  DownloadOutlined, ReloadOutlined,
  FileTextOutlined, UnorderedListOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker
const { TabPane } = Tabs

const GSTPage = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()
  const orgId = org?.id

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ])
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [activeTab, setActiveTab] = useState('summary')

  // ---------- GST Summary from view (still respects org) ----------
  const { data: gstSummary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ['gst-summary', orgId, dateRange],
    queryFn: async () => {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD')

      let query = supabase
        .from('gst_summary')
        .select('*')
        .eq('organization_id', orgId)

      if (startDate && endDate) {
        query = query.gte('month', startDate).lte('month', endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  // ---------- GST Breakdown (totals) – no branch / FY filter ----------
  const { data: gstBreakdown } = useQuery({
    queryKey: ['gst-breakdown', orgId, dateRange],
    queryFn: async () => {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD')

      let query = supabase
        .from('invoices')
        .select('total_taxable_amount, total_cgst, total_sgst, total_igst, grand_total')
        .eq('organization_id', orgId)               // ✅ only org filter
        .in('status', ['Final', 'Paid'])           // include Paid invoices

      if (startDate && endDate) {
        query = query.gte('invoice_date', startDate).lte('invoice_date', endDate)
      }

      const { data, error } = await query
      if (error) throw error

      const totals = (data || []).reduce((acc, inv) => {
        acc.taxable += Number(inv.total_taxable_amount) || 0
        acc.cgst += Number(inv.total_cgst) || 0
        acc.sgst += Number(inv.total_sgst) || 0
        acc.igst += Number(inv.total_igst) || 0
        acc.grand_total += Number(inv.grand_total) || 0
        return acc
      }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, grand_total: 0 })

      return totals
    },
    enabled: !!orgId,
  })

  // ---------- Invoice Details – no branch / FY filter ----------
  const { data: invoiceDetails, isLoading: invoiceLoading } = useQuery({
    queryKey: ['gst-invoice-details', orgId, dateRange],
    queryFn: async () => {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD')

      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          student_id,
          total_taxable_amount,
          total_cgst,
          total_sgst,
          total_igst,
          total_gst_amount,
          grand_total,
          status,
          students ( full_name_formatted, admission_no )
        `)
        .eq('organization_id', orgId)               // ✅ only org filter
        .in('status', ['Final', 'Paid'])           // include Paid invoices

      if (startDate && endDate) {
        query = query.gte('invoice_date', startDate).lte('invoice_date', endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  // Export JSON
  const handleExportJSON = () => {
    const exportData = {
      organization: orgId,
      period: {
        from: dateRange?.[0]?.format('YYYY-MM-DD'),
        to: dateRange?.[1]?.format('YYYY-MM-DD'),
      },
      summary: gstSummary || [],
      breakdown: gstBreakdown || {},
      invoices: invoiceDetails || [],
      generated_at: new Date().toISOString(),
    }

    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `GST_Summary_${dayjs().format('YYYY-MM-DD')}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('GST JSON exported successfully')
  }

  // Summary columns
  const summaryColumns = [
    {
      title: 'Month',
      dataIndex: 'month',
      render: (m) => dayjs(m).format('MMM YYYY'),
    },
    {
      title: 'Taxable Amount',
      dataIndex: 'total_taxable',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'CGST',
      dataIndex: 'total_cgst',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'SGST',
      dataIndex: 'total_sgst',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'IGST',
      dataIndex: 'total_igst',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'Total GST',
      dataIndex: 'total_gst',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'Grand Total',
      dataIndex: 'grand_total',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
  ]

  // Invoice details columns
  const invoiceColumns = [
    {
      title: 'Invoice No',
      dataIndex: 'invoice_number',
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => window.open(`/invoices/${record.id}`, '_blank')}
          style={{ padding: 0, color: primaryColor }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'invoice_date',
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Student',
      dataIndex: ['students', 'full_name_formatted'],
      render: (name, record) => name || `Student #${record.student_id}`,
    },
    {
      title: 'Admission No',
      dataIndex: ['students', 'admission_no'],
      render: (no) => no || '-',
    },
    {
      title: 'Taxable',
      dataIndex: 'total_taxable_amount',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'CGST',
      dataIndex: 'total_cgst',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'SGST',
      dataIndex: 'total_sgst',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'IGST',
      dataIndex: 'total_igst',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'Total GST',
      dataIndex: 'total_gst_amount',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'Grand Total',
      dataIndex: 'grand_total',
      render: (v) => `₹${Number(v).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s) => <Tag color={s === 'Final' ? 'green' : s === 'Paid' ? 'blue' : 'orange'}>{s}</Tag>,
    },
  ]

  const stats = gstBreakdown || { cgst: 0, sgst: 0, igst: 0, taxable: 0, grand_total: 0 }

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      {/* Filter Bar */}
      <Card
        variant="borderless"
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          borderTop: `4px solid ${primaryColor}`,
          marginBottom: 16,
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              style={{ width: '100%' }}
            >
              <Select.Option value="monthly">Monthly</Select.Option>
              <Select.Option value="quarterly">Quarterly</Select.Option>
              <Select.Option value="yearly">Yearly</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} style={{ fontFamily: fontBody }}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportJSON}
                style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
              >
                Export JSON
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Taxable Amount</span>}
              value={stats.taxable} precision={2} prefix="₹"
              valueStyle={{ color: primaryColor }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>CGST</span>}
              value={stats.cgst} precision={2} prefix="₹"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>SGST</span>}
              value={stats.sgst} precision={2} prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>IGST</span>}
              value={stats.igst} precision={2} prefix="₹"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Total GST</span>}
              value={stats.cgst + stats.sgst + stats.igst} precision={2} prefix="₹"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card variant="borderless" style={{ backgroundColor: cardBg, borderTop: `4px solid ${primaryColor}` }}>
            <Statistic
              title={<span style={{ color: textColor }}>Grand Total</span>}
              value={stats.grand_total} precision={2} prefix="₹"
              valueStyle={{ color: primaryColor }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs: Summary & Invoice Details */}
      <Card
        variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={<span><FileTextOutlined /> Summary</span>}
            key="summary"
          >
            <Table
              dataSource={gstSummary || []}
              columns={summaryColumns}
              rowKey="month"
              loading={summaryLoading}
              pagination={false}
              size="middle"
            />
          </TabPane>
          <TabPane
            tab={<span><UnorderedListOutlined /> Invoice Details</span>}
            key="invoices"
          >
            <Table
              dataSource={invoiceDetails || []}
              columns={invoiceColumns}
              rowKey="id"
              loading={invoiceLoading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `Total ${total} invoices`,
              }}
              size="middle"
              scroll={{ x: 'max-content' }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default GSTPage