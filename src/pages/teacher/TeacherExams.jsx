// src/pages/teacher/TeacherExams.jsx
import { useState } from 'react'
import {
  Card, Table, Button, Space, Spin, Tag, Modal, Form,
  Input, Select, DatePicker, InputNumber, message, Descriptions, Empty
} from 'antd'
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select

const TeacherExams = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [detailExam, setDetailExam] = useState(null)
  const [form] = Form.useForm()

  // ---------- Fetch teacher record ----------
  const { data: teacher } = useQuery({
    queryKey: ['teacher-me', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  const teacherId = teacher?.id

  // ---------- Fetch teacher's batches ----------
  const { data: myBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['teacher-batches', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data: direct } = await supabase.from('batches').select('id, batch_name, branch_id, financial_year_id').eq('teacher_id', teacherId).eq('status', 'active')
      const { data: via } = await supabase.from('teacher_batches').select('batch_id, batches!inner(id, batch_name, branch_id, financial_year_id)').eq('teacher_id', teacherId)
      const viaBatches = via?.map(r => r.batches) || []
      return [...(direct || []), ...viaBatches].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    },
    enabled: !!teacherId,
  })

  // ---------- Fetch exams for those batches ----------
  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['teacher-exams', teacherId, myBatches?.length],
    queryFn: async () => {
      if (!teacherId || !myBatches?.length) return []
      const batchIds = myBatches.map(b => b.id)
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          batches ( batch_name ),
          subjects ( subject_name )
        `)
        .in('batch_id', batchIds)
        .order('exam_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId && myBatches?.length > 0,
  })

  // ---------- Subjects dropdown (optional) ----------
  const { data: subjects } = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, subject_name')
      if (error) throw error
      return data || []
    },
  })

  // ---------- Students for detail view (when detail exam open) ----------
  const { data: detailStudents, isLoading: detailStudentsLoading } = useQuery({
    queryKey: ['exam-detail-students', detailExam?.id],
    queryFn: async () => {
      if (!detailExam?.batch_id) return []
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id, students!inner(id, full_name_formatted, admission_no)')
        .eq('batch_id', detailExam.batch_id)
        .eq('status', 'active')
      const students = enrollments?.map(e => e.students) || []

      // Fetch existing results for this exam
      const { data: results } = await supabase
        .from('student_results')
        .select('student_id, marks_obtained, grade, remarks')
        .eq('exam_id', detailExam.id)

      const resultMap = {}
      ;(results || []).forEach(r => { resultMap[r.student_id] = r })

      return students.map(s => ({
        ...s,
        marks_obtained: resultMap[s.id]?.marks_obtained ?? null,
        grade: resultMap[s.id]?.grade ?? null,
        remarks: resultMap[s.id]?.remarks ?? null,
      }))
    },
    enabled: !!detailExam?.id,
  })

  // ---------- Mutations ----------
  const upsertExam = useMutation({
    mutationFn: async (values) => {
      const payload = {
        exam_name: values.exam_name,
        batch_id: values.batch_id,
        exam_date: values.exam_date.format('YYYY-MM-DD'),
        total_marks: values.total_marks || 100,
        subject_id: values.subject_id || null,
        branch_id: values.branch_id,
        financial_year_id: values.financial_year_id,
      }
      if (editingExam) {
        const { error } = await supabase.from('exams').update(payload).eq('id', editingExam.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('exams').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      message.success(editingExam ? 'Exam updated' : 'Exam created')
      setModalOpen(false)
      setEditingExam(null)
      form.resetFields()
      queryClient.invalidateQueries(['teacher-exams'])
    },
    onError: (err) => message.error(err.message),
  })

  const deleteExam = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('exams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Exam deleted')
      queryClient.invalidateQueries(['teacher-exams'])
    },
    onError: (err) => message.error(err.message),
  })

  // ---------- Handlers ----------
  const openCreateModal = () => {
    setEditingExam(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEditModal = (record) => {
    setEditingExam(record)
    form.setFieldsValue({
      exam_name: record.exam_name,
      batch_id: record.batch_id,
      exam_date: dayjs(record.exam_date),
      total_marks: record.total_marks,
      subject_id: record.subject_id || undefined,
      branch_id: record.branch_id,
      financial_year_id: record.financial_year_id,
    })
    setModalOpen(true)
  }

  const handleBatchChange = (batchId) => {
    const batch = myBatches?.find(b => b.id === batchId)
    if (batch) {
      form.setFieldsValue({
        branch_id: batch.branch_id,
        financial_year_id: batch.financial_year_id,
      })
    }
  }

  const openDetail = (record) => {
    setDetailExam(record)
  }

  const columns = [
    {
      title: 'Exam',
      dataIndex: 'exam_name',
      render: (text, record) => (
        <a onClick={() => openDetail(record)} style={{ color: primaryColor }}>{text}</a>
      ),
    },
    { title: 'Batch', dataIndex: ['batches', 'batch_name'] },
    { title: 'Subject', render: (_, r) => r.subjects?.subject_name || '-' },
    { title: 'Date', dataIndex: 'exam_date', render: d => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Total Marks', dataIndex: 'total_marks' },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>Edit</Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (window.confirm('Delete this exam?')) deleteExam.mutate(record.id)
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ]

  const isLoading = batchesLoading || examsLoading

  return (
    <Card
      title={<span style={{ color: primaryColor }}>My Exams</span>}
      bordered={false}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Add Exam</Button>}
    >
      <Table
        dataSource={exams}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingExam ? 'Edit Exam' : 'New Exam'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={upsertExam.isLoading}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={upsertExam.mutate}
          initialValues={{ total_marks: 100 }}
        >
          <Form.Item name="batch_id" label="Batch" rules={[{ required: true }]}>
            <Select
              placeholder="Select batch"
              onChange={handleBatchChange}
              disabled={!!editingExam}
            >
              {myBatches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="exam_name" label="Exam Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="exam_date" label="Exam Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="total_marks" label="Total Marks" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="subject_id" label="Subject (optional)">
            <Select allowClear placeholder="Select subject">
              {subjects?.map(s => <Option key={s.id} value={s.id}>{s.subject_name}</Option>)}
            </Select>
          </Form.Item>
          {/* Hidden fields for branch/fy */}
          <Form.Item name="branch_id" hidden><Input /></Form.Item>
          <Form.Item name="financial_year_id" hidden><Input /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={<span style={{ color: primaryColor }}>Exam Details</span>}
        open={!!detailExam}
        onCancel={() => setDetailExam(null)}
        footer={null}
        width={700}
        destroyOnClose
      >
        {detailExam && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Exam">{detailExam.exam_name}</Descriptions.Item>
              <Descriptions.Item label="Batch">{detailExam.batches?.batch_name}</Descriptions.Item>
              <Descriptions.Item label="Subject">{detailExam.subjects?.subject_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(detailExam.exam_date).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Total Marks">{detailExam.total_marks}</Descriptions.Item>
              <Descriptions.Item label="Students">
                {detailStudentsLoading ? <Spin size="small" /> : detailStudents?.length || 0}
              </Descriptions.Item>
            </Descriptions>

            <h4 style={{ marginTop: 16 }}>Student Results</h4>
            {detailStudentsLoading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            ) : detailStudents?.length ? (
              <Table
                dataSource={detailStudents}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Admission No', dataIndex: 'admission_no' },
                  { title: 'Student', dataIndex: 'full_name_formatted' },
                  { title: 'Marks', dataIndex: 'marks_obtained', render: v => v ?? '-' },
                  { title: 'Grade', dataIndex: 'grade', render: v => v ?? '-' },
                  { title: 'Remarks', dataIndex: 'remarks', render: v => v ?? '-' },
                ]}
              />
            ) : (
              <Empty description="No students enrolled in this batch" />
            )}
          </>
        )}
      </Modal>
    </Card>
  )
}

export default TeacherExams