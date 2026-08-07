import { Row, Col, Card, Statistic, Typography, Table, Skeleton } from 'antd'
import {
  TeamOutlined,
  UserSwitchOutlined,
  DollarOutlined,
  BookOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'
import { useOutletContext } from 'react-router-dom'

const { Title, Text } = Typography

const StudentDashboard = () => {
  const { theme } = useTheme()
  const outletContext = useOutletContext()
  const { selectedBranch, selectedFinancialYear } = outletContext || {}

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  // Fetch branches – no deleted_at filter
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, branch_name')
      if (error) throw error
      return data || []
    },
    enabled: true,
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-dashboard-stats', selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('student_detail_view')
        .select(`
          student_id,
          admission_no,
          full_name_formatted,
          student_status,
          fee_status,
          course_name,
          branch_id,
          batch_name,
          joining_date,
          enrollment_date,
          financial_year_id
        `)

      if (selectedBranch?.id) {
        query = query.eq('branch_id', selectedBranch.id)
      }
      if (selectedFinancialYear?.id) {
        query = query.eq('financial_year_id', selectedFinancialYear.id)
      }

      const { data, error } = await query
      if (error) throw error
      if (!data || data.length === 0) return null

      const total = data.length
      const active = data.filter(s => s.student_status === 'active').length
      const feePending = data.filter(s => s.fee_status === 'Pending' || s.fee_status === 'Partially Paid').length
      const enrolled = data.filter(s => s.enrollment_date).length

      const feeMap = { Paid: 0, Pending: 0, 'Partially Paid': 0 }
      data.forEach(s => {
        if (feeMap[s.fee_status] !== undefined) feeMap[s.fee_status]++
      })
      const feePie = Object.entries(feeMap).map(([name, value]) => ({ name, value }))

      const courseMap = {}
      data.forEach(s => {
        const c = s.course_name || 'Unassigned'
        courseMap[c] = (courseMap[c] || 0) + 1
      })
      const courseBar = Object.entries(courseMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      const branchMap = {}
      data.forEach(s => {
        const branchName = branches?.find(b => b.id === s.branch_id)?.branch_name || 'No Branch'
        branchMap[branchName] = (branchMap[branchName] || 0) + 1
      })
      const branchTable = Object.entries(branchMap)
        .map(([name, count]) => ({ key: name, branch: name, students: count }))
        .sort((a, b) => b.students - a.students)

      const batchMap = {}
      data.forEach(s => {
        const ba = s.batch_name || 'Not Assigned'
        batchMap[ba] = (batchMap[ba] || 0) + 1
      })
      const batchTable = Object.entries(batchMap)
        .map(([name, count]) => ({ key: name, batch: name, students: count }))
        .sort((a, b) => b.students - a.students)

      const recentEnrollments = data
        .filter(s => s.enrollment_date)
        .sort((a, b) => new Date(b.enrollment_date) - new Date(a.enrollment_date))
        .slice(0, 5)
        .map((s, idx) => ({
          key: idx,
          admission_no: s.admission_no,
          student_name: s.full_name_formatted,
          course: s.course_name || '-',
          enrollment_date: s.enrollment_date,
        }))

      return { total, active, feePending, enrolled, feePie, courseBar, branchTable, batchTable, recentEnrollments }
    },
    enabled: !!branches,
  })

  if (isLoading || branchesLoading) return <Skeleton active />

  const statCards = [
    { title: 'Total Students', value: stats?.total, icon: <TeamOutlined />, color: '#1677ff' },
    { title: 'Active Students', value: stats?.active, icon: <UserSwitchOutlined />, color: '#52c41a' },
    { title: 'Fee Due', value: stats?.feePending, icon: <DollarOutlined />, color: '#ff4d4f' },
    { title: 'Enrolled', value: stats?.enrolled, icon: <BookOutlined />, color: '#722ed1' },
    { title: 'Attendance Avg', value: '—', icon: <PercentageOutlined />, color: '#fa8c16' },
  ]

  const recentColumns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: 'admission_no',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: 'student_name',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course</span>,
      dataIndex: 'course',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Enrollment Date</span>,
      dataIndex: 'enrollment_date',
      render: (v) => (
        <span style={{ color: primaryColor, fontFamily: fontBody }}>
          {v ? new Date(v).toLocaleDateString() : '-'}
        </span>
      ),
    },
  ]

  const branchColumns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Branch</span>,
      dataIndex: 'branch',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Students</span>,
      dataIndex: 'students',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
  ]

  const batchColumns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Batch</span>,
      dataIndex: 'batch',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Students</span>,
      dataIndex: 'students',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>,
    },
  ]

  return (
    <div style={{ fontFamily: fontBody }}>
      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {statCards.map(card => (
          <Col xs={24} sm={12} md={8} lg={4.8} key={card.title}>
            <Card
              bordered={false}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                textAlign: 'center',
                borderTop: `4px solid ${card.color}`,
              }}
            >
              <div style={{ fontSize: 28, color: card.color }}>{card.icon}</div>
              <Statistic
                title={<span style={{ fontFamily: fontBody }}>{card.title}</span>}
                value={card.value}
                valueStyle={{ color: primaryColor, fontFamily: fontHeading }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>Fee Status</Text>}
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats?.feePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {stats?.feePie?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#52c41a', '#ff4d4f', '#faad14'][index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>Course Distribution</Text>}
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.courseBar}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill={primaryColor} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Summary Tables */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card
            title={<Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>Branch‑wise Students</Text>}
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <Table
              dataSource={stats?.branchTable}
              columns={branchColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>Batch‑wise Students</Text>}
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <Table
              dataSource={stats?.batchTable}
              columns={batchColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Enrollments */}
      <Card
        title={<Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>Recent Enrollments</Text>}
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Table
          dataSource={stats?.recentEnrollments}
          columns={recentColumns}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

export default StudentDashboard