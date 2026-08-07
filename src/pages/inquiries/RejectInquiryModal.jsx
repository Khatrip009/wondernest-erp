import { useState } from 'react'
import { Modal, Form, Input, message } from 'antd'
import { useUpdateInquiry } from '../../hooks/useInquiries'
import { useTheme } from '../../contexts/ThemeContext'

const { TextArea } = Input

const RejectInquiryModal = ({ open, inquiry, onClose }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const updateMutation = useUpdateInquiry()
  const { theme } = useTheme()

  // Theme values with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      await updateMutation.mutateAsync({
        id: inquiry.id,
        status: 'Rejected',
        rejection_reason: values.reason || null,
      })
      message.success('Inquiry rejected')
      onClose()
      form.resetFields()
    } catch (err) {
      message.error(err.message || 'Failed to reject inquiry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Reject Inquiry</span>}
      open={open}
      onOk={handleOk}
      onCancel={() => {
        onClose()
        form.resetFields()
      }}
      confirmLoading={loading}
      destroyOnClose
      styles={{
        body: { fontFamily: fontBody },
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label={<span style={{ color: primaryColor, fontFamily: fontBody }}>Rejection Reason</span>}
        >
          <TextArea
            rows={3}
            placeholder="Enter reason for rejection (optional)"
            style={{ fontFamily: fontBody }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default RejectInquiryModal