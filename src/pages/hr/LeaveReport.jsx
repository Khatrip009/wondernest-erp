// src/pages/hr/LeaveReport.jsx
import { useState } from 'react'
import {
  Table, Card, Button, DatePicker, Select, Space, Typography,
  Spin, Row, Col, Tag, message
} from 'antd'
import {
  DownloadOutlined, FilePdfOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { generateLeaveApplicationPdf } from '../../utils/leaveApplicationPdf'
import { exportLeaveReportPDF } from '../../utils/exportLeaveReportPDF'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const LeaveReport = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch, branches } = useScope()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ])
  const [statusFilter, setStatusFilter] = useState(null)
  const [teacherFilter, setTeacherFilter] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Teachers for filter dropdown
  const { data: teachers } = useQuery({
    queryKey: ['teachers-report', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data } = await query
      return data || []
    }
  })

  // Fetch leaves with filters
  const { data: leaves, isLoading } = useQuery({
    queryKey: ['leaves-report', selectedBranch?.id, dateRange, statusFilter, teacherFilter],
    queryFn: async () => {
      let query = supabase
        .from('leaves')
        .select('*, teachers!inner(first_name, last_name, employee_code, mobile, email)')
        .order('start_date', { ascending: false })

      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)

      if (dateRange && dateRange[0] && dateRange[1]) {
        query = query
          .gte('start_date', dateRange[0].format('YYYY-MM-DD'))
          .lte('end_date', dateRange[1].format('YYYY-MM-DD'))
      }

      if (statusFilter) query = query.eq('status', statusFilter)
      if (teacherFilter) query = query.eq('teacher_id', teacherFilter)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  // Generate PDF for one leave
  const handleGeneratePDF = async (leave) => {
    const teacher = leave.teachers;
    if (!teacher) {
      message.error('Teacher details not available');
      return;
    }

    const branchName = branches?.find(b => b.id === leave.branch_id)?.branch_name || 'Branch';

    const doc = await generateLeaveApplicationPdf(
      leave,
      teacher,
      { ...org, branches },
      {},
      theme
    );

    doc.save(`Leave_Application_${teacher.first_name}_${teacher.last_name}.pdf`);
    message.success('PDF generated');
  };

  // Export full report PDF
  const handleExportReportPDF = async () => {
    if (!leaves || leaves.length === 0) {
      message.warning('No leave data to export')
      return
    }
    setExporting(true)
    try {
      const branchName = selectedBranch?.branch_name || 'All Branches'
      const period = dateRange
        ? `${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`
        : ''

      await exportLeaveReportPDF(leaves, {
        org,
        theme,
        branchName,
        title: 'Leave Report',
        dateRange: period,
      })
      message.success('Report exported')
    } catch (err) {
      message.error(err.message)
    } finally {
      setExporting(false)
    }
  }

  // Export all leaves to CSV
  const handleExportAll = () => {
    if (!leaves || leaves.length === 0) {
      message.warning('No data to export')
      return
    }

    const csv = [
      ['Employee', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Remarks'].join(','),
      ...leaves.map(l => {
        const start = new Date(l.start_date)
        const end = new Date(l.end_date)
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
        return [
          l.teachers ? `${l.teachers.first_name} ${l.teachers.last_name}` : '',
          l.start_date,
          l.end_date,
          days,
          l.reason || '',
          l.status,
          l.admin_remarks || ''
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leaves_export_${dayjs().format('YYYY-MM-DD')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      title: 'Employee',
      render: (_, r) => r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '-'
    },
    { title: 'Start Date', dataIndex: 'start_date' },
    { title: 'End Date', dataIndex: 'end_date' },
    {
      title: 'Days',
      render: (_, r) => {
        const start = new Date(r.start_date)
        const end = new Date(r.end_date)
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      }
    },
    { title: 'Reason', dataIndex: 'reason' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: s => (
        <Tag color={s === 'Approved' ? 'green' : s === 'Rejected' ? 'red' : 'orange'}>
          {s}
        </Tag>
      )
    },
    {
      title: 'Action',
      render: (_, r) => (
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => handleGeneratePDF(r)}
        >
          PDF
        </Button>
      )
    }
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          borderTop: `4px solid ${primaryColor}`,
        }}
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Leave Report</span>}
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportReportPDF}
              loading={exporting}
              type="primary"
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Export PDF
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportAll}>
              Export CSV
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              allowClear={false}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="Pending">Pending</Option>
              <Option value="Approved">Approved</Option>
              <Option value="Rejected">Rejected</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Teacher"
              allowClear
              value={teacherFilter}
              onChange={setTeacherFilter}
              style={{ width: '100%' }}
            >
              {teachers?.map(t => (
                <Option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Table
          dataSource={leaves}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}

export default LeaveReport