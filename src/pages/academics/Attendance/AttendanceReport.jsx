import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, Table, Button, Space, DatePicker, Select, Row, Col, Tag, message } from 'antd'
import { DownloadOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'                              // ✅ fixed
import { useAttendanceReport } from '../../../hooks/useAcademics'             // ✅ fixed
import { useOrganization } from '../../../contexts/OrganizationContext'       // ✅ fixed
import { useTheme } from '../../../contexts/ThemeContext'                     // ✅ fixed
import { exportAttendanceReportPDF } from '../../../utils/exportAttendanceReportPDF'           // ✅ fixed
import { exportStudentAttendanceReportPDF } from '../../../utils/exportStudentAttendanceReportPDF' // ✅ new import
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const AttendanceReport = () => {
  const { org } = useOrganization()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [filters, setFilters] = useState({
    date_range: [dayjs().startOf('month'), dayjs().endOf('month')],
    batch_id: null,
    teacher_id: null,
  })

  const { data: batches } = useQuery({
    queryKey: ['batches-report', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('batches').select('id, batch_name').eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const { data: teachers } = useQuery({
    queryKey: ['teachers-report', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('teachers').select('id, first_name, last_name').eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const queryFilters = {
    date_from: filters.date_range?.[0]?.format('YYYY-MM-DD'),
    date_to: filters.date_range?.[1]?.format('YYYY-MM-DD'),
    batch_id: filters.batch_id || undefined,
    teacher_id: filters.teacher_id || undefined,
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  }

  const { data: reportData, isLoading, refetch } = useAttendanceReport(queryFilters)

  // Existing session‑wise export
  const handleSessionWiseExport = () => {
    if (!reportData || reportData.length === 0) {
      message.warning('No data to export')
      return
    }
    exportAttendanceReportPDF({
      reportData,
      organization: org || {},
      theme,
      branchName: selectedBranch?.branch_name || 'All Branches',
      dateRange: {
        from: filters.date_range?.[0]?.format('DD/MM/YYYY'),
        to: filters.date_range?.[1]?.format('DD/MM/YYYY'),
      },
    })
    message.success('Session‑wise PDF exported')
  }

  // ✅ New student‑wise export
  const handleStudentWiseExport = () => {
    if (!reportData || reportData.length === 0) {
      message.warning('No data to export')
      return
    }

    const records = []
    reportData.forEach(session => {
      const sessionStudents = session.students || []
      sessionStudents.forEach(s => {
        records.push({
          studentName: s.student?.full_name_formatted || 'Unknown',
          course: session.batches?.batch_name || session.batches?.courses?.name || '-',
          topic: session.topic_covered || '-',
          startTime: session.start_time ? dayjs(session.start_time, 'HH:mm:ss').format('HH:mm') : '-',
          endTime: session.end_time ? dayjs(session.end_time, 'HH:mm:ss').format('HH:mm') : '-',
          teacherName: session.teachers
            ? `${session.teachers.first_name} ${session.teachers.last_name}`
            : '-',
        })
      })
    })

    exportStudentAttendanceReportPDF({
      branchName: selectedBranch?.branch_name || 'All Branches',
      date: `${filters.date_range?.[0]?.format('DD/MM/YYYY')} – ${filters.date_range?.[1]?.format('DD/MM/YYYY')}`,
      records,
      organization: org || {},
      theme,
    })
    message.success('Student‑wise PDF exported')
  }

  // Summary columns (unchanged)
  const summaryColumns = [
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Date</span>,
      dataIndex: 'attendance_date',
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Batch</span>,
      dataIndex: ['batches', 'batch_name'],
      render: (text) => <span style={{ fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Course</span>,
      render: (_, record) => record.batches?.courses?.name || '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Topic</span>,
      dataIndex: 'topic_covered',
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Teacher</span>,
      render: (_, record) => record.teachers ? `${record.teachers.first_name} ${record.teachers.last_name}` : '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Total</span>,
      dataIndex: 'total_students',
      align: 'center',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Present</span>,
      dataIndex: 'present_count',
      align: 'center',
      render: (v) => <Tag color="green">{v}</Tag>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Absent</span>,
      dataIndex: 'absent_count',
      align: 'center',
      render: (v) => <Tag color="red">{v}</Tag>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Late</span>,
      dataIndex: 'late_count',
      align: 'center',
      render: (v) => <Tag color="orange">{v}</Tag>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Excused</span>,
      dataIndex: 'excused_count',
      align: 'center',
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Attendance %</span>,
      dataIndex: 'attendance_percentage',
      align: 'center',
      render: (v) => <span style={{ fontWeight: 'bold' }}>{v}%</span>,
    },
  ]

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <RangePicker
            style={{ width: '100%' }}
            value={filters.date_range}
            onChange={(dates) => setFilters({ ...filters, date_range: dates })}
          />
        </Col>
        <Col xs={24} sm={4}>
          <Select
            placeholder="Batch"
            allowClear
            style={{ width: '100%' }}
            value={filters.batch_id || undefined}
            onChange={(val) => setFilters({ ...filters, batch_id: val })}
          >
            {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={4}>
          <Select
            placeholder="Teacher"
            allowClear
            style={{ width: '100%' }}
            value={filters.teacher_id || undefined}
            onChange={(val) => setFilters({ ...filters, teacher_id: val })}
          >
            {teachers?.map(t => <Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={8}>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            <Button icon={<ClearOutlined />} onClick={() => setFilters({
              date_range: [dayjs().startOf('month'), dayjs().endOf('month')],
              batch_id: null,
              teacher_id: null,
            })}>Clear</Button>
            {/* Session‑wise export */}
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleSessionWiseExport}>
              Export Session‑wise
            </Button>
            {/* ✅ Student‑wise export */}
            <Button icon={<DownloadOutlined />} onClick={handleStudentWiseExport}>
              Export Student‑wise
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={reportData || []}
        columns={summaryColumns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} sessions` }}
        size="middle"
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '0 16px' }}>
              <h5>Student List</h5>
              <Table
                dataSource={record.students || []}
                columns={[
                  { title: 'Admission No', dataIndex: ['student', 'admission_no'], width: 120 },
                  { title: 'Student Name', dataIndex: ['student', 'full_name_formatted'] },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    render: (s) => {
                      const color = s === 'present' ? 'green' : s === 'late' ? 'orange' : s === 'excused' ? 'blue' : 'red'
                      return <Tag color={color}>{s || 'absent'}</Tag>
                    },
                  },
                  { title: 'Remarks', dataIndex: 'remarks', render: (r) => r || '-' },
                ]}
                rowKey="student_id"
                pagination={false}
                size="small"
              />
            </div>
          ),
        }}
      />
    </Card>
  )
}

export default AttendanceReport