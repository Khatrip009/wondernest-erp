import { useState } from 'react'
import { Table, Card, Button, Typography, Spin, Alert, message, Row, Col, Select, DatePicker } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { exportGeneralLedgerPDF } from '../../utils/exportGeneralLedgerPDF'
import dayjs from 'dayjs'

const { Title } = Typography
const { RangePicker } = DatePicker

const GeneralStudentLedger = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear, branches, financialYears } = useScope()
  const { org } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [studentId, setStudentId] = useState(null)
  const [dateRange, setDateRange] = useState(null)

  // Fetch students for dropdown
  const { data: students = [] } = useQuery({
    queryKey: ['students-ledger', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, full_name_formatted, admission_no')
        .is('deleted_at', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data } = await query
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  // Fetch ledger entries
  const { data, isLoading, error } = useQuery({
    queryKey: ['general-student-ledger', selectedBranch?.id, selectedFinancialYear?.id, studentId, dateRange],
    queryFn: async () => {
      // 1. Fees charged (debit)
      let feesQuery = supabase
        .from('student_fees')
        .select(`
          id, student_id, total_fee, discount, final_fee, due_date, created_at,
          branch_id, financial_year_id,
          students!student_fees_student_id_fkey ( id, full_name_formatted, admission_no )
        `)
        .is('deleted_at', null)

      if (selectedBranch?.id) feesQuery = feesQuery.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) feesQuery = feesQuery.eq('financial_year_id', selectedFinancialYear.id)
      if (studentId) feesQuery = feesQuery.eq('student_id', studentId)
      if (dateRange && dateRange[0] && dateRange[1]) {
        feesQuery = feesQuery
          .gte('created_at', dateRange[0].format('YYYY-MM-DD'))
          .lte('created_at', dateRange[1].format('YYYY-MM-DD'))
      }

      const { data: fees, error: feesError } = await feesQuery
      if (feesError) throw feesError

      // 2. Payments (credit)
      let paymentsQuery = supabase
        .from('fee_payments')
        .select(`
          id, student_fee_id, payment_date, amount, payment_mode,
          branch_id, financial_year_id,
          student_fees!fee_payments_student_fee_id_fkey (
            student_id,
            students!student_fees_student_id_fkey ( id, full_name_formatted, admission_no )
          )
        `)
        .is('deleted_at', null)

      if (selectedBranch?.id) paymentsQuery = paymentsQuery.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) paymentsQuery = paymentsQuery.eq('financial_year_id', selectedFinancialYear.id)
      if (dateRange && dateRange[0] && dateRange[1]) {
        paymentsQuery = paymentsQuery
          .gte('payment_date', dateRange[0].format('YYYY-MM-DD'))
          .lte('payment_date', dateRange[1].format('YYYY-MM-DD'))
      }

      const { data: payments, error: payError } = await paymentsQuery
      if (payError) throw payError

      // 3. Combine
      const entries = []

      fees.forEach(f => {
        entries.push({
          date: f.created_at || f.due_date,
          student_name: f.students?.full_name_formatted || '',
          admission_no: f.students?.admission_no || '',
          description: 'Fee Charged',
          debit: Number(f.total_fee || 0),
          credit: 0,
          student_id: f.student_id,
          type: 'fee',
        })
      })

      payments.forEach(p => {
        const student = p.student_fees?.students
        entries.push({
          date: p.payment_date,
          student_name: student?.full_name_formatted || '',
          admission_no: student?.admission_no || '',
          description: `Payment (${p.payment_mode || 'N/A'})`,
          debit: 0,
          credit: Number(p.amount || 0),
          student_id: p.student_fees?.student_id,
          type: 'payment',
        })
      })

      if (studentId) {
        return entries
          .filter(e => e.student_id === studentId)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      }

      entries.sort((a, b) => new Date(a.date) - new Date(b.date))
      let running = 0
      return entries.map(e => {
        running = running + e.debit - e.credit
        return { ...e, balance: running }
      })
    },
    enabled: !!selectedBranch?.id,
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Date</span>,
      dataIndex: 'date',
      render: (d) => <span style={{ fontFamily: fontBody, color: textColor }}>{dayjs(d).format('DD/MM/YYYY')}</span>,
      width: 100,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: 'admission_no',
      render: (t) => <span style={{ fontFamily: fontBody, color: textColor }}>{t}</span>,
      width: 120,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Name</span>,
      dataIndex: 'student_name',
      render: (t) => <span style={{ fontFamily: fontBody, color: textColor }}>{t}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Particulars</span>,
      dataIndex: 'description',
      render: (t) => <span style={{ fontFamily: fontBody, color: textColor }}>{t}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Debit (Rs.)</span>,
      dataIndex: 'debit',
      render: (v) => <span style={{ fontFamily: fontBody, color: textColor }}>{v > 0 ? v.toLocaleString('en-IN') : '-'}</span>,
      align: 'right',
      width: 100,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Credit (Rs.)</span>,
      dataIndex: 'credit',
      render: (v) => <span style={{ fontFamily: fontBody, color: textColor }}>{v > 0 ? v.toLocaleString('en-IN') : '-'}</span>,
      align: 'right',
      width: 100,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Balance (Rs.)</span>,
      dataIndex: 'balance',
      render: (v) => (
        <span style={{ fontFamily: fontBody, color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
          {v.toLocaleString('en-IN')}
        </span>
      ),
      align: 'right',
      width: 110,
    },
  ]

  const handleExportPDF = () => {
    if (!data || data.length === 0) {
      message.warning('No data to export')
      return
    }
    const branchName = branches?.find(b => b.id === selectedBranch?.id)?.branch_name || ''
    const fyName = financialYears?.find(f => f.id === selectedFinancialYear?.id)?.name || ''

    exportGeneralLedgerPDF(data, org, theme, {
      branchName,
      financialYearName: fyName,
      studentName: studentId ? students.find(s => s.id === studentId)?.full_name_formatted : 'All',
      startDate: dateRange?.[0]?.format('DD/MM/YYYY'),
      endDate: dateRange?.[1]?.format('DD/MM/YYYY'),
    })
  }

  if (isLoading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }} />
  if (error) return <Alert message="Error" description={error.message} type="error" showIcon />

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8, fontFamily: fontBody }}>
      <Card
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>General Student Ledger</Title>}
        extra={<Button icon={<DownloadOutlined />} onClick={handleExportPDF} style={{ fontFamily: fontBody }}>Export PDF</Button>}
        variant="borderless"
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Select
              placeholder="Select Student"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={studentId}
              onChange={setStudentId}
              showSearch
              optionFilterProp="children"
            >
              {students.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.admission_no} - {s.full_name_formatted}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={10}>
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
          rowKey={(record, index) => `${record.type}-${record.date}-${index}`}
          pagination={{ pageSize: 50, size: 'small' }}
          size="small"
          scroll={{ x: 800 }}
          locale={{ emptyText: 'No ledger entries found for the selected filters.' }}
          summary={() => {
            if (!data || data.length === 0) return null
            const totalDebit = data.reduce((s, e) => s + (e.debit || 0), 0)
            const totalCredit = data.reduce((s, e) => s + (e.credit || 0), 0)
            const net = totalDebit - totalCredit
            return (
              <Table.Summary.Row style={{ fontWeight: 'bold', backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5' }}>
                <Table.Summary.Cell colSpan={4} index={0}>
                  <span style={{ color: textColor }}>Totals</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span style={{ color: textColor }}>{totalDebit.toLocaleString('en-IN')}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span style={{ color: textColor }}>{totalCredit.toLocaleString('en-IN')}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span style={{ color: net > 0 ? '#ff4d4f' : '#52c41a' }}>{net.toLocaleString('en-IN')}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )
          }}
        />
      </Card>
    </div>
  )
}

export default GeneralStudentLedger