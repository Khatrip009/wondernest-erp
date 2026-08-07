// src/pages/hr/SalaryCalculation.jsx
import { useState } from 'react'
import {
  Card, Table, Button, DatePicker, Typography, Spin, Tag,
  Space, Row, Col, message, Modal, Form, Select, Input, Descriptions
} from 'antd'
import {
  DollarOutlined, CalculatorOutlined, FilePdfOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useEmployees, usePaySalary } from '../../hooks/useHR'
import { exportSalarySlipPDF } from '../../utils/exportSalarySlipPDF'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const SalaryCalculation = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [month, setMonth] = useState(dayjs())
  const [holidays, setHolidays] = useState([])
  const [calculated, setCalculated] = useState([])

  const { data: employees, isLoading: empLoading } = useEmployees(selectedBranch?.id)
  const payMutation = usePaySalary()

  const safeMonth = month || dayjs()
  const startOfMonth = safeMonth.startOf('month').format('YYYY-MM-DD')
  const endOfMonth = safeMonth.endOf('month').format('YYYY-MM-DD')

  // ── Teacher Attendance (teacher_attendance) ──
  const { data: attendance, isLoading: attLoading } = useQuery({
    queryKey: ['teacher-attendance', selectedBranch?.id, startOfMonth, endOfMonth],
    queryFn: async () => {
      let query = supabase
        .from('teacher_attendance')
        .select('*')
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  // ── Demos ──
  const { data: demos, isLoading: demosLoading } = useQuery({
    queryKey: ['teacher-demos', selectedBranch?.id, startOfMonth, endOfMonth],
    queryFn: async () => {
      let query = supabase
        .from('demo_sessions')
        .select('id, teacher_id, conducted_at')
        .eq('status', 'Conducted')
        .gte('conducted_at', startOfMonth)
        .lte('conducted_at', endOfMonth)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  // ── Leaves ──
  const { data: leaves, isLoading: leavesLoading } = useQuery({
    queryKey: ['teacher-leaves', selectedBranch?.id, startOfMonth, endOfMonth],
    queryFn: async () => {
      let query = supabase
        .from('leaves')
        .select('*')
        .eq('status', 'Approved')
        .gte('start_date', startOfMonth)
        .lte('end_date', endOfMonth)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  // ✅ NEW: Student attendance sessions (each session = one lecture)
  const { data: studentSessions, isLoading: studentSessionsLoading } = useQuery({
    queryKey: ['teacher-student-sessions', selectedBranch?.id, startOfMonth, endOfMonth],
    queryFn: async () => {
      let query = supabase
        .from('attendance_sessions')
        .select('id, teacher_id')
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', endOfMonth)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  // ── Helper: calculate working days ──
  const getWorkingDays = (start, end, holidayDates) => {
    let count = 0
    let current = dayjs(start)
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const day = current.day()
      if (day !== 0 && !holidayDates.some(h => dayjs(h).isSame(current, 'day'))) {
        count++
      }
      current = current.add(1, 'day')
    }
    return count
  }

  // ── Compute salaries ──
  const computeSalaries = () => {
    if (!employees || !attendance || !demos || !leaves || !studentSessions) return

    const holidayDates = holidays.map(h => dayjs(h).format('YYYY-MM-DD'))
    const workingDays = getWorkingDays(startOfMonth, endOfMonth, holidayDates)

    const result = employees.map(emp => {
      let gross = 0
      let lectureCount = 0

      if (emp.salary_type === 'fixed') {
        const empAttendance = attendance.filter(a => a.teacher_id === emp.id)
        const absentCount = empAttendance.filter(a => a.status === 'absent').length
        const halfDayCount = empAttendance.filter(a => a.status === 'half_day').length
        const leaveRecords = leaves.filter(l => l.teacher_id === emp.id)

        let leaveDays = 0
        leaveRecords.forEach(l => {
          const leaveStart = dayjs(l.start_date)
          const leaveEnd = dayjs(l.end_date)
          let current = leaveStart
          while (current.isBefore(leaveEnd) || current.isSame(leaveEnd, 'day')) {
            leaveDays++
            current = current.add(1, 'day')
          }
        })

        const presentDays = workingDays - absentCount - leaveDays - halfDayCount * 0.5
        const payRatio = Math.max(0, presentDays / workingDays)
        gross = (emp.monthly_salary || 0) * payRatio
      } else if (emp.salary_type === 'lecture_based') {
        const teacherAttendanceCount = attendance.filter(a => a.teacher_id === emp.id).length
        const demoCount = demos.filter(d => d.teacher_id === emp.id).length
        const studentSessionCount = studentSessions.filter(s => s.teacher_id === emp.id).length
        lectureCount = teacherAttendanceCount + demoCount + studentSessionCount
        gross = lectureCount * (emp.per_lecture_rate || 0)
      }

      const tds = gross * (emp.tds_percentage || 0) / 100
      const net = gross - tds

      return {
        teacher_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        salary_type: emp.salary_type,
        gross: parseFloat(gross.toFixed(2)),
        tds: parseFloat(tds.toFixed(2)),
        net: parseFloat(net.toFixed(2)),
        lectureCount,
        employee: emp,
      }
    })

    setCalculated(result)
  }

  // ── Slip handler ──
  const handleSlip = (record) => {
    const amountInWords = `Rupees ${record.net.toLocaleString('en-IN')} Only`
    const holidayDates = holidays.map(h => dayjs(h).format('YYYY-MM-DD'))
    const workingDays = getWorkingDays(startOfMonth, endOfMonth, holidayDates)

    const salaryData = {
      month: safeMonth.format('MMMM YYYY'),
      workingDays,
      holidays: holidays.length,
      absentCount: attendance?.filter(a => a.teacher_id === record.teacher_id && a.status === 'absent').length || 0,
      halfDayCount: attendance?.filter(a => a.teacher_id === record.teacher_id && a.status === 'half_day').length || 0,
      leaveDays: leaves?.filter(l => l.teacher_id === record.teacher_id).reduce((sum, l) => sum + (dayjs(l.end_date).diff(dayjs(l.start_date), 'day') + 1), 0) || 0,
      presentDays: record.salary_type === 'fixed' ? (workingDays - (attendance?.filter(a => a.teacher_id === record.teacher_id && a.status === 'absent').length || 0) - (attendance?.filter(a => a.teacher_id === record.teacher_id && a.status === 'half_day').length || 0) * 0.5) : '-',
      lectureCount: record.lectureCount || 0,
      demoCount: demos?.filter(d => d.teacher_id === record.teacher_id).length || 0,
      gross: record.gross,
      tds: record.tds,
      net: record.net,
      payment_mode: 'Cash',
      payment_date: dayjs().format('DD/MM/YYYY'),
      amountInWords,
    }

    exportSalarySlipPDF(record.employee, salaryData, org, theme)
    message.success('Salary slip generated')
  }

  // ── Pay summary modal ──
  const [payModal, setPayModal] = useState(false)
  const [payingRecord, setPayingRecord] = useState(null)
  const [payForm] = Form.useForm()

  const openPayModal = (record) => {
    setPayingRecord(record)
    payForm.setFieldsValue({
      payment_mode: 'Bank Transfer',
      transaction_no: '',
    })
    setPayModal(true)
  }

  const handleConfirmPay = async () => {
    const values = await payForm.validateFields()
    if (!payingRecord || !org?.id) return

    const emp = payingRecord.employee
    const payload = {
      teacher_id: payingRecord.teacher_id,
      amount: payingRecord.net,
      payment_date: safeMonth.endOf('month').format('YYYY-MM-DD'),
      payment_mode: values.payment_mode,
      remarks: values.transaction_no || '',
      tds_percentage: emp.tds_percentage,
      tds_amount: payingRecord.tds,
      net_amount: payingRecord.net,
      branch_id: selectedBranch?.id,
      financial_year_id: selectedFinancialYear?.id,
      organization_id: org.id,
      total_lectures: payingRecord.lectureCount,
      payment_type: payingRecord.salary_type === 'fixed' ? 'fixed' : 'lecture_based',
    }

    await payMutation.mutateAsync(payload)
    message.success('Salary paid')
    setPayModal(false)
    setPayingRecord(null)
    setCalculated(prev => prev.filter(r => r.teacher_id !== payingRecord.teacher_id))
  }

  // ── Columns ──
  const columns = [
    {
      title: 'Employee',
      dataIndex: 'name',
      render: text => <span style={{ color: textColor }}>{text}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'salary_type',
      render: val => <Tag color={val === 'fixed' ? 'blue' : 'green'}>{val}</Tag>,
    },
    {
      title: 'Lectures',
      dataIndex: 'lectureCount',
      render: val => (val > 0 ? val : '-'),
      align: 'right',
    },
    {
      title: 'Gross (₹)',
      dataIndex: 'gross',
      render: val => val.toLocaleString('en-IN'),
      align: 'right',
    },
    {
      title: 'TDS (₹)',
      dataIndex: 'tds',
      render: val => val.toLocaleString('en-IN'),
      align: 'right',
    },
    {
      title: 'Net Payable (₹)',
      dataIndex: 'net',
      render: val => <span style={{ fontWeight: 'bold', color: primaryColor }}>{val.toLocaleString('en-IN')}</span>,
      align: 'right',
    },
    {
      title: 'Action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<DollarOutlined />}
            size="small"
            onClick={() => openPayModal(record)}
            loading={payMutation.isLoading}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Pay
          </Button>
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => handleSlip(record)}
          >
            Slip
          </Button>
        </Space>
      ),
    },
  ]

  const isLoading = empLoading || attLoading || demosLoading || leavesLoading || studentSessionsLoading

  const employeeBank = (emp) => {
    if (!emp?.bank_account_details) return null
    try {
      const parsed = typeof emp.bank_account_details === 'string' ? JSON.parse(emp.bank_account_details) : emp.bank_account_details
      const first = Array.isArray(parsed) ? parsed[0] : parsed
      return first || null
    } catch {
      return null
    }
  }

  const bankInfo = payingRecord ? employeeBank(payingRecord.employee) : null

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Salary Calculation</span>}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={6}>
            <DatePicker
              picker="month"
              value={month}
              onChange={setMonth}
              allowClear={false}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <DatePicker
              placeholder="Select holidays"
              multiple
              value={holidays}
              onChange={setHolidays}
              allowClear={false}
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Col>
          <Col xs={24} sm={4}>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={computeSalaries}
              loading={isLoading}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Calculate
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={calculated}
          columns={columns}
          rowKey="teacher_id"
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'Click "Calculate" to view salary data.' }}
        />
      </Card>

      <Modal
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Pay Salary</span>}
        open={payModal}
        onCancel={() => setPayModal(false)}
        onOk={handleConfirmPay}
        confirmLoading={payMutation.isLoading}
        width={600}
        destroyOnClose
        okText="Confirm Payment"
      >
        {payingRecord && (
          <div style={{ fontFamily: fontBody }}>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Employee">{payingRecord.name}</Descriptions.Item>
              <Descriptions.Item label="Code">{payingRecord.employee.employee_code || '-'}</Descriptions.Item>
              <Descriptions.Item label="Designation">{payingRecord.employee.designation || '-'}</Descriptions.Item>
              <Descriptions.Item label="Department">{payingRecord.employee.department || '-'}</Descriptions.Item>
              <Descriptions.Item label="Salary Type">
                <Tag color={payingRecord.salary_type === 'fixed' ? 'blue' : 'green'}>
                  {payingRecord.salary_type === 'fixed' ? 'Fixed' : 'Lecture Based'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Month">{safeMonth.format('MMMM YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Gross">₹ {payingRecord.gross.toLocaleString('en-IN')}</Descriptions.Item>
              <Descriptions.Item label="TDS">₹ {payingRecord.tds.toLocaleString('en-IN')}</Descriptions.Item>
              <Descriptions.Item label="Net Payable" span={2}>
                <span style={{ fontWeight: 'bold', color: primaryColor }}>₹ {payingRecord.net.toLocaleString('en-IN')}</span>
              </Descriptions.Item>
            </Descriptions>

            {bankInfo && (
              <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }} title="Bank Details">
                <Descriptions.Item label="Bank Name">{bankInfo.bank_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Branch">{bankInfo.branch_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Account No">{bankInfo.account_number || '-'}</Descriptions.Item>
                <Descriptions.Item label="IFSC">{bankInfo.ifsc_code || '-'}</Descriptions.Item>
              </Descriptions>
            )}

            <Form form={payForm} layout="vertical">
              <Form.Item name="payment_mode" label="Payment Mode" rules={[{ required: true }]}>
                <Select>
                  <Option value="Cash">Cash</Option>
                  <Option value="Bank Transfer">Bank Transfer</Option>
                  <Option value="UPI">UPI</Option>
                  <Option value="Cheque">Cheque</Option>
                </Select>
              </Form.Item>
              <Form.Item name="transaction_no" label="Transaction No / Remarks">
                <Input />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default SalaryCalculation