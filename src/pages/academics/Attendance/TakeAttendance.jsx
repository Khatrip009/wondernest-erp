import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Form, Select, DatePicker, TimePicker, Input, Button, Table, Space, message, Spin, Alert } from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useCreateAttendanceSession, useUpsertAttendance, useStudentsForAttendance } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select

const TakeAttendance = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [attendance, setAttendance] = useState({})

  // Fetch batches
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches-take-attendance', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('batches').select('id, batch_name').eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // ✅ Use the dedicated hook for students
  const { data: students, isLoading: studentsLoading } = useStudentsForAttendance(selectedBatch)

  useEffect(() => {
    if (students) {
      const initial = {}
      students.forEach(s => {
        initial[s.id] = { status: 'present', remarks: '' }
      })
      setAttendance(initial)
    }
  }, [students])

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }))
  }

  const handleRemarksChange = (studentId, remarks) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks }
    }))
  }

  const createSession = useCreateAttendanceSession()
  const upsertAttendance = useUpsertAttendance()

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // Create session with start_time and end_time
      const sessionPayload = {
        batch_id: values.batch_id,
        attendance_date: values.attendance_date ? values.attendance_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        start_time: values.start_time ? values.start_time.format('HH:mm:ss') : null,
        end_time: values.end_time ? values.end_time.format('HH:mm:ss') : null,
        topic_covered: values.topic_covered,
        teacher_id: values.teacher_id || null,
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
      }
      const session = await createSession.mutateAsync(sessionPayload)

      // Prepare attendance records
      const records = students.map(s => ({
        session_id: session.id,
        student_id: s.id,
        status: attendance[s.id]?.status || 'present',
        remarks: attendance[s.id]?.remarks || '',
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
      }))

      await upsertAttendance.mutateAsync(records)
      message.success('Attendance saved successfully')
      navigate('/academics/attendance')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Admission No',
      dataIndex: 'admission_no',
    },
    {
      title: 'Student',
      dataIndex: 'full_name_formatted',
    },
    {
      title: 'Status',
      render: (_, record) => (
        <Select
          value={attendance[record.id]?.status || 'present'}
          onChange={(val) => handleStatusChange(record.id, val)}
          style={{ width: 120 }}
        >
          <Option value="present">Present</Option>
          <Option value="absent">Absent</Option>
          <Option value="late">Late</Option>
          <Option value="excused">Excused</Option>
        </Select>
      ),
    },
    {
      title: 'Remarks',
      render: (_, record) => (
        <Input
          placeholder="Remarks"
          value={attendance[record.id]?.remarks || ''}
          onChange={(e) => handleRemarksChange(record.id, e.target.value)}
        />
      ),
    },
  ]

  if (batchesLoading || studentsLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/attendance')}>Back</Button>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>Save Attendance</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="batch_id" label="Batch" rules={[{ required: true }]}>
            <Select placeholder="Select batch" style={{ width: 200 }} onChange={setSelectedBatch}>
              {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="attendance_date" label="Date" initialValue={dayjs()}>
            <DatePicker />
          </Form.Item>
          <Form.Item name="start_time" label="Start Time">
            <TimePicker format="HH:mm" />
          </Form.Item>
          <Form.Item name="end_time" label="End Time">
            <TimePicker format="HH:mm" />
          </Form.Item>
          <Form.Item name="topic_covered" label="Topic Covered">
            <Input placeholder="Topic" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="teacher_id" label="Teacher">
            <Select placeholder="Teacher" style={{ width: 150 }} />
          </Form.Item>
        </Form>

        {students && students.length > 0 ? (
          <Table dataSource={students} columns={columns} rowKey="id" pagination={false} size="small" />
        ) : (
          <Alert message="No students found for this batch" type="info" showIcon />
        )}
      </Card>
    </div>
  )
}

export default TakeAttendance