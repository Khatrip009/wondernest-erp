// src/pages/reports/AllReportsList.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Typography,
  Input,
  Space,
  Button,
  Empty,
  Tag,
} from 'antd'
import {
  FileSearchOutlined,
  BarChartOutlined,
  DollarOutlined,
  TeamOutlined,
  BookOutlined,
  ExperimentOutlined,
  FilePdfOutlined,
  ShopOutlined,
  AuditOutlined,
  SolutionOutlined,
  PieChartOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  UserOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useTheme } from '../../contexts/ThemeContext'
import { reportTypes } from '../../utils/reportConfig'

const { Title, Text, Paragraph } = Typography
const { Search } = Input

// Map report keys to icons
const iconMap = {
  student_enrollment: <TeamOutlined />,
  student_status_list: <UserOutlined />,
  batch_capacity: <BarChartOutlined />,
  student_parents: <SolutionOutlined />,
  inquiry_conversion: <FileSearchOutlined />,
  student_documents: <FilePdfOutlined />,
  attendance_summary: <CalendarOutlined />,
  student_attendance_pct: <CalendarOutlined />,
  homework_submissions: <BookOutlined />,
  exam_results: <ExperimentOutlined />,
  student_progress: <PieChartOutlined />,
  online_class_attendance: <CalendarOutlined />,
  fee_collection: <DollarOutlined />,
  pending_fees: <CreditCardOutlined />,
  income_statement: <DollarOutlined />,
  expense_statement: <ShopOutlined />,
  profit_loss_summary: <PieChartOutlined />,
  tax_collected: <AuditOutlined />,
  receipts_journal: <FilePdfOutlined />,
  teacher_salary: <DollarOutlined />,
  teacher_workload: <TeamOutlined />,
  certificates_issued: <FilePdfOutlined />,
  student_level_completion: <BookOutlined />,
  student_contact_directory: <UserOutlined />,
  admission_pipeline: <BarChartOutlined />,
  fee_aging_analysis: <CreditCardOutlined />,
}

// Helper: get a consistent color per report
const getCardColor = (index) => {
  const colors = [
    '#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#42A5F5', '#64B6F6',
    '#00838F', '#0097A7', '#00ACC1', '#26C6DA', '#4DD0E1',
    '#2E7D32', '#388E3C', '#43A047', '#66BB6A', '#81C784',
    '#E65100', '#EF6C00', '#F57C00', '#FB8C00', '#FFA726',
    '#AD1457', '#C2185B', '#D81B60', '#E91E63', '#F06292',
  ]
  return colors[index % colors.length]
}

const AllReportsList = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  // Get report entries and filter by search
  const reportEntries = Object.entries(reportTypes)
  const filteredReports = searchTerm
    ? reportEntries.filter(([key, config]) =>
        config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : reportEntries

  const handleCardClick = (reportKey) => {
    navigate(`/reports/${reportKey}`)
  }

  return (
    <div style={{ fontFamily: fontBody, padding: '8px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
          All Reports
        </Title>
        <Search
          placeholder="Search reports by title or description"
          allowClear
          style={{ width: 300 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={(val) => setSearchTerm(val)}
          prefix={<SearchOutlined style={{ color: darkMode ? '#666' : '#aaa' }} />}
        />
      </div>

      <Paragraph style={{ color: textColor, marginBottom: 24 }}>
        Select a report to view detailed data, charts, and export options.
      </Paragraph>

      {/* Report Cards */}
      {filteredReports.length === 0 ? (
        <Empty description="No reports match your search" />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredReports.map(([key, config], index) => {
            const icon = iconMap[key] || <FileSearchOutlined />
            const cardColor = getCardColor(index)
            return (
              <Col key={key} xs={24} sm={12} md={8} lg={6} xl={6}>
                <Card
                  hoverable
                  onClick={() => handleCardClick(key)}
                  style={{
                    backgroundColor: cardBg,
                    borderColor,
                    borderRadius: 8,
                    height: '100%',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    borderTop: `4px solid ${cardColor}`,
                  }}
                  bodyStyle={{ padding: '16px' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = darkMode
                      ? '0 4px 20px rgba(255,255,255,0.06)'
                      : '0 4px 20px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: cardColor, fontSize: 22 }}>{icon}</span>
                      <Text strong style={{ color: textColor, fontSize: 15, fontFamily: fontHeading }}>
                        {config.title}
                      </Text>
                    </div>
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ color: darkMode ? '#aaa' : '#666', fontSize: 13, marginBottom: 8, minHeight: 36 }}
                    >
                      {config.description}
                    </Paragraph>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                      {config.fields && config.fields.length > 0 && (
                        <Tag color="blue" style={{ fontSize: 10, borderRadius: 4 }}>
                          {config.fields.length} filter{config.fields.length > 1 ? 's' : ''}
                        </Tag>
                      )}
                      {config.chartConfig && (
                        <Tag color="green" style={{ fontSize: 10, borderRadius: 4 }}>Chart</Tag>
                      )}
                      {config.aggregateRow && (
                        <Tag color="orange" style={{ fontSize: 10, borderRadius: 4 }}>Totals</Tag>
                      )}
                      {config.useLetterhead && (
                        <Tag color="purple" style={{ fontSize: 10, borderRadius: 4 }}>Letterhead</Tag>
                      )}
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      style={{
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                        fontFamily: fontBody,
                        marginTop: 12,
                        width: '100%',
                        borderRadius: 6,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick(key)
                      }}
                    >
                      View Report
                    </Button>
                  </Space>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}

export default AllReportsList