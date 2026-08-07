// src/pages/teacher/TeacherLeaves.jsx
import { useState } from 'react'
import { Card, Table, Button, Modal, Form, DatePicker, Input, message, Tag } from 'antd'
import { PlusOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { generateLeaveApplicationPdf } from '../../utils/leaveApplicationPdf'   // ✅ PDF util
import dayjs from 'dayjs'

const TeacherLeaves = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  // Fetch teacher record
  const { data: teacher } = useQuery({
    queryKey: ['teacher-me', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teachers').select('*').eq('user_id', user.id).maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  const teacherId = teacher?.id

  // Fetch teacher's leaves
  const { data: leaves, isLoading } = useQuery({
    queryKey: ['teacher-leaves', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId,
  })

  const createLeave = useMutation({
    mutationFn: async (values) => {
      const { start_date, end_date, reason } = values
      const { error } = await supabase.from('leaves').insert({
        teacher_id: teacherId,
        start_date: start_date.format('YYYY-MM-DD'),
        end_date: end_date.format('YYYY-MM-DD'),
        reason,
        status: 'Pending',
        organization_id: org?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Leave application submitted')
      setModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries(['teacher-leaves'])
    },
    onError: (err) => message.error(err.message),
  })

  // ✅ Handle PDF download
const handleDownloadPDF = async (leaveRecord) => {
  try {
    const doc = await generateLeaveApplicationPdf(
      leaveRecord,
      teacher,
      org,
      {},
      theme
    );
    const fileName = `Leave_Application_${teacher?.first_name || 'Teacher'}_${teacher?.last_name || ''}.pdf`;
    doc.save(fileName);
    message.success('PDF downloaded');
  } catch (err) {
    console.error(err);
    message.error('Failed to generate PDF');
  }
};

  const columns = [
    { title: 'Start', dataIndex: 'start_date', render: d => dayjs(d).format('DD/MM/YYYY') },
    { title: 'End', dataIndex: 'end_date', render: d => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Reason', dataIndex: 'reason' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: s => <Tag color={s === 'Approved' ? 'green' : s === 'Rejected' ? 'red' : 'orange'}>{s}</Tag>,
    },
    {
      title: 'Action',
      render: (_, record) => (
        <Button
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => handleDownloadPDF(record)}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          PDF
        </Button>
      ),
    },
  ]

  return (
    <Card
      title={<span style={{ color: primaryColor }}>My Leave Applications</span>}
      bordered={false}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Apply Leave</Button>}
    >
      <Table dataSource={leaves} columns={columns} rowKey="id" loading={isLoading} />

      <Modal
        title="Apply for Leave"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createLeave.isLoading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={createLeave.mutate}>
          <Form.Item
            name="start_date"
            label="Start Date"
            rules={[{ required: true, message: 'Select start date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="end_date"
            label="End Date"
            rules={[{ required: true, message: 'Select end date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Enter reason' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default TeacherLeaves