import { useState, useEffect } from 'react'
import { Modal, Form, InputNumber, Input, Select, DatePicker, message, Descriptions, Spin } from 'antd'
import { useAddFeePayment } from '../../hooks/useStudents'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'

const { Option } = Select

const AddFeePaymentModal = ({ open, studentFeeId, onClose }) => {
  const [form] = Form.useForm()
  const addPaymentMut = useAddFeePayment()
  const [feeDetails, setFeeDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [outstanding, setOutstanding] = useState(0)
  const [branchId, setBranchId] = useState(null)
  const [financialYearId, setFinancialYearId] = useState(null)

  useEffect(() => {
    if (open && studentFeeId) {
      fetchFeeDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentFeeId])

  const fetchFeeDetails = async () => {
    if (!studentFeeId) {
      message.warning('No fee record found for this student')
      return
    }

    setLoading(true)
    try {
      // Get student_fee record with student_id, branch_id, financial_year_id
      const { data: fee, error: feeError } = await supabase
        .from('student_fees')
        .select('student_id, branch_id, financial_year_id')
        .eq('id', studentFeeId)
        .single()
      if (feeError) throw feeError

      setBranchId(fee.branch_id)
      setFinancialYearId(fee.financial_year_id)

      // Now get full details from the view
      const { data, error } = await supabase
        .from('student_full_details')
        .select('full_name_formatted, course_name, total_fee, discount, final_fee, paid_amount, balance_due')
        .eq('fee_id', studentFeeId)
        .single()

      if (error) throw error

      const totalFee = data.final_fee || data.total_fee || 0
      const paidAmount = data.paid_amount || 0
      const balance = data.balance_due || (totalFee - paidAmount)

      setFeeDetails({
        studentName: data.full_name_formatted || 'Unknown',
        courseName: data.course_name || 'N/A',
        baseAmount: totalFee,
        taxAmount: 0,
        totalFee,
        paidAmount,
        outstanding: balance > 0 ? balance : 0,
      })

      setOutstanding(balance > 0 ? balance : 0)
      form.setFieldsValue({ amount: balance > 0 ? balance : 0 })
    } catch (err) {
      console.error('Error fetching fee details:', err)
      message.error('Failed to fetch fee details')
    } finally {
      setLoading(false)
    }
  }

  const onOk = async () => {
    try {
      const values = await form.validateFields()
      if (!branchId || !financialYearId) {
        message.error('Branch or Financial Year not found for this fee')
        return
      }
      await addPaymentMut.mutateAsync({
        studentFeeId,
        amount: values.amount,
        paymentMode: values.paymentMode,
        transactionNo: values.transactionNo,
        remarks: values.remarks,
        paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        branchId,
        financialYearId,
      })
      message.success('Payment recorded')
      form.resetFields()
      onClose()
    } catch (err) {
      message.error(err.message || 'Payment failed')
    }
  }

  return (
    <Modal
      title="Add Fee Payment"
      open={open}
      onOk={onOk}
      onCancel={() => { form.resetFields(); onClose() }}
      confirmLoading={addPaymentMut.isLoading}
      destroyOnClose
      width={600}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin size="large" />
        </div>
      ) : feeDetails ? (
        <>
          <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Student" span={2}>
              {feeDetails.studentName}
            </Descriptions.Item>
            <Descriptions.Item label="Course" span={2}>
              {feeDetails.courseName}
            </Descriptions.Item>
            <Descriptions.Item label="Base Fee">
              ₹{feeDetails.baseAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Tax">
              ₹{feeDetails.taxAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Total Fee">
              <strong>₹{feeDetails.totalFee.toFixed(2)}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Paid Amount">
              ₹{feeDetails.paidAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Outstanding" span={2}>
              <span style={{ color: outstanding > 0 ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
                ₹{feeDetails.outstanding.toFixed(2)}
              </span>
            </Descriptions.Item>
          </Descriptions>

          <Form form={form} layout="vertical" initialValues={{ paymentDate: dayjs() }}>
            <Form.Item
              name="amount"
              label="Payment Amount"
              rules={[{ required: true, message: 'Please enter amount' }]}
            >
              <InputNumber
                min={1}
                max={outstanding}
                style={{ width: '100%' }}
                precision={2}
                formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/₹\s?|(,*)/g, '')}
                placeholder="Enter amount"
              />
            </Form.Item>

            <Form.Item
              name="paymentMode"
              label="Payment Mode"
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="Cash">Cash</Option>
                <Option value="UPI">UPI</Option>
                <Option value="Bank Transfer">Bank Transfer</Option>
                <Option value="Card">Card</Option>
              </Select>
            </Form.Item>

            <Form.Item name="paymentDate" label="Payment Date">
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>

            <Form.Item name="transactionNo" label="Transaction No">
              <Input />
            </Form.Item>

            <Form.Item name="remarks" label="Remarks">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p>No fee details available</p>
        </div>
      )}
    </Modal>
  )
}

export default AddFeePaymentModal