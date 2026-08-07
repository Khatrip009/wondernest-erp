import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Form, Input, Select, DatePicker, Button, Space, Upload, message, Spin } from 'antd'
import { UploadOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useHomework, useCreateHomework, useUpdateHomework } from '../../../hooks/useAcademics'
import { uploadHomeworkFile } from '../../../api/academics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const HomeworkForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState([])
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'

  const isEdit = !!id

  const { data: homework, isLoading: homeworkLoading } = useHomework(id)

  const createMutation = useCreateHomework()
  const updateMutation = useUpdateHomework()

  // Fetch batches
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

  // Fetch subjects
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
        created_by: null, // you can pass the teacher/user id
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

  if (isEdit && homeworkLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />

  return (
    <Card
      title={<span style={{ color: primaryColor }}>{isEdit ? 'Edit Homework' : 'Create Homework'}</span>}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/homework')}>Back</Button>}
      bordered={false}
      style={{ maxWidth: 700, margin: '0 auto', borderTop: `4px solid ${primaryColor}` }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea rows={3} />
        </Form.Item>

        <Form.Item
          name="batch_id"
          label="Batch"
          rules={[{ required: true }]}
        >
          <Select placeholder="Select batch">
            {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item
          name="subject_id"
          label="Subject"
          rules={[{ required: true }]}
        >
          <Select placeholder="Select subject">
            {subjects?.map(s => <Option key={s.id} value={s.id}>{s.subject_name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item name="assigned_date" label="Assigned Date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Attachment">
          <Upload
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Upload File</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              {isEdit ? 'Update' : 'Create'}
            </Button>
            <Button onClick={() => navigate('/academics/homework')}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default HomeworkForm