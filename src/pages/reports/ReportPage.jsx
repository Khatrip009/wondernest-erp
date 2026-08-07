import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Table, Button, Spin, Space, Typography, Result, Row, Col, DatePicker, Select } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { inquiryReports } from '../../config/inquiryReports'
import { exportReportPDF } from '../../utils/pdfExport'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'
import BranchSelector from '../../components/BranchSelector'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const ReportPage = () => {
  const { reportKey } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { org } = useOrganization()

  // Get outlet context from MainLayout (via InquiryPortal)
  const outletContext = useOutletContext() || {}
  const { selectedBranch, setSelectedBranch } = outletContext

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  const report = inquiryReports.find((r) => r.key === reportKey)

  // Filter states
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [branchId, setBranchId] = useState(selectedBranch?.id || null)
  const [statusFilter, setStatusFilter] = useState(report?.fixedStatus || null)

  // Sync branch from portal context
  useEffect(() => {
    setBranchId(selectedBranch?.id || null)
  }, [selectedBranch])

  // Reset filters when report changes
  useEffect(() => {
    setStatusFilter(report?.fixedStatus || null)
    setStartDate(null)
    setEndDate(null)
    setBranchId(selectedBranch?.id || null)
  }, [reportKey, selectedBranch])

  // Fetch branch details for PDF
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null
      const { data } = await supabase
        .from('branches')
        .select('branch_name, address')
        .eq('id', branchId)
        .single()
      return data
    },
    enabled: !!branchId,
  })

  // Fetch report data
  const { data, isLoading, error } = useQuery({
    queryKey: ['report', reportKey, branchId, startDate, endDate, statusFilter],
    queryFn: async () => {
      if (!report) return null
      let query = supabase.from(report.viewName).select('*')

      if (report.dateField) {
        if (startDate) query = query.gte(report.dateField, startDate.format('YYYY-MM-DD'))
        if (endDate) query = query.lte(report.dateField, endDate.format('YYYY-MM-DD'))
      }
      if (report.branchField && branchId) {
        query = query.eq(report.branchField, branchId)
      }
      if (report.statusField && statusFilter) {
        query = query.eq(report.statusField, statusFilter)
      }
      if (report.defaultSort) {
        query = query.order(report.defaultSort.field, {
          ascending: report.defaultSort.order === 'asc',
        })
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!report,
  })

  if (!report) {
    return (
      <Result
        status="404"
        title="Report not found"
        extra={<Button onClick={() => navigate('/inquiries/reports')}>Back to Reports</Button>}
      />
    )
  }

  const Icon = report.icon

  // Build filter summary
  const filterLines = []
  if (report.dateField && (startDate || endDate)) {
    const start = startDate ? startDate.format('DD/MM/YYYY') : '...'
    const end = endDate ? endDate.format('DD/MM/YYYY') : '...'
    filterLines.push(`Date: ${start} – ${end}`)
  }
  if (report.statusField && statusFilter && !report.fixedStatus) {
    filterLines.push(`Status: ${statusFilter}`)
  }
  let branchSummary = ''
  if (report.branchField !== null && branchId && branch) {
    branchSummary = `Branch: ${branch.branch_name}`
  }
  const filterSubtitle = filterLines.join(' | ')

  const handleExport = () => {
    if (data) {
      const exportData = data.map((row) => {
        const newRow = { ...row }
        report.columns.forEach((col) => {
          if (col.render && col.dataIndex) {
            newRow[col.dataIndex] = col.render(row[col.dataIndex], row, 0)
          }
        })
        return newRow
      })
      const subtitle = report.description + (filterSubtitle ? ` — ${filterSubtitle}` : '')
      exportReportPDF({
        title: report.title,
        subtitle,
        columns: report.columns,
        data: exportData,
        fileName: `${report.key}.pdf`,
        organization: org,
        branchName: branch?.branch_name || (branchId ? 'Unknown' : 'All Branches'),
        branchAddress: branch?.address || '',
        tableWidth: report.tableWidth || 1,
      })
    }
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      {/* Back button */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/inquiries/reports')}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Back
        </Button>
      </Space>

      {/* Filter Bar – cleaner with background and padding */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8, background: '#fafafa', border: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Row gutter={[16, 8]} align="middle">
          {report.dateField && (
            <>
              <Col xs={24} sm={12} md={4}>
                <DatePicker
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholder="Start Date"
                  style={{ width: '100%' }}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <DatePicker
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  placeholder="End Date"
                  style={{ width: '100%' }}
                  allowClear
                />
              </Col>
            </>
          )}

          {report.statusField && !report.fixedStatus && (
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Status"
                allowClear
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
              >
                <Option value="Contacted">Contacted</Option>
                <Option value="Demo Scheduled">Demo Scheduled</Option>
                <Option value="Demo Conducted">Demo Conducted</Option>
                <Option value="Converted">Converted</Option>
                <Option value="Lost">Lost</Option>
                <Option value="Rejected">Rejected</Option>
                <Option value="Scheduled">Scheduled</Option>
                <Option value="Conducted">Conducted</Option>
                <Option value="Rescheduled">Rescheduled</Option>
                <Option value="Cancelled">Cancelled</Option>
                <Option value="No-Show">No-Show</Option>
              </Select>
            </Col>
          )}

          {report.branchField !== null && (
            <Col xs={24} sm={12} md={6}>
              <BranchSelector
                value={branchId}
                onChange={(val) => {
                  setBranchId(val)
                  // Update the outlet context if needed (optional)
                }}
                style={{ width: '100%' }}
              />
            </Col>
          )}

          <Col>
            <Button
              onClick={() => {
                setStartDate(null)
                setEndDate(null)
                setBranchId(null)
                setStatusFilter(report?.fixedStatus || null)
              }}
              style={{ fontFamily: fontBody }}
            >
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Filter summary */}
      {(filterLines.length > 0 || branchSummary) && (
        <div style={{ marginBottom: 12, fontSize: 13, color: '#888' }}>
          {filterLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
          {branchSummary && <div>{branchSummary}</div>}
        </div>
      )}

      {/* Main Report Card */}
      <Card
        title={
          <Space>
            <Icon style={{ fontSize: 20, color: report.color }} />
            <Title level={4} style={{ margin: 0, color: primaryColor, fontFamily: fontHeading }}>
              {report.title}
            </Title>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Export PDF
          </Button>
        }
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${report.color}`,
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : error ? (
          <Result status="error" title="Failed to load data" subTitle={error.message} />
        ) : (
          <Table
            tableLayout="fixed"
            columns={report.columns}
            dataSource={data}
            rowKey={(_, index) => index}
            scroll={{ x: 'max-content' }}
            pagination={false}
            size="middle"
            bordered={false}
            style={{ fontFamily: fontBody }}
          />
        )}
      </Card>
    </div>
  )
}

export default ReportPage