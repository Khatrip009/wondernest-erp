// src/pages/reports/ReportPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { supabase } from '../../lib/supabase'
import { reportTypes, getReportConfig } from '../../utils/reportConfig'
import { exportReportPDF } from '../../utils/pdfExport'
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Spin,
  Table,
  Typography,
  message,
  Row,
  Col,
  Divider,
  Alert,
  Empty,
  Input,
} from 'antd'
import {
  ReloadOutlined,
  FilePdfOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const { Title, Text } = Typography
const { Option } = Select

// ------------------------------------------------------------
// Helper: fetch filter options
// ------------------------------------------------------------
const fetchOptions = async (field, orgId, branchId, financialYearId) => {
  switch (field) {
    case 'course_id':
      return fetchFromTable('courses', 'id', 'name', { orgId })
    case 'batch_id':
      return fetchFromTable('batches', 'id', 'batch_name', { branchId, financialYearId })
    case 'status':
      return [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
        { value: 'converted', label: 'Converted' },
        { value: 'lost', label: 'Lost' },
      ]
    case 'source':
      return fetchFromTable('inquiry_sources', 'id', 'name', {})
    case 'document_type':
      return [
        { value: 'Aadhar', label: 'Aadhar' },
        { value: 'Photo', label: 'Photo' },
        { value: 'Marksheet', label: 'Marksheet' },
      ]
    case 'exam_id':
      return fetchFromTable('exams', 'id', 'exam_name', { branchId, financialYearId })
    case 'teacher_id':
      return fetchFromTable(
        'teachers',
        'id',
        'first_name',
        { orgId, branchId, financialYearId },
        "full_name:first_name||' '||last_name"
      )
    case 'student_id':
      return fetchFromTable(
        'students',
        'id',
        'admission_no',
        { orgId, branchId, financialYearId },
        "full_name:first_name||' '||last_name"
      )
    case 'category':
      return fetchFromTable('income', 'category', 'category', { orgId, branchId, financialYearId }, null, true)
    default:
      return []
  }
}

const fetchFromTable = async (
  table,
  valueKey,
  labelKey,
  filters = {},
  customLabel = null,
  distinct = false
) => {
  const { orgId, branchId, financialYearId } = filters

  const columnMap = {
    courses: ['organization_id'],
    batches: ['branch_id', 'financial_year_id'],
    inquiry_sources: [],
    exams: ['branch_id', 'financial_year_id'],
    teachers: ['organization_id', 'branch_id', 'financial_year_id'],
    students: ['organization_id', 'branch_id', 'financial_year_id'],
    income: ['organization_id', 'branch_id', 'financial_year_id'],
  }
  const exists = (col) => (columnMap[table] || []).includes(col)

  let selectStr = distinct ? `distinct ${labelKey}` : `${valueKey}, ${labelKey}`
  if (customLabel) {
    selectStr = distinct ? `distinct ${customLabel}` : `${valueKey}, ${customLabel}`
  }

  let query = supabase.from(table).select(selectStr)

  if (orgId && exists('organization_id')) query = query.eq('organization_id', orgId)
  if (branchId && exists('branch_id')) query = query.eq('branch_id', branchId)
  if (financialYearId && exists('financial_year_id')) query = query.eq('financial_year_id', financialYearId)

  const { data, error } = await query
  if (error) {
    console.error(`Error fetching ${table}:`, error)
    return []
  }

  if (!data || data.length === 0) return []

  if (distinct) {
    return data.map(item => ({ value: item[labelKey], label: item[labelKey] }))
  }

  const labelKeys = Object.keys(data[0] || {}).filter(k => k !== valueKey)
  const labelKeyFromResponse = labelKeys[0] || labelKey

  return data.map(item => ({
    value: item[valueKey],
    label: customLabel ? item[labelKeyFromResponse] : (item[labelKey] || item[valueKey]),
  }))
}

// ------------------------------------------------------------
// Main Component
// ------------------------------------------------------------
const ReportPage = () => {
  const { reportKey } = useParams()
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org: organization } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  const [filters, setFilters] = useState({})
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [optionCache, setOptionCache] = useState({})

  const reportConfig = reportKey ? getReportConfig(reportKey) : null

  // ------------------------------------------------------------
  // Load filter options
  // ------------------------------------------------------------
  const loadOptions = useCallback(async (field) => {
    if (optionCache[field]) return optionCache[field]
    const options = await fetchOptions(field, organization?.id, selectedBranch?.id, selectedFinancialYear?.id)
    setOptionCache(prev => ({ ...prev, [field]: options }))
    return options
  }, [organization?.id, selectedBranch?.id, selectedFinancialYear?.id, optionCache])

  // ------------------------------------------------------------
  // Render filter fields
  // ------------------------------------------------------------
  const renderFilterFields = () => {
    if (!reportConfig) return null
    const fields = reportConfig.fields || []
    return fields.map((field) => {
      let component = null
      const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

      switch (field) {
        case 'start_date':
          component = (
            <Form.Item label="Start Date" key="start_date">
              <DatePicker
                style={{ width: '100%', fontFamily: fontBody }}
                value={filters.start_date ? dayjs(filters.start_date) : null}
                onChange={(date) => setFilters(prev => ({ ...prev, start_date: date ? date.format('YYYY-MM-DD') : undefined }))}
              />
            </Form.Item>
          )
          break
        case 'end_date':
          component = (
            <Form.Item label="End Date" key="end_date">
              <DatePicker
                style={{ width: '100%', fontFamily: fontBody }}
                value={filters.end_date ? dayjs(filters.end_date) : null}
                onChange={(date) => setFilters(prev => ({ ...prev, end_date: date ? date.format('YYYY-MM-DD') : undefined }))}
              />
            </Form.Item>
          )
          break
        case 'batch_id':
        case 'course_id':
        case 'teacher_id':
        case 'student_id':
        case 'exam_id':
        case 'source':
        case 'status':
        case 'document_type':
        case 'category':
          component = (
            <Form.Item label={label} key={field}>
              <Select
                style={{ width: '100%', fontFamily: fontBody }}
                placeholder={`Select ${label}`}
                allowClear
                value={filters[field]}
                onChange={(val) => setFilters(prev => ({ ...prev, [field]: val }))}
                showSearch
                optionFilterProp="label"
              >
                {optionCache[field]?.map(opt => (
                  <Option key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )
          break
        case 'student_name':
          component = (
            <Form.Item label="Student Name" key="student_name">
              <Input
                style={{ fontFamily: fontBody }}
                value={filters.student_name}
                onChange={(e) => setFilters(prev => ({ ...prev, student_name: e.target.value }))}
                placeholder="Search by name"
              />
            </Form.Item>
          )
          break
        default:
          component = null
      }
      return component
    }).filter(Boolean)
  }

  // ------------------------------------------------------------
  // Fetch report data – handles all queryBuilder returns
  // ------------------------------------------------------------
  const fetchReport = useCallback(async () => {
    if (!reportConfig) return

    setLoading(true)
    setError(null)

    try {
      const { queryBuilder, id } = reportConfig
      const branchId = selectedBranch?.id || null
      const fyId = selectedFinancialYear?.id || null
      const orgId = organization?.id || null

      const filterValues = { ...filters }
      if (reportConfig.defaultFilters) {
        const defaults = reportConfig.defaultFilters()
        Object.keys(defaults).forEach(key => {
          if (!filterValues[key]) filterValues[key] = defaults[key]
        })
      }

      let result

      if (typeof queryBuilder === 'function') {
        const raw = queryBuilder(filterValues, branchId, fyId, orgId)

        // Normalize: always treat as a promise
        const promise = raw && typeof raw.then === 'function' ? raw : Promise.resolve(raw)
        const response = await promise

        // Supabase response? (has data and error properties)
        if (response && typeof response === 'object' && 'data' in response) {
          if (response.error) throw new Error(response.error.message)
          result = response.data ?? []
        } else {
          // plain object or array
          result = response
        }
      } else {
        throw new Error('queryBuilder is not a function')
      }

      // Special handling for reports that return an object (not an array)
      const objectReports = ['profit_loss_summary', 'tax_collected']
      if (!objectReports.includes(id)) {
        if (!Array.isArray(result)) {
          result = [result]
        }
      }

      // Apply transform if present
      let transformed = result
      if (reportConfig.transform && typeof reportConfig.transform === 'function') {
        transformed = reportConfig.transform(result)
      }

      // Final data must be an array
      const finalData = Array.isArray(transformed) ? transformed : [transformed]
      setData(finalData)

    } catch (err) {
      console.error('Report error:', err)
      setError(err.message || 'Failed to load report data')
      message.error(err.message || 'Failed to load report data')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [reportConfig, filters, selectedBranch, selectedFinancialYear, organization])

  // Auto‑fetch on mount and when dependencies change
  useEffect(() => {
    if (reportKey && reportConfig) fetchReport()
  }, [reportKey, reportConfig, fetchReport])

  // Load dropdown options for filter fields
  useEffect(() => {
    if (reportConfig) {
      const fields = reportConfig.fields || []
      fields.forEach(field => {
        if (['course_id', 'batch_id', 'teacher_id', 'student_id', 'exam_id', 'source', 'category'].includes(field)) {
          loadOptions(field)
        }
      })
    }
  }, [reportConfig, loadOptions])

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------
  const handleReportChange = (key) => {
    navigate(`/reports/${key}`)
    setFilters({})
    setData([])
    setError(null)
  }

  const handleExportPDF = () => {
    if (!data || data.length === 0) {
      message.warning('No data to export')
      return
    }
    const columns = reportConfig.columns.map(col => ({
      header: col.header,
      accessor: col.accessor,
      width: col.width || 100,
    }))

    const exportData = data.map(row => {
      const obj = {}
      columns.forEach(col => {
        obj[col.accessor] = row[col.accessor] ?? ''
      })
      return obj
    })

    exportReportPDF({
      title: reportConfig.title,
      subtitle: reportConfig.description || '',
      columns: columns,
      data: exportData,
      fileName: `${reportConfig.title.replace(/\s/g, '_')}.pdf`,
      organization: organization || {},
      branchName: selectedBranch?.branch_name || '',
      branchAddress: selectedBranch?.address || '',
      theme: theme || {},
      orientation: reportConfig.pdfConfig?.orientation || 'portrait',
    })
    message.success('PDF exported successfully')
  }

  // ------------------------------------------------------------
  // Table columns & aggregate row
  // ------------------------------------------------------------
  const tableColumns = useMemo(() => {
    if (!reportConfig) return []
    return reportConfig.columns.map(col => ({
      title: col.header,
      dataIndex: col.accessor,
      key: col.accessor,
      render: (text) => {
        if (text === null || text === undefined) return '—'
        if (typeof text === 'number') return text.toLocaleString()
        return text
      },
    }))
  }, [reportConfig])

  const aggregateRow = useMemo(() => {
    if (!reportConfig?.aggregateRow || !data || data.length === 0) return null
    const agg = {}
    reportConfig.columns.forEach(col => {
      if (col.aggregate === 'sum') {
        const sum = data.reduce((s, row) => s + (parseFloat(row[col.accessor]) || 0), 0)
        agg[col.accessor] = Math.round(sum * 100) / 100
      } else if (col.aggregate === 'avg') {
        const total = data.reduce((s, row) => s + (parseFloat(row[col.accessor]) || 0), 0)
        const avg = data.length ? total / data.length : 0
        agg[col.accessor] = Math.round(avg * 100) / 100
      } else {
        agg[col.accessor] = '—'
      }
    })
    agg['__aggregate_label'] = 'Total'
    return agg
  }, [data, reportConfig])

  // ------------------------------------------------------------
  // Chart renderer
  // ------------------------------------------------------------
  const renderChart = () => {
    if (!reportConfig?.chartConfig || !data || data.length === 0) return null
    const { type, dataKey, labelKey } = reportConfig.chartConfig
    const chartData = data.map(row => ({
      name: row[labelKey] || 'Unnamed',
      value: parseFloat(row[dataKey]) || 0,
    }))

    const colors = ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#42A5F5', '#64B5F6']

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
            <XAxis dataKey="name" tick={{ fill: textColor }} />
            <YAxis tick={{ fill: textColor }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={primaryColor} />
          </BarChart>
        </ResponsiveContainer>
      )
    } else if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )
    }
    return null
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Reports</Title>}
        extra={
          <Space wrap>
            {reportConfig && data.length > 0 && (
              <Button icon={<FilePdfOutlined />} onClick={handleExportPDF} style={{ borderColor: primaryColor, color: primaryColor }}>
                Export PDF
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={fetchReport} style={{ fontFamily: fontBody }}>
              Refresh
            </Button>
          </Space>
        }
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
          borderColor,
        }}
      >
        {/* Report selector */}
        <Form layout="vertical">
          <Form.Item label="Select Report">
            <Select
              style={{ width: '100%', fontFamily: fontBody }}
              placeholder="Choose a report"
              value={reportKey}
              onChange={handleReportChange}
              showSearch
              optionFilterProp="label"
            >
              {Object.keys(reportTypes).map(key => (
                <Option key={key} value={key} label={reportTypes[key].title}>
                  {reportTypes[key].title}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>

        {reportKey && reportConfig && (
          <>
            <Divider style={{ borderColor }} />
            <Text style={{ color: textColor, fontFamily: fontBody, display: 'block', marginBottom: 16 }}>
              {reportConfig.description}
            </Text>

            {/* Filters */}
            <div style={{ marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                {renderFilterFields().map((field, index) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={index}>
                    {field}
                  </Col>
                ))}
                {reportConfig.fields && reportConfig.fields.length > 0 && (
                  <Col xs={24} sm={12} md={8} lg={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Button
                      type="primary"
                      onClick={fetchReport}
                      loading={loading}
                      style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
                      block
                    >
                      Generate Report
                    </Button>
                  </Col>
                )}
              </Row>
            </div>

            {error && <Alert title="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            )}

            {!loading && data.length > 0 && (
              <>
                {renderChart() && (
                  <div style={{ marginBottom: 24 }}>
                    <Card style={{ backgroundColor: cardBg, borderColor }}>{renderChart()}</Card>
                  </div>
                )}
                <Table
                  columns={tableColumns}
                  dataSource={data}
                  rowKey={(record, index) => index}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  bordered
                  size="small"
                  style={{ backgroundColor: cardBg, borderColor, color: textColor }}
                  summary={() => {
                    if (!aggregateRow) return null
                    return (
                      <Table.Summary.Row>
                        {tableColumns.map((col, idx) => {
                          let val = aggregateRow[col.dataIndex] ?? '—'
                          if (idx === 0) val = 'Total'
                          return (
                            <Table.Summary.Cell key={idx}>
                              <Text strong style={{ color: primaryColor }}>
                                {val}
                              </Text>
                            </Table.Summary.Cell>
                          )
                        })}
                      </Table.Summary.Row>
                    )
                  }}
                />
              </>
            )}

            {!loading && !error && data.length === 0 && (
              <Empty description="No data found. Adjust filters and generate report." />
            )}
          </>
        )}

        {!reportKey && <Empty description="Please select a report from the dropdown above." />}
      </Card>
    </div>
  )
}

export default ReportPage