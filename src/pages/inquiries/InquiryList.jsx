import { useState, useRef } from 'react'
import { Table, Button, Space, Tag, Input, Select, Row, Col, Card, Divider, message } from 'antd'
import {
  SearchOutlined,
  PhoneOutlined,
  WhatsAppOutlined,
  EyeOutlined,
  EditOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useInquiries, useCreateInquiry } from '../../hooks/useInquiries'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { statusColors } from '../../utils/constants'
import { exportCSV } from '../../utils/csvExport'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'

const { Option } = Select

const InquiryList = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const tableHeaderBg = darkMode ? '#2c2c2c' : '#fafafa'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ status: '', source_id: '', course_id: '', search: '' })

  const mergedFilters = {
    ...filters,
    branch_id: selectedBranch?.id || undefined,
  }
  const { data, isLoading } = useInquiries(page, pageSize, mergedFilters)

  const createMutation = useCreateInquiry()
  const fileInputRef = useRef(null)

  // Fetch courses
  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
        .is('deleted_at', null)
      if (error) throw error
      return data || []
    },
  })

  // Fetch sources
  const { data: sources } = useQuery({
    queryKey: ['inquiry_sources'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inquiry_sources')
        .select('id, name')
        .eq('is_active', true)
      return data || []
    },
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Inquiry No</span>,
      dataIndex: 'inquiry_no',
      key: 'inquiry_no',
      width: 110,
      responsive: ['sm'],
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: 'student_name',
      key: 'student_name',
      sorter: true,
      render: (text, record) => (
        <a
          onClick={() => navigate(`/inquiries/${record.id}`)}
          style={{ color: primaryColor, fontFamily: fontBody }}
        >
          {text}
        </a>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile',
      key: 'mobile',
      responsive: ['md'],
      render: (text) => (
        <Space size="small" style={{ fontFamily: fontBody }}>
          <span style={{ color: textColor }}>{text}</span>
          <Button size="small" icon={<PhoneOutlined />} type="link" href={`tel:${text}`} />
          <Button
            size="small"
            icon={<WhatsAppOutlined />}
            type="link"
            href={`https://wa.me/${text}`}
            target="_blank"
          />
        </Space>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      key: 'course',
      responsive: ['lg'],
      render: (_, record) => {
        const courseName = record.courses?.name || record.course_name || '-'
        return <span style={{ fontFamily: fontBody, color: textColor }}>{courseName}</span>
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Source</span>,
      key: 'source',
      responsive: ['lg'],
      render: (_, record) => {
        const sourceName = record.inquiry_sources?.name || record.source || '-'
        return <span style={{ fontFamily: fontBody, color: textColor }}>{sourceName}</span>
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]} style={{ fontFamily: fontBody }}>
          {status}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Follow-up</span>,
      dataIndex: 'followup_date',
      key: 'followup_date',
      responsive: ['md'],
      render: (date) =>
        date ? (
          <span style={{ fontFamily: fontBody, color: textColor }}>
            {new Date(date).toLocaleDateString()}
          </span>
        ) : (
          <span style={{ fontFamily: fontBody, color: textColor }}>-</span>
        ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/inquiries/${record.id}`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/inquiries/${record.id}/edit`)}
            style={{ fontFamily: fontBody, color: textColor, borderColor }}
          >
            Edit
          </Button>
          {record.status === 'Contacted' && (
            <Button
              size="small"
              type="primary"
              onClick={() => navigate(`/inquiries/${record.id}?scheduleDemo=true`)}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
            >
              Schedule
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const handleExport = () => {
    if (data?.data && data.data.length > 0) {
      const exportData = data.data.map((item) => ({
        inquiry_no: item.inquiry_no,
        student_name: item.student_name,
        mobile: item.mobile,
        course: item.courses?.name || '',
        source: item.inquiry_sources?.name || '',
        status: item.status,
        followup_date: item.followup_date
          ? new Date(item.followup_date).toLocaleDateString()
          : '',
      }))
      exportCSV(
        [
          { title: 'Inquiry No', dataIndex: 'inquiry_no' },
          { title: 'Student Name', dataIndex: 'student_name' },
          { title: 'Mobile', dataIndex: 'mobile' },
          { title: 'Course', dataIndex: 'course' },
          { title: 'Source', dataIndex: 'source' },
          { title: 'Status', dataIndex: 'status' },
          { title: 'Follow-up Date', dataIndex: 'followup_date' },
        ],
        exportData,
        'inquiries.csv'
      )
      message.success('CSV exported')
    } else {
      message.warning('No data to export')
    }
  }

  const handleImport = (file) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter((line) => line.trim() !== '')
      if (lines.length < 2) {
        message.error('CSV must have a header row and at least one data row')
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim())
      const requiredFields = ['student_name', 'mobile']
      const missing = requiredFields.filter((f) => !headers.includes(f))
      if (missing.length > 0) {
        message.error(`CSV must contain columns: ${missing.join(', ')}`)
        return
      }

      let successCount = 0
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim())
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })

        try {
          const payload = {
            student_name: row.student_name,
            mobile: row.mobile,
            parent_name: row.parent_name || null,
            whatsapp: row.whatsapp || null,
            email: row.email || null,
            interested_course_id: row.course_id || null,
            source_id: row.source_id || null,
            remarks: row.remarks || null,
            followup_date: row.followup_date || null,
            branch_id: selectedBranch?.id || null,
            financial_year_id: selectedFinancialYear?.id || null,
          }
          await createMutation.mutateAsync(payload)
          successCount++
        } catch (err) {
          console.error(`Failed to import row ${i}:`, err)
        }
      }
      message.success(`Successfully imported ${successCount} inquiries`)
    }
    reader.readAsText(file)
    return false
  }

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
          fontFamily: fontBody,
        }}
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              style={{ fontFamily: fontBody, color: textColor, borderColor }}
            >
              Export CSV
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
              style={{ fontFamily: fontBody, color: textColor, borderColor }}
            >
              Import CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
                e.target.value = ''
              }}
            />
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search name or mobile"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
              size="middle"
              style={{ fontFamily: fontBody }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.status || undefined}
              onChange={(val) => setFilters({ ...filters, status: val })}
              size="middle"
            >
              <Option value="Contacted">Contacted</Option>
              <Option value="Demo Scheduled">Demo Scheduled</Option>
              <Option value="Demo Conducted">Demo Conducted</Option>
              <Option value="Converted">Converted</Option>
              <Option value="Lost">Lost</Option>
              <Option value="Rejected">Rejected</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Course"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.course_id || undefined}
              onChange={(val) => setFilters({ ...filters, course_id: val })}
              size="middle"
            >
              {courses?.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Source"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.source_id || undefined}
              onChange={(val) => setFilters({ ...filters, source_id: val })}
              size="middle"
            >
              {sources?.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0', borderColor }} />

        <Table
          dataSource={data?.data || []}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          size="middle"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.count || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
            size: 'small',
          }}
          style={{ backgroundColor: cardBg }}
        />
      </Card>
    </div>
  )
}

export default InquiryList