// src/pages/hr/AttendanceReport.jsx
import { useState } from 'react'
import {
  Table, Card, DatePicker, Button, Space, Row, Col,
  Statistic, Typography, message, Tag
} from 'antd'
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportAttendancePDF } from '../../utils/exportAttendancePDF'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Title } = Typography

const AttendanceReport = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch } = useScope()
  const { org } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [dailyDate, setDailyDate] = useState(dayjs())
  const [monthlyMonth, setMonthlyMonth] = useState(dayjs())
  const [exporting, setExporting] = useState(false)

  // Fetch data for the table
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance-report', dateRange[0]?.format('YYYY-MM-DD'), dateRange[1]?.format('YYYY-MM-DD'), selectedBranch?.id],
    queryFn: async () => {
      const fromDate = dateRange[0].format('YYYY-MM-DD')
      const toDate = dateRange[1].format('YYYY-MM-DD')

      let query = supabase
        .from('teacher_attendance')
        .select(`
          id,
          attendance_date,
          check_in,
          check_out,
          status,
          teacher_id,
          teachers ( first_name, last_name )
        `)
        .gte('attendance_date', fromDate)
        .lte('attendance_date', toDate)
        .order('attendance_date', { ascending: true })
        .order('check_in', { ascending: true })

      if (selectedBranch?.id) {
        query = query.eq('branch_id', selectedBranch.id)
      } else if (org?.id) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .eq('organization_id', org.id)
        const branchIds = (branches || []).map(b => b.id)
        if (branchIds.length > 0) {
          query = query.or(`branch_id.in.(${branchIds.join(',')}),branch_id.is.null`)
        } else {
          query = query.is('branch_id', null)
        }
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!dateRange,
  })

  // Helpers
  const calculateWorkHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null
    const start = dayjs(checkIn)
    const end = dayjs(checkOut)
    const diffMinutes = end.diff(start, 'minute')
    return diffMinutes > 0 ? diffMinutes : 0
  }

  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins.toString().padStart(2, '0')}m`
  }

  // ==============================
  //  EXPORT FUNCTIONS
  // ==============================

  const exportDailyPDF = async () => {
    if (!dailyDate) return
    setExporting(true)
    try {
      const d = dailyDate.format('YYYY-MM-DD')
      let query = supabase
        .from('teacher_attendance')
        .select(`id, attendance_date, check_in, check_out, status, teacher_id, teachers(first_name, last_name)`)
        .eq('attendance_date', d)
        .order('check_in', { ascending: true })

      if (selectedBranch?.id) {
        query = query.eq('branch_id', selectedBranch.id)
      } else if (org?.id) {
        const { data: branches } = await supabase.from('branches').select('id').eq('organization_id', org.id)
        const branchIds = (branches || []).map(b => b.id)
        if (branchIds.length > 0) query = query.or(`branch_id.in.(${branchIds.join(',')}),branch_id.is.null`)
        else query = query.is('branch_id', null)
      }
      const { data: dailyData, error } = await query
      if (error) throw error
      if (!dailyData || dailyData.length === 0) {
        message.warning('No attendance records for the selected date.')
        return
      }

      await exportAttendancePDF(dailyData, {
        org,
        theme,
        branchName: selectedBranch?.branch_name || 'All Branches',
        title: `Daily Attendance – ${d}`,
        isDaily: true,
      })
    } catch (err) {
      message.error(err.message)
    } finally {
      setExporting(false)
    }
  }

  const exportMonthlyPDF = async () => {
    if (!monthlyMonth) return
    setExporting(true)
    try {
      const start = monthlyMonth.startOf('month').format('YYYY-MM-DD')
      const end = monthlyMonth.endOf('month').format('YYYY-MM-DD')
      let query = supabase
        .from('teacher_attendance')
        .select(`id, attendance_date, check_in, check_out, status, teacher_id, teachers(first_name, last_name)`)
        .gte('attendance_date', start)
        .lte('attendance_date', end)
        .order('attendance_date', { ascending: true })
        .order('check_in', { ascending: true })

      if (selectedBranch?.id) {
        query = query.eq('branch_id', selectedBranch.id)
      } else if (org?.id) {
        const { data: branches } = await supabase.from('branches').select('id').eq('organization_id', org.id)
        const branchIds = (branches || []).map(b => b.id)
        if (branchIds.length > 0) query = query.or(`branch_id.in.(${branchIds.join(',')}),branch_id.is.null`)
        else query = query.is('branch_id', null)
      }
      const { data: monthlyData, error } = await query
      if (error) throw error
      if (!monthlyData || monthlyData.length === 0) {
        message.warning('No attendance records for the selected month.')
        return
      }

      await exportAttendancePDF(monthlyData, {
        org,
        theme,
        branchName: selectedBranch?.branch_name || 'All Branches',
        title: `Monthly Attendance – ${monthlyMonth.format('MMMM YYYY')}`,
        isDaily: false,
      })
    } catch (err) {
      message.error(err.message)
    } finally {
      setExporting(false)
    }
  }

  // ==============================
  // TABLE DATA
  // ==============================
  const tableData = (data || []).map(record => {
    const teacher = record.teachers
    const workMinutes = calculateWorkHours(record.check_in, record.check_out)
    return {
      key: record.id,
      date: record.attendance_date,
      teacher: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown',
      check_in: record.check_in ? dayjs(record.check_in).format('DD/MM/YYYY HH:mm') : '-',
      check_out: record.check_out ? dayjs(record.check_out).format('DD/MM/YYYY HH:mm') : '-',
      status: record.status,
      work_duration: workMinutes,
      work_duration_formatted: formatDuration(workMinutes),
    }
  })

  const totalRecords = tableData.length
  const presentCount = tableData.filter(r => r.status === 'present' || r.status === 'checked_out').length
  const absentCount = tableData.filter(r => r.status === 'absent').length
  const halfDayCount = tableData.filter(r => r.status === 'half_day').length
  const leaveCount = tableData.filter(r => r.status === 'leave').length
  const totalWorkMinutes = tableData.reduce((sum, r) => sum + (r.work_duration || 0), 0)
  const avgWorkMinutes = presentCount > 0 ? totalWorkMinutes / presentCount : 0

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Date</span>,
      dataIndex: 'date',
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Teacher</span>,
      dataIndex: 'teacher',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Check‑in</span>,
      dataIndex: 'check_in',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Check‑out</span>,
      dataIndex: 'check_out',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      render: (s) => {
        const colorMap = {
          present: 'green',
          checked_out: 'blue',
          absent: 'red',
          half_day: 'orange',
          leave: 'purple',
        }
        return <Tag color={colorMap[s] || 'default'}>{s}</Tag>
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Work Hours</span>,
      dataIndex: 'work_duration_formatted',
      sorter: (a, b) => (a.work_duration || 0) - (b.work_duration || 0),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Daily Attendance Report</Title>}
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates || [dayjs().startOf('month'), dayjs()])}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
          </Space>
        }
      >
        {/* Export buttons */}
        <Space style={{ marginBottom: 16 }}>
          <DatePicker value={dailyDate} onChange={setDailyDate} format="DD/MM/YYYY" />
          <Button
            icon={<DownloadOutlined />}
            onClick={exportDailyPDF}
            loading={exporting}
            type="primary"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Export Daily PDF
          </Button>
          <DatePicker picker="month" value={monthlyMonth} onChange={setMonthlyMonth} format="MM/YYYY" />
          <Button
            icon={<DownloadOutlined />}
            onClick={exportMonthlyPDF}
            loading={exporting}
            type="primary"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Export Monthly PDF
          </Button>
        </Space>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6} lg={3}>
            <Statistic title="Total Records" value={totalRecords} valueStyle={{ color: primaryColor }} />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic title="Present" value={presentCount} valueStyle={{ color: 'green' }} />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic title="Absent" value={absentCount} valueStyle={{ color: 'red' }} />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic title="Half Day" value={halfDayCount} valueStyle={{ color: 'orange' }} />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic title="Leave" value={leaveCount} valueStyle={{ color: 'purple' }} />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic
              title="Total Work Hours"
              value={formatDuration(totalWorkMinutes)}
              valueStyle={{ color: primaryColor }}
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic
              title="Avg Work Hours"
              value={formatDuration(avgWorkMinutes)}
              valueStyle={{ color: primaryColor }}
            />
          </Col>
        </Row>

        <Table
          dataSource={tableData}
          columns={columns}
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  )
}

export default AttendanceReport