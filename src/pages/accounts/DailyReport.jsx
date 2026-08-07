// src/pages/accounts/DailyReport.jsx
import { useState, useEffect } from 'react'
import {
  Card, Form, DatePicker, InputNumber, Button, Row, Col, Typography, message, Spin
} from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'
import { useTheme } from '../../contexts/ThemeContext'
import { exportDailyReportPDF } from '../../utils/exportDailyReportPDF'

const { Title } = Typography

const DailyReport = () => {
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { theme, darkMode } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [openingCash, setOpeningCash] = useState(null)
  const [openingOnline, setOpeningOnline] = useState(null)

  // When date changes, automatically compute opening balance
  const handleDateChange = async (selectedDate) => {
    if (!selectedDate || !org?.id) return

    const branchId = selectedBranch?.id || null
    const financialYearId = selectedFinancialYear?.id || null
    const orgId = org.id
    const date = selectedDate.format('YYYY-MM-DD')
    const previousDate = selectedDate.subtract(1, 'day').format('YYYY-MM-DD')

    try {
      // Fetch all fee payments up to previous day
      let feeQuery = supabase
        .from('fee_payments')
        .select('amount, payment_mode')
        .lte('payment_date', previousDate + 'T23:59:59')
        .eq('organization_id', orgId)
      if (branchId) feeQuery = feeQuery.eq('branch_id', branchId)
      if (financialYearId) feeQuery = feeQuery.eq('financial_year_id', financialYearId)
      const { data: allFeePayments } = await feeQuery

      // Fetch all expenses up to previous day
      let expenseQuery = supabase
        .from('expenses')
        .select('amount, payment_mode')
        .lte('expense_date', previousDate + 'T23:59:59')
        .eq('organization_id', orgId)
      if (branchId) expenseQuery = expenseQuery.eq('branch_id', branchId)
      if (financialYearId) expenseQuery = expenseQuery.eq('financial_year_id', financialYearId)
      const { data: allExpenses } = await expenseQuery

      // Fetch all income up to previous day
      let incomeQuery = supabase
        .from('income')
        .select('amount, payment_mode')
        .lte('income_date', previousDate + 'T23:59:59')
        .eq('organization_id', orgId)
      if (branchId) incomeQuery = incomeQuery.eq('branch_id', branchId)
      if (financialYearId) incomeQuery = incomeQuery.eq('financial_year_id', financialYearId)
      const { data: allIncome } = await incomeQuery

      // Classify amounts into cash or online
      const classify = (arr) => {
        let cash = 0, online = 0
        ;(arr || []).forEach(item => {
          const amt = Number(item.amount || 0)
          const mode = (item.payment_mode || '').toLowerCase()
          if (mode === 'online' || mode === 'upi' || mode === 'bank transfer') {
            online += amt
          } else {
            cash += amt   // Cash, Cheque, etc.
          }
        })
        return { cash, online }
      }

      const feeCR = classify(allFeePayments)
      const incomeCR = classify(allIncome)
      const expenseDR = classify(allExpenses)

      const cash = feeCR.cash + incomeCR.cash - expenseDR.cash
      const online = feeCR.online + incomeCR.online - expenseDR.online

      setOpeningCash(Math.max(cash, 0))
      setOpeningOnline(Math.max(online, 0))
      form.setFieldsValue({
        opening_cash: Math.max(cash, 0),
        opening_online: Math.max(online, 0),
      })
    } catch (err) {
      console.error('Failed to compute opening balance:', err)
    }
  }

  const handleGenerate = async (values) => {
    setLoading(true)
    try {
      const branchId = selectedBranch?.id || null
      const financialYearId = selectedFinancialYear?.id || null
      const orgId = org?.id

      if (!orgId) {
        message.error('Organization not found')
        setLoading(false)
        return
      }

      const date = values.date.format('YYYY-MM-DD')
      const dayName = values.date.format('dddd')
      const displayDate = values.date.format('D/M/YY') + ` (${dayName})`

      // Use manually entered or auto‑computed opening balances
      const finalOpeningCash = values.opening_cash ?? openingCash ?? 0
      const finalOpeningOnline = values.opening_online ?? openingOnline ?? 0

      // 1. Today's fee payments (CR)
      let feeQuery = supabase
        .from('fee_payments')
        .select('amount, payment_mode, remarks, student_fees( students( first_name, last_name ) )')
        .gte('payment_date', date + 'T00:00:00')
        .lte('payment_date', date + 'T23:59:59')
        .eq('organization_id', orgId)
      if (branchId) feeQuery = feeQuery.eq('branch_id', branchId)
      if (financialYearId) feeQuery = feeQuery.eq('financial_year_id', financialYearId)

      const { data: feePayments, error: feeError } = await feeQuery
      if (feeError) throw feeError

      const creditEntries = (feePayments || []).map(p => {
        const student = p.student_fees?.students || {}
        const studentName = student.first_name
          ? `${student.first_name} ${student.last_name || ''}`.trim()
          : 'Student'
        return {
          amount: p.amount,
          description: `${studentName} – Fee`,
          mode: p.payment_mode || 'Cash',
        }
      })

      // 2. Today's expenses (DR)
      let expenseQuery = supabase
        .from('expenses')
        .select('amount, payment_mode, description')
        .gte('expense_date', date + 'T00:00:00')
        .lte('expense_date', date + 'T23:59:59')
        .eq('organization_id', orgId)
      if (branchId) expenseQuery = expenseQuery.eq('branch_id', branchId)
      if (financialYearId) expenseQuery = expenseQuery.eq('financial_year_id', financialYearId)

      const { data: expenses, error: expenseError } = await expenseQuery
      if (expenseError) throw expenseError

      const debitEntries = (expenses || []).map(e => ({
        amount: e.amount,
        description: e.description || 'Expense',
        mode: e.payment_mode || 'Cash',
      }))

      // 3. Inventory transactions
      let invQuery = supabase
        .from('inventory_transactions')
        .select('created_at, transaction_type, quantity, item_id, inventory_items(item_name)')
        .gte('created_at', date + 'T00:00:00')
        .lte('created_at', date + 'T23:59:59')
        .eq('organization_id', orgId)
      if (branchId) invQuery = invQuery.eq('branch_id', branchId)

      const { data: invData, error: invError } = await invQuery
      if (invError) throw invError

      const inventoryInward = []
      const inventoryOutward = []
      ;(invData || []).forEach(t => {
        const item = t.inventory_items?.item_name || 'Item'
        if (t.transaction_type === 'purchase') {
          inventoryInward.push({
            date: displayDate,
            description: `${item} – Qty ${t.quantity}`,
          })
        } else if (t.transaction_type === 'issue') {
          inventoryOutward.push({
            date: displayDate,
            description: `${item} – Qty ${t.quantity}`,
          })
        }
      })

      // 4. Generate PDF
      exportDailyReportPDF({
        date: displayDate,
        organization: org || {},
        openingBalances: { cash: finalOpeningCash, online: finalOpeningOnline },
        creditEntries,
        debitEntries,
        inventoryInward,
        inventoryOutward,
        theme: theme || {},
      })

      message.success('Daily report PDF generated')
    } catch (err) {
      console.error(err)
      message.error(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading }}>Daily Report (Rojnishi)</Title>}
        bordered={false}
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}`, maxWidth: 500, margin: '0 auto' }}
      >
        <Form form={form} layout="vertical" onFinish={handleGenerate} initialValues={{ date: dayjs() }}>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} onChange={handleDateChange} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="opening_cash" label="Opening Cash Balance">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="opening_online" label="Opening Online Balance">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            icon={<FilePdfOutlined />}
            loading={loading}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor, width: '100%' }}
          >
            Generate Daily Report
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default DailyReport