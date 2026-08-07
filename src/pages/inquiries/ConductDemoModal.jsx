import { Modal, Form, Select, Input, DatePicker, InputNumber, message } from 'antd'
import { useConductDemo } from '../../hooks/useInquiries'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { TextArea } = Input

const ConductDemoModal = ({ open, demo, inquiryId, onClose }) => {
  const [form] = Form.useForm()
  const conductMutation = useConductDemo()
  const { theme, darkMode } = useTheme()

  // Theme tokens with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const bgColor = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const onOk = async () => {
    try {
      const values = await form.validateFields()
      await conductMutation.mutateAsync({
        demoId: demo.id,
        inquiryId,
        outcome: values.outcome,
        feedback: values.feedback,
        teacherRemarks: values.teacher_remarks,
        durationMinutes: values.duration_minutes,
        conductedAt: values.conducted_at
          ? values.conducted_at.toISOString()
          : new Date().toISOString(),
      })
      message.success('Demo conducted')
      onClose()
    } catch (err) {
      message.error(err.message || 'Failed to conduct demo')
    }
  }

  return (
    <Modal
      title={
        <span style={{ color: primaryColor, fontFamily: fontHeading }}>
          Conduct Demo
        </span>
      }
      open={open}
      onOk={onOk}
      onCancel={onClose}
      confirmLoading={conductMutation.isPending}
      destroyOnClose
      styles={{
        body: {
          backgroundColor: bgColor,
          fontFamily: fontBody,
          color: textColor,
        },
        header: {
          backgroundColor: bgColor,
        },
        content: {
          backgroundColor: bgColor,
        },
      }}
      okButtonProps={{
        style: {
          backgroundColor: primaryColor,
          borderColor: primaryColor,
        },
      }}
      cancelButtonProps={{
        style: {
          color: textColor,
          borderColor: darkMode ? '#444' : '#d9d9d9',
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          conducted_at: dayjs(),
          duration_minutes: demo?.duration_minutes || 30,
        }}
        style={{ backgroundColor: bgColor }}
      >
        <Form.Item
          name="outcome"
          label={
            <span style={{ fontFamily: fontBody, color: primaryColor }}>
              Outcome
            </span>
          }
          rules={[{ required: true, message: 'Select outcome' }]}
        >
          <Select
            placeholder="Select outcome"
            style={{ fontFamily: fontBody }}
            dropdownStyle={{ fontFamily: fontBody }}
          >
            <Select.Option value="Success">Success</Select.Option>
            <Select.Option value="Fail">Fail</Select.Option>
            <Select.Option value="Inconclusive">Inconclusive</Select.Option>
            <Select.Option value="Reschedule Needed">
              Reschedule Needed
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="feedback"
          label={
            <span style={{ fontFamily: fontBody, color: primaryColor }}>
              Feedback
            </span>
          }
        >
          <TextArea rows={2} style={{ fontFamily: fontBody }} />
        </Form.Item>

        <Form.Item
          name="teacher_remarks"
          label={
            <span style={{ fontFamily: fontBody, color: primaryColor }}>
              Teacher Remarks
            </span>
          }
        >
          <TextArea rows={2} style={{ fontFamily: fontBody }} />
        </Form.Item>

        <Form.Item
          name="duration_minutes"
          label={
            <span style={{ fontFamily: fontBody, color: primaryColor }}>
              Duration (minutes)
            </span>
          }
        >
          <InputNumber
            min={1}
            max={300}
            style={{ width: '100%', fontFamily: fontBody }}
          />
        </Form.Item>

        <Form.Item
          name="conducted_at"
          label={
            <span style={{ fontFamily: fontBody, color: primaryColor }}>
              Conducted At
            </span>
          }
        >
          <DatePicker
            showTime
            style={{ width: '100%', fontFamily: fontBody }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ConductDemoModal