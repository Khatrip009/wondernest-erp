import { useState } from 'react'
import { Table, Card, Button, Typography, Spin, Alert, message, Row, Col, Select, DatePicker } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportFeeBalancePDF } from '../../utils/exportFeeBalancePDF'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker

const StudentFeeBalance = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear, branches, financialYears } = useScope()
  const { org } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const branchName = branches?.find(b => b.id === selectedBranch?.id)?.branch_name || ''
  const financialYearName = financialYears?.find(fy => fy.id === selectedFinancialYear?.id)?.name || ''

  // Filters
  const [courseId, setCourseId] = useState(null)
  const [batchId, setBatchId] = useState(null)
  const [dateRange, setDateRange] = useState(null) // [dayjs, dayjs]

  // ✅ Fetch courses (removed non-existent parent_id filter)
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-balance', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('organization_id', org.id)
        .eq('status', true)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  // Fetch batches (branch-scoped)
  const { data: batches = [] } = useQuery({
    queryKey: ['batches-balance', selectedBranch?.id],
    queryFn: async () => {
      if (!selectedBranch?.id) return []
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('branch_id', selectedBranch.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('batch_name')
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-fee-balances', selectedBranch?.id, selectedFinancialYear?.id, courseId, batchId, dateRange],
    queryFn: async () => {
      // 1. Build base query for student_fees with student join
      let feesQuery = supabase
        .from('student_fees')
        .select(`
          id,
          student_id,
          total_fee,
          discount,
          final_fee,
          due_date,
          branch_id,
          financial_year_id,
          students!student_fees_student_id_fkey (
            id,
            full_name_formatted,
            admission_no,
            mobile,
            course_id
          )
        `)
        .is('deleted_at', null)

      if (selectedBranch?.id) feesQuery = feesQuery.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) feesQuery = feesQuery.eq('financial_year_id', selectedFinancialYear.id)

      // Date range filter on due_date
      if (dateRange && dateRange[0] && dateRange[1]) {
        feesQuery = feesQuery
          .gte('due_date', dateRange[0].format('YYYY-MM-DD'))
          .lte('due_date', dateRange[1].format('YYYY-MM-DD'))
      }

      // Course filter – get student IDs first
      if (courseId) {
        const { data: courseStudents } = await supabase
          .from('students')
          .select('id')
          .eq('course_id', courseId)
          .is('deleted_at', null)
        const studentIds = courseStudents?.map(s => s.id) || []
        if (studentIds.length === 0) return [] // no students, so no fees
        feesQuery = feesQuery.in('student_id', studentIds)
      }

      // Batch filter – get student IDs from enrollments
      if (batchId) {
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .eq('batch_id', batchId)
          .eq('status', 'active')
          .is('deleted_at', null)
        const studentIds = enrollments?.map(e => e.student_id) || []
        if (studentIds.length === 0) return []
        feesQuery = feesQuery.in('student_id', studentIds)
      }

      const { data: fees, error: feesError } = await feesQuery
      if (feesError) throw feesError
      if (!fees || fees.length === 0) return []

      const feeIds = fees.map(f => f.id)
      const { data: payments, error: payError } = await supabase
        .from('fee_payments')
        .select('student_fee_id, amount')
        .in('student_fee_id', feeIds)
        .is('deleted_at', null)

      if (payError) throw payError

      const studentMap = {}
      fees.forEach(f => {
        const sid = f.student_id
        if (!studentMap[sid]) {
          studentMap[sid] = {
            student_id: sid,
            admission_no: f.students?.admission_no || '',
            student_name: f.students?.full_name_formatted || '',
            mobile: f.students?.mobile || '',
            total_fee: 0,
            paid: 0,
            discount: 0,
          }
        }
        studentMap[sid].total_fee += Number(f.total_fee || 0)
        studentMap[sid].discount += Number(f.discount || 0)
      })

      payments.forEach(p => {
        const fee = fees.find(f => f.id === p.student_fee_id)
        if (fee && studentMap[fee.student_id]) {
          studentMap[fee.student_id].paid += Number(p.amount || 0)
        }
      })

      return Object.values(studentMap).map(s => ({
        ...s,
        balance: s.total_fee - s.paid - s.discount,
      }))
    },
    enabled: true,
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: 'admission_no',
      render: (t) => <span style={{ fontFamily: fontBody, color: textColor }}>{t}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'student_name',
      render: (t) => <span style={{ fontFamily: fontBody, color: textColor }}>{t}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Mobile</span>,
      dataIndex: 'mobile',
      render: (t) => <span style={{ fontFamily: fontBody, color: textColor }}>{t}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Total Fees</span>,
      dataIndex: 'total_fee',
      render: (v) => <span style={{ fontFamily: fontBody, color: textColor }}>Rs. {(v ?? 0).toLocaleString('en-IN')}</span>,
      align: 'right',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Paid</span>,
      dataIndex: 'paid',
      render: (v) => <span style={{ fontFamily: fontBody, color: textColor }}>Rs. {(v ?? 0).toLocaleString('en-IN')}</span>,
      align: 'right',
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Balance</span>,
      dataIndex: 'balance',
      render: (v) => (
        <span style={{ fontFamily: fontBody, color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: v > 0 ? 'bold' : 'normal' }}>
          Rs. {(v ?? 0).toLocaleString('en-IN')}
        </span>
      ),
      align: 'right',
    },
  ]

  const handleExportPDF = () => {
    if (!data || data.length === 0) {
      message.warning('No data to export')
      return
    }

    const courseName = courses.find(c => c.id === courseId)?.name || ''
    const batchName = batches.find(b => b.id === batchId)?.batch_name || ''

    exportFeeBalancePDF(data, org, theme, {
      branchName,
      financialYearName,
      courseName,
      batchName,
      startDate: dateRange?.[0]?.format('DD/MM/YYYY'),
      endDate: dateRange?.[1]?.format('DD/MM/YYYY'),
    })
  }

  if (isLoading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }} />
  if (error) return <Alert message="Error" description={error.message} type="error" showIcon />

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8, fontFamily: fontBody }}>
      <Card
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Student Fee Balances</Title>}
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleExportPDF} style={{ fontFamily: fontBody }}>
            Export PDF
          </Button>
        }
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        {/* Filters row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Select Course"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={courseId}
              onChange={setCourseId}
            >
              {courses.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Select Batch"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={batchId}
              onChange={setBatchId}
            >
              {batches.map(b => <Select.Option key={b.id} value={b.id}>{b.batch_name}</Select.Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              format="DD/MM/YYYY"
              allowClear
            />
          </Col>
        </Row>

        <Table
          dataSource={data}
          columns={columns}
          rowKey="student_id"
          pagination={{ pageSize: 20, size: 'small' }}
          size="middle"
          locale={{ emptyText: 'No fee records found for the selected filters.' }}
        />
      </Card>
    </div>
  )
}

export default StudentFeeBalance