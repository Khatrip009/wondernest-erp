import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, DatePicker, Button, Space, Upload, message, Spin, Typography } from 'antd'
import { UploadOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useHomework, useCreateHomework, useUpdateHomework } from '../../../hooks/useAcademics'
import { uploadHomeworkFile } from '../../../api/academics'
import { useTheme } from '../../../contexts/ThemeContext'
import { useScope } from '../../../contexts/ScopeContext'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select
const { Title } = Typography

const HomeworkForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState([])
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const labelColor = primaryColor

  const isEdit = !!id

  const { data: homework, isLoading: homeworkLoading } = useHomework(id)

  const createMutation = useCreateHomework()
  const updateMutation = useUpdateHomework()

  // Fetch batches (branch‑scoped, unchanged)
  const { data: batches } = useQuery({
    queryKey: ['batches-form', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Fetch subjects (branch‑scoped, unchanged)
  const { data: subjects } = useQuery({
    queryKey: ['subjects-form', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('id, subject_name')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (homework) {
      form.setFieldsValue({
        title: homework.title,
        description: homework.description,
        batch_id: homework.batch_id,
        subject_id: homework.subject_id,
        due_date: homework.due_date ? dayjs(homework.due_date) : null,
        assigned_date: homework.assigned_date ? dayjs(homework.assigned_date) : null,
      })
    }
  }, [homework, form])

  const onFinish = async (values) => {
    try {
      setLoading(true)
      let attachmentUrl = homework?.attachment_url || null

      // Upload file if any
      if (fileList.length > 0) {
        const file = fileList[0].originFileObj
        attachmentUrl = await uploadHomeworkFile(file)
      }

      const payload = {
        title: values.title,
        description: values.description,
        batch_id: values.batch_id,
        subject_id: values.subject_id,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        assigned_date: values.assigned_date ? values.assigned_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        attachment_url: attachmentUrl,
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
        created_by: null,
      }

      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(id), ...payload })
        message.success('Homework updated')
      } else {
        await createMutation.mutateAsync(payload)
        message.success('Homework created')
      }
      navigate('/academics/homework')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { color: labelColor, fontWeight: 500, fontFamily: fontBody }

  if (isEdit && homeworkLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>{isEdit ? 'Edit Homework' : 'Create Homework'}</span>}
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/homework')} style={{ fontFamily: fontBody, color: textColor, borderColor }}>Back</Button>}
        bordered={false}
        style={{
          maxWidth: 700,
          margin: '0 auto',
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ backgroundColor: cardBg }}>
          <Form.Item name="title" label={<span style={labelStyle}>Title</span>} rules={[{ required: true }]}>
            <Input style={{ fontFamily: fontBody }} />
          </Form.Item>

          <Form.Item name="description" label={<span style={labelStyle}>Description</span>}>
            <TextArea rows={3} style={{ fontFamily: fontBody }} />
          </Form.Item>

          <Form.Item name="batch_id" label={<span style={labelStyle}>Batch</span>} rules={[{ required: true }]}>
            <Select placeholder="Select batch" style={{ fontFamily: fontBody }} dropdownStyle={{ fontFamily: fontBody }}>
              {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="subject_id" label={<span style={labelStyle}>Subject</span>} rules={[{ required: true }]}>
            <Select placeholder="Select subject" style={{ fontFamily: fontBody }} dropdownStyle={{ fontFamily: fontBody }}>
              {subjects?.map(s => <Option key={s.id} value={s.id}>{s.subject_name}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="assigned_date" label={<span style={labelStyle}>Assigned Date</span>}>
            <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
          </Form.Item>

          <Form.Item name="due_date" label={<span style={labelStyle}>Due Date</span>} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
          </Form.Item>

          <Form.Item label={<span style={labelStyle}>Attachment</span>}>
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} style={{ fontFamily: fontBody, color: textColor, borderColor }}>
                Upload File
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button
                onClick={() => navigate('/academics/homework')}
                style={{ fontFamily: fontBody, color: textColor, borderColor }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default HomeworkForm