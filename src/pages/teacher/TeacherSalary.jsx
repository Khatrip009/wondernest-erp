// src/pages/teacher/TeacherSalary.jsx
import { Card, Table, Button, Space, Tag, message } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportSalarySlipPDF } from '../../utils/exportSalarySlipPDF'
import dayjs from 'dayjs'

const TeacherSalary = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'

  // Fetch full teacher record (needed for salary slip)
  const { data: teacher } = useQuery({
    queryKey: ['teacher-me', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teachers').select('*').eq('user_id', user.id).maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  const teacherId = teacher?.id

  // Fetch salary payments for this teacher
  const { data: salaries, isLoading } = useQuery({
    queryKey: ['teacher-salaries', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId,
  })

  // Helper to compute working days / attendance for a given month
  const fetchAttendanceDetails = async (paymentDate) => {
    if (!teacherId) return null

    const monthStart = dayjs(paymentDate).startOf('month').format('YYYY-MM-DD')
    const monthEnd = dayjs(paymentDate).endOf('month').format('YYYY-MM-DD')

    // Fetch attendance
    const { data: attendance, error: attErr } = await supabase
      .from('teacher_attendance')
      .select('*')
      .eq('teacher_id', teacherId)
      .gte('attendance_date', monthStart)
      .lte('attendance_date', monthEnd)
    if (attErr) throw attErr

    // Fetch approved leaves
    const { data: leaves, error: leaveErr } = await supabase
      .from('leaves')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('status', 'Approved')
      .gte('start_date', monthStart)
      .lte('end_date', monthEnd)
    if (leaveErr) throw leaveErr

    // Calculate total working days (excluding Sundays) in the month
    let totalWorkingDays = 0
    let current = dayjs(paymentDate).startOf('month')
    while (current.isBefore(dayjs(paymentDate).endOf('month')) || current.isSame(dayjs(paymentDate).endOf('month'), 'day')) {
      if (current.day() !== 0) totalWorkingDays++  // 0 = Sunday
      current = current.add(1, 'day')
    }

    // Calculate leave days (count weekdays in leave range)
    let leaveDays = 0
    leaves?.forEach(leave => {
      let d = dayjs(leave.start_date)
      const end = dayjs(leave.end_date)
      while (d.isBefore(end) || d.isSame(end, 'day')) {
        if (d.day() !== 0) leaveDays++
        d = d.add(1, 'day')
      }
    })

    // Attendance counts
    const absentCount = attendance?.filter(a => a.status === 'absent').length || 0
    const halfDayCount = attendance?.filter(a => a.status === 'half_day').length || 0
    // Present days = total working days - absent - half*0.5 - leaveDays (simplified)
    const presentDays = Math.max(0, totalWorkingDays - absentCount - leaveDays - halfDayCount * 0.5)

    return {
      workingDays: totalWorkingDays,
      holidays: 0, // You could fetch holidays from a table if available
      absentCount,
      halfDayCount,
      presentDays,
      leaveDays,
      lectureCount: attendance?.length || 0, // for lecture-based
      demoCount: 0, // if needed, fetch from demo_sessions
    }
  }

  const handleDownloadSlip = async (record) => {
    if (!teacher) {
      message.error('Teacher details not available')
      return
    }

    try {
      // Fetch attendance details for the salary month
      const attDetails = await fetchAttendanceDetails(record.payment_date)

      const salaryData = {
        month: dayjs(record.payment_date).format('MMMM YYYY'),
        workingDays: attDetails?.workingDays ?? null,
        holidays: attDetails?.holidays ?? null,
        absentCount: attDetails?.absentCount ?? 0,
        halfDayCount: attDetails?.halfDayCount ?? 0,
        presentDays: attDetails?.presentDays ?? null,
        leaveDays: attDetails?.leaveDays ?? 0,
        lectureCount: attDetails?.lectureCount ?? 0,
        demoCount: attDetails?.demoCount ?? 0,
        gross: record.amount || 0,
        tds: record.tds_amount || 0,
        net: record.net_amount || record.amount || 0,
        payment_mode: record.payment_mode || 'N/A',
        payment_date: dayjs(record.payment_date).format('DD/MM/YYYY'),
        amountInWords: `Rupees ${Number(record.net_amount || record.amount || 0).toLocaleString('en-IN')} Only`,
      }

      exportSalarySlipPDF(teacher, salaryData, org, theme)
      message.success('Salary slip downloaded')
    } catch (err) {
      console.error(err)
      message.error('Failed to generate PDF')
    }
  }

  const columns = [
    { title: 'Payment Date', dataIndex: 'payment_date', render: d => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Gross', dataIndex: 'amount', render: v => `₹${Number(v).toLocaleString()}` },
    { title: 'TDS', dataIndex: 'tds_amount', render: v => `₹${Number(v || 0).toLocaleString()}` },
    { title: 'Net', dataIndex: 'net_amount', render: v => `₹${Number(v || 0).toLocaleString()}` },
    { title: 'Mode', dataIndex: 'payment_mode' },
    {
      title: 'Action',
      render: (_, record) => (
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => handleDownloadSlip(record)}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          PDF
        </Button>
      ),
    },
  ]

  return (
    <Card title={<span style={{ color: primaryColor }}>My Salary History</span>} bordered={false}>
      <Table dataSource={salaries} columns={columns} rowKey="id" loading={isLoading} />
    </Card>
  )
}

export default TeacherSalary