import { useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Select, DatePicker, message, Spin, Alert, Typography } from 'antd'
import { useAddPayment, useFee } from '../../hooks/useFees'   // ✅ import both hooks
import { useAuth } from '../../contexts/AuthContext'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'

const { Text } = Typography

const AddPaymentModal = ({ open, feeId, onClose }) => {
  const [form] = Form.useForm()
  const { mutate, isLoading } = useAddPayment()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const { user } = useAuth()
  const { selectedBranch, selectedFinancialYear, orgId } = useOutletContext() || {}

  // 1️⃣ Fetch fee details – this gives us student_id and service info
  const { data: fee, isLoading: feeLoading, error: feeError } = useFee(feeId, {
    orgId,
    branchId: selectedBranch?.id,
    financialYearId: selectedFinancialYear?.id,
  })

  // 2️⃣ Fetch outstanding balance for the student (same logic as FeeCollection)
  const { data: feeSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['student-fee-summary-modal', fee?.student_id, selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: async () => {
      if (!fee?.student_id) return null

      // Get the latest fee record for this student
      const { data: fees, error } = await supabase
        .from('student_fees')
        .select('id, base_fee, tax_amount, tax_rate, final_fee, discount, service_id')
        .eq('student_id', fee.student_id)
        .eq('branch_id', selectedBranch?.id)
        .eq('financial_year_id', selectedFinancialYear?.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error
      if (!fees || fees.length === 0) return null

      const feeRecord = fees[0]

      // Get payments for this fee
      const { data: payments, error: payErr } = await supabase
        .from('fee_payments')
        .select('base_amount, tax_amount, amount')
        .eq('student_fee_id', feeRecord.id)

      if (payErr) throw payErr

      const totalPaidBase = payments?.reduce((s, p) => s + (p.base_amount || 0), 0) || 0
      const totalPaidTax = payments?.reduce((s, p) => s + (p.tax_amount || 0), 0) || 0
      const totalPaidAmount = payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0

      const baseFee = feeRecord.base_fee || 0
      const taxAmount = feeRecord.tax_amount || 0
      const finalFee = feeRecord.final_fee || 0

      const outstandingBase = Math.max(baseFee - totalPaidBase, 0)
      const outstandingTax = Math.max(taxAmount - totalPaidTax, 0)
      const outstandingTotal = finalFee - totalPaidAmount

      return {
        fee_id: feeRecord.id,
        base_fee: baseFee,
        tax_amount: taxAmount,
        final_fee: finalFee,
        paid_base: totalPaidBase,
        paid_tax: totalPaidTax,
        paid_amount: totalPaidAmount,
        outstanding_base: outstandingBase,
        outstanding_tax: outstandingTax,
        outstanding_total: outstandingTotal,
        tax_rate: feeRecord.tax_rate || 0,
        service_id: feeRecord.service_id,
      }
    },
    enabled: !!fee?.student_id && !!selectedBranch?.id && !!selectedFinancialYear?.id,
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields()
      form.setFieldsValue({
        payment_date: dayjs(),
        amount: undefined,
        payment_mode: undefined,
        transaction_no: '',
        remarks: '',
      })
    }
  }, [open, form])

  // Guard: if feeId is invalid, close modal
  if (open && (feeId === undefined || feeId === null || isNaN(Number(feeId)))) {
    setTimeout(() => onClose(), 0)
    return null
  }

  // Loading states
  if (feeLoading || summaryLoading) {
    return (
      <Modal open={open} onCancel={onClose} footer={null}>
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      </Modal>
    )
  }

  // Check for errors
  if (feeError) {
    return (
      <Modal open={open} onCancel={onClose} footer={null}>
        <Alert message="Error loading fee" description={feeError.message} type="error" showIcon />
      </Modal>
    )
  }

  // If fee or student missing, show error
  if (!fee || !fee.student_id) {
    return (
      <Modal open={open} onCancel={onClose} footer={null}>
        <Alert message="Fee record not found or missing student." type="error" showIcon />
      </Modal>
    )
  }

  // If no outstanding balance, show warning and close after a moment
  if (!feeSummary || feeSummary.outstanding_total <= 0) {
    return (
      <Modal open={open} onCancel={onClose} footer={null}>
        <Alert message="No outstanding balance for this fee." type="warning" showIcon />
      </Modal>
    )
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const paymentAmount = values.amount

      // Calculate proportional base and tax for this payment
      const totalOutstanding = feeSummary.outstanding_total
      const outstandingBase = feeSummary.outstanding_base
      const outstandingTax = feeSummary.outstanding_tax

      const paymentTax = (paymentAmount * outstandingTax) / totalOutstanding
      const paymentBase = paymentAmount - paymentTax

      // Build items array for the RPC
      const items = [
        {
          item_type: 'service',
          description: fee?.inventory_items?.item_name || 'Course Fee',
          quantity: 1,
          unit_price: paymentAmount,
          taxable_amount: paymentBase,
          tax_amount: paymentTax,
          total_amount: paymentAmount,
          tax_rate: feeSummary.tax_rate || 0,
          hsn_sac_code: fee?.inventory_items?.hsn_sac_code || '9992',
          inventory_item_id: feeSummary.service_id || null,
          is_fee_item: true,
        }
      ]

      const payload = {
        studentId: fee.student_id,
        items: items,
        amount: paymentAmount,
        paymentMode: values.payment_mode,
        branchId: selectedBranch?.id,
        financialYearId: selectedFinancialYear?.id,
        paymentDate: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : null,
        remarks: values.remarks || null,
        placeOfSupply: null,
        organizationId: orgId,
      }

      mutate(payload, {
        onSuccess: (data) => {
          message.success(`Payment recorded, Receipt: ${data.receipt_no}`)
          form.resetFields()
          onClose()
        },
        onError: (err) => {
          message.error(err.message || 'Failed to process payment')
        },
      })
    } catch (err) {
      // Validation error – form will show the issues
    }
  }

  return (
    <Modal
      title={<span style={{ color: primaryColor, fontFamily: 'var(--font-heading)' }}>Add Payment</span>}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isLoading}
      okText="Add Payment"
      styles={{ body: { fontFamily: fontBody } }}
    >
      <div style={{ marginBottom: 16, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
        <Text strong>Outstanding Balance: </Text>
        <Text style={{ color: primaryColor, fontSize: 16, fontWeight: 'bold' }}>
          ₹{feeSummary.outstanding_total.toFixed(2)}
        </Text>
        <br />
        <Text type="secondary">
          (Base: ₹{feeSummary.outstanding_base.toFixed(2)} + Tax: ₹{feeSummary.outstanding_tax.toFixed(2)})
        </Text>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="amount"
          label="Payment Amount"
          rules={[
            { required: true, message: 'Please enter the amount' },
            { type: 'number', min: 0.01, message: 'Amount must be greater than 0' },
            {
              validator: (_, value) => {
                if (value && value > feeSummary.outstanding_total) {
                  return Promise.reject('Amount cannot exceed outstanding balance')
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <InputNumber min={0.01} step={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="payment_mode"
          label="Payment Mode"
          rules={[{ required: true, message: 'Please select a payment mode' }]}
        >
          <Select>
            <Select.Option value="Cash">Cash</Select.Option>
            <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
            <Select.Option value="Cheque">Cheque</Select.Option>
            <Select.Option value="UPI">UPI</Select.Option>
            <Select.Option value="Card">Card</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="payment_date" label="Payment Date" initialValue={dayjs()}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="transaction_no" label="Transaction / Cheque No">
          <Input />
        </Form.Item>
        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AddPaymentModal