import { useState } from 'react'
import { Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, message, DatePicker, Select, Tabs } from 'antd'
import { DownloadOutlined, ReloadOutlined, FileTextOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker
const { TabPane } = Tabs

const GSTPage = () => {
  const { theme } = useTheme()
  const { selectedBranch, selectedFinancialYear, orgId } = useOutletContext() || {}
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ])
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [activeTab, setActiveTab] = useState('summary')

  // Fetch GST summary from the view
  const { data: gstSummary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ['gst-summary', orgId, selectedBranch?.id, selectedFinancialYear?.id, dateRange],
    queryFn: async () => {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD')

      let query = supabase
        .from('gst_summary')
        .select('*')
        .eq('organization_id', orgId)   // ✅ filter by organization

      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
      if (startDate && endDate) {
        query = query.gte('month', startDate).lte('month', endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  // Fetch GST breakdown (totals from invoices) – with organization filter via branches
  const { data: gstBreakdown } = useQuery({
    queryKey: ['gst-breakdown', orgId, selectedBranch?.id, selectedFinancialYear?.id, dateRange],
    queryFn: async () => {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD')
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD')

      let query = supabase
        .from('invoices')
        .select(`
          total_taxable_amount,
          total_cgst,
          total_sgst,
          total_igst,
          grand_total,
          branches!inner ( organization_id )
        `)
        .eq('status', 'Final')
        .eq('branches.organization_id', orgId)   // ✅ filter by organization

      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
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

  // Fetch invoice details for the selected period – with organization filter
  const { data: invoiceDetails, isLoading: invoiceLoading } = useQuery({
    queryKey: ['gst-invoice-details', orgId, selectedBranch?.id, selectedFinancialYear?.id, dateRange],
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
          students ( full_name_formatted, admission_no ),
          branches!inner ( organization_id )
        `)
        .eq('status', 'Final')
        .eq('branches.organization_id', orgId)   // ✅ filter by organization

      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
      if (startDate && endDate) {
        query = query.gte('invoice_date', startDate).lte('invoice_date', endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  // Export to JSON – includes orgId in metadata
  const handleExportJSON = () => {
    const exportData = {
      organization: orgId,
      period: {
        from: dateRange?.[0]?.format('YYYY-MM-DD'),
        to: dateRange?.[1]?.format('YYYY-MM-DD'),
      },
      branch: selectedBranch?.id || 'All',
      financial_year: selectedFinancialYear?.id || 'All',
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
      render: (s) => <Tag color={s === 'Final' ? 'green' : 'orange'}>{s}</Tag>,
    },
  ]

  const stats = gstBreakdown || { cgst: 0, sgst: 0, igst: 0, taxable: 0, grand_total: 0 }

  return (
    <div style={{ fontFamily: fontBody }}>
      {/* Filter Bar */}
      <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}`, marginBottom: 16 }}>
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
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportJSON}
                style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
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
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic title="Taxable Amount" value={stats.taxable} precision={2} prefix="₹" valueStyle={{ color: primaryColor }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic title="CGST" value={stats.cgst} precision={2} prefix="₹" valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic title="SGST" value={stats.sgst} precision={2} prefix="₹" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic title="IGST" value={stats.igst} precision={2} prefix="₹" valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic title="Total GST" value={stats.cgst + stats.sgst + stats.igst} precision={2} prefix="₹" valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
            <Statistic title="Grand Total" value={stats.grand_total} precision={2} prefix="₹" valueStyle={{ color: primaryColor }} />
          </Card>
        </Col>
      </Row>

      {/* Tabs: Summary & Invoice Details */}
      <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <FileTextOutlined /> Summary
              </span>
            }
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
            tab={
              <span>
                <UnorderedListOutlined /> Invoice Details
              </span>
            }
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