import { useState } from 'react'
import { Modal, Form, Input, message } from 'antd'
import { useUpdateInquiry } from '../../hooks/useInquiries'
import { useTheme } from '../../contexts/ThemeContext'

const { TextArea } = Input

const RejectInquiryModal = ({ open, inquiry, onClose }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const updateMutation = useUpdateInquiry()
  const { theme, darkMode } = useTheme()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const bgColor = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#d9d9d9'

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
        body: { backgroundColor: bgColor, fontFamily: fontBody, color: textColor },
        header: { backgroundColor: bgColor },
        content: { backgroundColor: bgColor },
      }}
      okButtonProps={{
        style: { backgroundColor: primaryColor, borderColor: primaryColor },
      }}
      cancelButtonProps={{
        style: { color: textColor, borderColor },
      }}
    >
      <Form form={form} layout="vertical" style={{ backgroundColor: bgColor }}>
        <Form.Item
          name="reason"
          label={<span style={{ color: primaryColor, fontFamily: fontBody }}>Rejection Reason</span>}
        >
          <TextArea
            rows={3}
            placeholder="Enter reason for rejection (optional)"
            style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#2c2c2c' : '#ffffff', color: textColor }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default RejectInquiryModal