import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Form, Select, DatePicker, TimePicker, Input, Button, Space, Table, message, Spin, Alert, Divider, Checkbox } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useStudentsForAttendance, useCreateAttendanceSession, useUpsertAttendance } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const AttendanceForm = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [attendanceData, setAttendanceData] = useState({})
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'

  // Fetch batches
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches-attendance-form', selectedBranch?.id],
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

  // ✅ Fetch teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers-attendance-form', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .order('first_name')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Fetch students for the selected batch
  const { data: students, isLoading: studentsLoading } = useStudentsForAttendance(selectedBatch)

  const createSession = useCreateAttendanceSession()
  const upsertAttendance = useUpsertAttendance()

  const onBatchChange = (batchId) => {
    setSelectedBatch(batchId)
    setAttendanceData({})
  }

  const handlePresentChange = (studentId, checked) => {
    setAttendanceData({
      ...attendanceData,
      [studentId]: {
        ...attendanceData[studentId],
        status: checked ? 'present' : 'absent',
        remarks: attendanceData[studentId]?.remarks || '',
      },
    })
  }

  const handleRemarksChange = (studentId, remarks) => {
    setAttendanceData({
      ...attendanceData,
      [studentId]: {
        ...attendanceData[studentId],
        remarks,
      },
    })
  }

  const columns = [
    { title: 'Admission No', dataIndex: 'admission_no' },
    { title: 'Student Name', dataIndex: 'full_name_formatted' },
    {
      title: 'Present',
      render: (_, record) => (
        <Checkbox
          checked={attendanceData[record.id]?.status === 'present' ?? true}
          onChange={(e) => handlePresentChange(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Remarks',
      render: (_, record) => (
        <Input
          placeholder="Remarks"
          value={attendanceData[record.id]?.remarks}
          onChange={(e) => handleRemarksChange(record.id, e.target.value)}
        />
      ),
    },
  ]

  const onFinish = async (values) => {
    try {
      setLoading(true)

      // Build session payload with start_time and end_time
      const sessionPayload = {
        batch_id: values.batch_id,
        attendance_date: values.attendance_date.format('YYYY-MM-DD'),
        start_time: values.start_time ? values.start_time.format('HH:mm:ss') : null,
        end_time: values.end_time ? values.end_time.format('HH:mm:ss') : null,
        topic_covered: values.topic_covered,
        teacher_id: values.teacher_id || null,
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
        created_by: null,
      }

      const session = await createSession.mutateAsync(sessionPayload)

      const records = Object.entries(attendanceData).map(([studentId, data]) => ({
        session_id: session.id,
        student_id: parseInt(studentId),
        status: data.status || 'absent',
        remarks: data.remarks || '',
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
      }))

      if (records.length > 0) {
        await upsertAttendance.mutateAsync(records)
      }

      message.success('Attendance saved successfully')
      navigate('/academics/attendance')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (batchesLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />

  return (
    <Card
      title={<span style={{ color: primaryColor }}>Take Attendance</span>}
      extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/attendance')}>Back</Button>}
      bordered={false}
      style={{ maxWidth: 800, margin: '0 auto', borderTop: `4px solid ${primaryColor}` }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ attendance_date: dayjs() }}>
        <Form.Item name="batch_id" label="Batch" rules={[{ required: true }]}>
          <Select
            placeholder="Select batch"
            onChange={onBatchChange}
            showSearch
            optionFilterProp="children"
          >
            {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item name="attendance_date" label="Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        {/* Start and End Time */}
        <Form.Item name="start_time" label="Start Time">
          <TimePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="end_time" label="End Time">
          <TimePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="topic_covered" label="Topic Covered">
          <TextArea rows={2} />
        </Form.Item>

        {/* ✅ Teacher dropdown with real data */}
        <Form.Item name="teacher_id" label="Teacher">
          <Select placeholder="Select teacher" allowClear loading={teachersLoading}>
            {teachers?.map(t => (
              <Option key={t.id} value={t.id}>
                {t.first_name} {t.last_name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {studentsLoading && <Spin />}
        {students && students.length > 0 && (
          <>
            <Divider>Students</Divider>
            <Table
              dataSource={students}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </>
        )}
        {students && students.length === 0 && <Alert message="No students in this batch" type="warning" />}

        <Form.Item style={{ marginTop: 16 }}>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Save Attendance
            </Button>
            <Button onClick={() => navigate('/academics/attendance')}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default AttendanceForm