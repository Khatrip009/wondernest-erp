import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Select, DatePicker, Button, Spin, message } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useFee, useUpdateFee } from '../../hooks/useFees'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const FeesEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const { data: fee, isLoading } = useFee(id)
  const updateMutation = useUpdateFee()

  useEffect(() => {
    if (fee) {
      form.setFieldsValue({
        discount: fee.discount || 0,
        due_date: fee.due_date ? dayjs(fee.due_date) : null,
        status: fee.status,
        total_fee: fee.total_fee,
        final_fee: fee.final_fee,
        paid_amount: fee.paid_amount,
      })
    }
  }, [fee, form])

  const onFinish = async (values) => {
    try {
      await updateMutation.mutateAsync({
        id: Number(id),
        discount: values.discount || 0,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        status: values.status,
      })
      message.success('Fee updated')
      navigate(`/fees/${id}`)
    } catch (err) {
      message.error(err.message)
    }
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  if (!fee) return <Card><p>Fee record not found</p><Button onClick={() => navigate('/fees')}>Back</Button></Card>

  return (
    <Card
      title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Edit Fee</span>}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/fees/${id}`)}>Cancel</Button>}
      style={{ maxWidth: 600, margin: '0 auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}` }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item label="Total Fee" name="total_fee">
          <InputNumber style={{ width: '100%' }} disabled />
        </Form.Item>
        <Form.Item label="Paid Amount" name="paid_amount">
          <InputNumber style={{ width: '100%' }} disabled />
        </Form.Item>
        <Form.Item label="Final Fee" name="final_fee">
          <InputNumber style={{ width: '100%' }} disabled />
        </Form.Item>
        <Form.Item label="Discount" name="discount" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Due Date" name="due_date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Status" name="status" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="Paid">Paid</Select.Option>
            <Select.Option value="Partially Paid">Partially Paid</Select.Option>
            <Select.Option value="Pending">Pending</Select.Option>
            <Select.Option value="Unpaid">Unpaid</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isLoading} style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>Save</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default FeesEdit