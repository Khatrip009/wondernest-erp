// Take attendance – scoped to teacher's own batches and students
import { useState } from 'react'
import { Card, Form, Select, DatePicker, TimePicker, Input, Button, Table, message, Spin, Divider, Checkbox } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const TeacherAttendance = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const [form] = Form.useForm()
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [attendanceData, setAttendanceData] = useState({})
  const [loading, setLoading] = useState(false)

  // Teacher record
  const { data: teacher } = useQuery({
    queryKey: ['teacher-me', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  // Teacher's batches
  const { data: myBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['teacher-batches', teacher?.id],
    queryFn: async () => {
      if (!teacher) return []
      const { data: direct } = await supabase.from('batches').select('id, batch_name').eq('teacher_id', teacher.id).eq('status', 'active')
      const { data: via } = await supabase.from('teacher_batches').select('batch_id, batches!inner(id, batch_name)').eq('teacher_id', teacher.id)
      const combined = [...(direct || []), ...(via?.map(r => r.batches) || [])]
      return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    },
    enabled: !!teacher?.id,
  })

  // Students for selected batch
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher-attendance-students', selectedBatch],
    queryFn: async () => {
      if (!selectedBatch) return []
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id, students!inner(id, admission_no, full_name_formatted)')
        .eq('batch_id', selectedBatch)
        .eq('status', 'active')
      return enrollments?.map(e => e.students).filter(Boolean) || []
    },
    enabled: !!selectedBatch,
  })

  const handlePresentChange = (studentId, checked) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { status: checked ? 'present' : 'absent', remarks: prev[studentId]?.remarks || '' },
    }))
  }

  const handleRemarksChange = (studentId, remarks) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }))
  }

  const columns = [
    { title: 'Admission No', dataIndex: 'admission_no' },
    { title: 'Student Name', dataIndex: 'full_name_formatted' },
    {
      title: 'Present',
      render: (_, record) => {
        if (!record) return null
        return (
          <Checkbox
            checked={attendanceData[record.id]?.status === 'present' ?? true}
            onChange={(e) => handlePresentChange(record.id, e.target.checked)}
          />
        )
      },
    },
    {
      title: 'Remarks',
      render: (_, record) => {
        if (!record) return null
        return (
          <Input
            placeholder="Remarks"
            value={attendanceData[record.id]?.remarks}
            onChange={(e) => handleRemarksChange(record.id, e.target.value)}
          />
        )
      },
    },
  ]

  const onFinish = async (values) => {
    try {
      setLoading(true)
      // Create attendance session
      const { data: session, error: sessionErr } = await supabase
        .from('attendance_sessions')
        .insert({
          batch_id: values.batch_id,
          attendance_date: values.attendance_date.format('YYYY-MM-DD'),
          start_time: values.start_time?.format('HH:mm:ss'),
          end_time: values.end_time?.format('HH:mm:ss'),
          topic_covered: values.topic_covered,
          teacher_id: teacher.id,
        })
        .select()
        .single()
      if (sessionErr) throw sessionErr

      // Insert student attendance records
      const records = Object.entries(attendanceData).map(([studentId, data]) => ({
        session_id: session.id,
        student_id: parseInt(studentId),
        status: data.status || 'absent',
        remarks: data.remarks || '',
      }))

      if (records.length) {
        const { error: attErr } = await supabase.from('student_attendance').insert(records)
        if (attErr) throw attErr
      }

      message.success('Attendance saved')
      form.resetFields()
      setAttendanceData({})
      setSelectedBatch(null)
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title={<span style={{ color: primaryColor }}>Take Attendance</span>} bordered={false}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ attendance_date: dayjs() }}>
        <Form.Item name="batch_id" label="Batch" rules={[{ required: true }]}>
          <Select placeholder="Select your batch" onChange={setSelectedBatch} loading={batchesLoading}>
            {myBatches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="attendance_date" label="Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="start_time" label="Start Time"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="end_time" label="End Time"><TimePicker format="HH:mm" style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="topic_covered" label="Topic Covered"><TextArea rows={2} /></Form.Item>

        {studentsLoading ? <Spin /> : students?.length > 0 && (
          <>
            <Divider>Students</Divider>
            <Table dataSource={students?.filter(s => s)} columns={columns} rowKey="id" pagination={false} size="small" />
          </>
        )}
        {!studentsLoading && selectedBatch && students?.length === 0 && <p>No students in this batch.</p>}

        <Form.Item style={{ marginTop: 16 }}>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>Save Attendance</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default TeacherAttendance