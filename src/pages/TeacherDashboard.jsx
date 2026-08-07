// src/pages/TeacherDashboard.jsx
import { useQuery } from '@tanstack/react-query'
import {
  Tabs, Card, Statistic, Row, Col, Table, Tag, Button, Space, Typography, Spin
} from 'antd'
import {
  BookOutlined, TeamOutlined, CalendarOutlined, DollarOutlined,
  FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  UserOutlined, ArrowRightOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const { Title, Text } = Typography

const TeacherDashboard = () => {
  const { user } = useAuth()
  const { theme, darkMode } = useTheme()
  const navigate = useNavigate()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const subTextColor = darkMode ? '#aaa' : '#666'

  // Fetch teacher record
  const { data: teacher } = useQuery({
    queryKey: ['teacher-me', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, employee_code, department, email, mobile, monthly_salary')
        .eq('user_id', user.id)
        .maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  const teacherId = teacher?.id

  // Batches
  const { data: myBatches } = useQuery({
    queryKey: ['teacher-batches', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data: direct } = await supabase.from('batches').select('*, courses(name)').eq('teacher_id', teacherId).eq('status', 'active')
      const { data: via } = await supabase.from('teacher_batches').select('batch_id, batches!inner(*, courses(name))').eq('teacher_id', teacherId)
      const viaBatches = via?.map(r => r.batches) || []
      return [...(direct || []), ...viaBatches].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    },
    enabled: !!teacherId,
  })

  // My attendance this month
  const { data: myAttendance } = useQuery({
    queryKey: ['teacher-attendance', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('attendance_date', dayjs().startOf('month').format('YYYY-MM-DD'))
        .lte('attendance_date', dayjs().endOf('month').format('YYYY-MM-DD'))
      return data || []
    },
    enabled: !!teacherId,
  })

  // Recent homework
  const { data: recentHomework } = useQuery({
    queryKey: ['teacher-homework-recent', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data } = await supabase.from('homework').select('*, batches(batch_name)').eq('created_by', teacherId).order('due_date', { ascending: false }).limit(5)
      return data || []
    },
    enabled: !!teacherId,
  })

  // Exams
  const { data: upcomingExams } = useQuery({
   queryKey: ['teacher-exams-all', teacherId, myBatches?.length],
  queryFn: async () => {
    if (!teacherId || !myBatches?.length) return []
    const batchIds = myBatches.map(b => b.id)
    const { data } = await supabase
      .from('exams')
      .select('*, batches(batch_name)')
      .in('batch_id', batchIds)
      .order('exam_date', { ascending: false })   // latest first
    return data || []
  },
  enabled: !!teacherId && myBatches?.length > 0,
})

  // Leaves
  const { data: recentLeaves } = useQuery({
    queryKey: ['teacher-leaves-recent', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data } = await supabase.from('leaves').select('*').eq('teacher_id', teacherId).order('start_date', { ascending: false }).limit(5)
      return data || []
    },
    enabled: !!teacherId,
  })

  // Salary
  const { data: recentSalary } = useQuery({
    queryKey: ['teacher-salary-recent', teacherId],
    queryFn: async () => {
      if (!teacherId) return null
      const { data } = await supabase.from('salary_payments').select('*').eq('teacher_id', teacherId).order('payment_date', { ascending: false }).limit(1).maybeSingle()
      return data
    },
    enabled: !!teacherId,
  })

  const statusColor = (status) => {
    const map = { present: 'green', absent: 'red', leave: 'orange', half_day: 'blue', Approved: 'green', Pending: 'orange', Rejected: 'red' }
    return map[status] || 'default'
  }

  const formatTime = (t) => t ? dayjs(t, 'HH:mm:ss').format('hh:mm A') : '—'

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}><Card><Statistic title="My Batches" value={myBatches?.length || 0} prefix={<BookOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8}><Card><Statistic title="Attendance (Month)" value={`${myAttendance?.filter(a => a.status === 'present' || a.status === 'checked_out').length || 0}/${myAttendance?.length || 0}`} prefix={<CheckCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8}><Card><Statistic title="Pending Homework" value={recentHomework?.filter(h => dayjs(h.due_date).isAfter(dayjs())).length || 0} prefix={<FileTextOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8}><Card><Statistic title="Upcoming Exams" value={upcomingExams?.length || 0} prefix={<CalendarOutlined />} /></Card></Col>
          <Col xs={24} sm={12} md={8}><Card><Statistic title="Leaves This Month" value={recentLeaves?.filter(l => dayjs(l.start_date).isSame(dayjs(), 'month')).length || 0} prefix={<ClockCircleOutlined />} /></Card></Col>
        </Row>
      )
    },
    {
      key: 'batches',
      label: 'My Batches',
      children: (
        <>
          <Table
            dataSource={myBatches}
            rowKey="id"
            columns={[
              { title: 'Batch', dataIndex: 'batch_name' },
              { title: 'Course', dataIndex: ['courses', 'name'] },
              { title: 'Schedule', render: (_, r) => `${r.days} ${formatTime(r.start_time)} - ${formatTime(r.end_time)}` },
            ]}
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 16 }}>
            <Button type="primary" ghost onClick={() => navigate('/teacher/batches')}>
              View All Batches <ArrowRightOutlined />
            </Button>
          </div>
        </>
      )
    },
    {
      key: 'attendance',
      label: 'My Attendance',
      children: (
        <>
          <Table
            dataSource={myAttendance}
            rowKey="id"
            columns={[
              { title: 'Date', dataIndex: 'attendance_date', render: d => dayjs(d).format('DD/MM/YYYY') },
              { title: 'Status', dataIndex: 'status', render: s => <Tag color={statusColor(s)}>{s}</Tag> },
              { title: 'Check In', dataIndex: 'check_in', render: t => t ? dayjs(t).format('hh:mm A') : '—' },
            ]}
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 16 }}>
            <Button type="primary" ghost onClick={() => navigate('/teacher/attendance')}>
              Take Attendance <ArrowRightOutlined />
            </Button>
          </div>
        </>
      )
    },
    {
      key: 'student-attendance',
      label: 'Student Attendance',
      children: (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Text type="secondary">Manage student attendance for your batches.</Text>
          <br /><br />
          <Button type="primary" onClick={() => navigate('/teacher/attendance')}>
            Take Student Attendance
          </Button>
        </div>
      )
    },
    {
      key: 'homework',
      label: 'Homework',
      children: (
        <>
          <Table
            dataSource={recentHomework}
            rowKey="id"
            columns={[
              { title: 'Title', dataIndex: 'title' },
              { title: 'Batch', dataIndex: ['batches', 'batch_name'] },
              { title: 'Due', dataIndex: 'due_date', render: d => dayjs(d).format('DD/MM/YYYY') },
            ]}
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 16 }}>
            <Button type="primary" ghost onClick={() => navigate('/teacher/homework')}>
              Manage Homework <ArrowRightOutlined />
            </Button>
          </div>
        </>
      )
    },
    {
      key: 'exams',
      label: 'Exams',
      children: (
        <>
          <Table
            dataSource={upcomingExams}
            rowKey="id"
            columns={[
              { title: 'Exam', dataIndex: 'exam_name' },
              { title: 'Batch', dataIndex: ['batches', 'batch_name'] },
              { title: 'Date', dataIndex: 'exam_date', render: d => dayjs(d).format('DD/MM/YYYY') },
            ]}
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 16 }}>
            <Button type="primary" ghost onClick={() => navigate('/teacher/exams')}>
              View All Exams <ArrowRightOutlined />
            </Button>
          </div>
        </>
      )
    },
    {
      key: 'leaves',
      label: 'Leaves',
      children: (
        <>
          <Table
            dataSource={recentLeaves}
            rowKey="id"
            columns={[
              { title: 'Start', dataIndex: 'start_date', render: d => dayjs(d).format('DD/MM/YYYY') },
              { title: 'End', dataIndex: 'end_date', render: d => dayjs(d).format('DD/MM/YYYY') },
              { title: 'Status', dataIndex: 'status', render: s => <Tag color={statusColor(s)}>{s}</Tag> },
            ]}
            pagination={false}
            size="small"
          />
          <div style={{ marginTop: 16 }}>
            <Space>
              <Button type="primary" onClick={() => navigate('/teacher/leaves')}>
                Apply for Leave
              </Button>
              <Button onClick={() => navigate('/teacher/leaves')}>
                View All Leaves
              </Button>
            </Space>
          </div>
        </>
      )
    },
    {
      key: 'salary',
      label: 'Salary',
      children: (
        <>
          {recentSalary ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Statistic title="Last Payment" value={`₹${recentSalary.net_amount?.toLocaleString() || recentSalary.amount?.toLocaleString()}`} />
              <Text type="secondary">{dayjs(recentSalary.payment_date).format('DD/MM/YYYY')}</Text>
              <br /><br />
              <Button type="primary" onClick={() => navigate('/teacher/salary')}>
                View Salary History & Payslips
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Text type="secondary">No salary payments yet.</Text>
              <br /><br />
              <Button onClick={() => navigate('/teacher/salary')}>View Salary Page</Button>
            </div>
          )}
        </>
      )
    },
    {
      key: 'profile',
      label: 'My Profile',
      children: (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Text>Name: {teacher?.first_name} {teacher?.last_name}</Text><br />
          <Text>Code: {teacher?.employee_code}</Text><br />
          <Text>Monthly Salary: ₹{teacher?.monthly_salary?.toLocaleString()}</Text><br /><br />
          <Button type="primary" onClick={() => navigate('/teacher/profile')}>
            Edit Profile
          </Button>
        </div>
      )
    },
  ]

  if (!teacher) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }} />

  return (
    <div style={{ padding: 24, fontFamily: fontBody }}>
      <Card style={{ marginBottom: 24, borderTop: `4px solid ${primaryColor}` }}>
        <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
          Welcome, {teacher.first_name}!
        </Title>
        <Text style={{ color: subTextColor }}>{teacher.employee_code} • {teacher.department}</Text>
      </Card>
      <Tabs defaultActiveKey="overview" items={tabItems} />
    </div>
  )
}

export default TeacherDashboard