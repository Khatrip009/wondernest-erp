import { useState } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, DatePicker, message } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { TextArea } = Input

const TeacherHomework = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data: teacher } = useQuery({
    queryKey: ['teacher-me', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  const { data: homeworks, isLoading } = useQuery({
    queryKey: ['teacher-homeworks', teacher?.id],
    queryFn: async () => {
      if (!teacher) return []
      const { data } = await supabase.from('homework').select('*, batches(batch_name)').eq('created_by', teacher.id).order('due_date', { ascending: false })
      return data || []
    },
    enabled: !!teacher?.id,
  })

  const { data: myBatches } = useQuery({
    queryKey: ['teacher-batches', teacher?.id],
    queryFn: async () => {
      if (!teacher) return []
      const { data: d } = await supabase.from('batches').select('id, batch_name').eq('teacher_id', teacher.id).eq('status', 'active')
      const { data: v } = await supabase.from('teacher_batches').select('batch_id, batches!inner(id, batch_name)').eq('teacher_id', teacher.id)
      return [...(d||[]), ...(v?.map(r=>r.batches)||[])]
    },
    enabled: !!teacher?.id,
  })

  const createMutation = useMutation({
    mutationFn: async (values) => {
      const { error } = await supabase.from('homework').insert({
        ...values,
        created_by: teacher.id,
        assigned_date: dayjs().format('YYYY-MM-DD'),
      })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries(['teacher-homeworks']); setModalOpen(false); message.success('Homework added') },
  })

  const columns = [
    { title: 'Title', dataIndex: 'title' },
    { title: 'Batch', dataIndex: ['batches','batch_name'] },
    { title: 'Due Date', dataIndex: 'due_date', render: d => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Status', render: (_, r) => dayjs(r.due_date).isBefore(dayjs()) ? 'Overdue' : 'Active' },
  ]

  return (
    <Card title={<span style={{ color: primaryColor }}>My Homework</span>} extra={<Button type="primary" onClick={() => setModalOpen(true)}>Add Homework</Button>} bordered={false}>
      <Table dataSource={homeworks} columns={columns} rowKey="id" loading={isLoading} />

      <Modal title="Assign Homework" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isLoading}>
        <Form form={form} layout="vertical" onFinish={createMutation.mutateAsync}>
          <Form.Item name="batch_id" label="Batch" rules={[{ required: true }]}>
            <Select>{myBatches?.map(b => <Select.Option key={b.id} value={b.id}>{b.batch_name}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><TextArea /></Form.Item>
          <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default TeacherHomework