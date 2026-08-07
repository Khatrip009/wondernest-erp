import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Space, Spin, Typography,
  Form, Input, Select, DatePicker, InputNumber, message,
  Table, Modal, Popconfirm, Alert, Divider
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UserAddOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const BatchDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()
  const [studentsModal, setStudentsModal] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState([])

  // Fetch batch details
  const { data: batch, isLoading, refetch } = useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          courses (id, name),
          teachers (id, first_name, last_name),
          branches (id, branch_name)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Fetch enrolled students
  const { data: enrolledStudents, refetch: refetchStudents, isLoading: enrolledLoading } = useQuery({
    queryKey: ['batch-students', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          student_id,
          enrollment_date,
          status,
          students ( id, full_name_formatted, admission_no, mobile, course_id )
        `)
        .eq('batch_id', id)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // ✅ Fetch courses for edit dropdown (FIXED: removed non‑existent parent_id filter)
  const { data: coursesForEdit, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-for-edit', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
      if (selectedBranch?.id) {
        // If branch scope is needed, filter via batches/course relations in the future, but courses table has no branch_id
        // For now, leave unfiltered or use organization_id if available through context
        // but selectedBranch alone cannot filter courses.
      }
      const { data, error } = await query
      if (error) throw error
      console.log('📚 Courses for dropdown:', data)
      return data
    },
    enabled: true,
  })

  // ✅ Fetch teachers for the edit dropdown
  const { data: teachersForEdit, isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers-for-edit', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: true,
  })

  // Fetch all active students for this branch AND course
  const { data: allStudents, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['all-students-for-assign', batch?.branch_id, batch?.course_id],
    queryFn: async () => {
      const branchId = batch?.branch_id || selectedBranch?.id
      const courseId = batch?.course_id
      let query = supabase
        .from('students')
        .select('id, full_name_formatted, admission_no, mobile, course_id')
        .eq('status', 'active')
        .not('full_name_formatted', 'is', null)

      if (branchId) query = query.eq('branch_id', branchId)
      if (courseId) query = query.eq('course_id', courseId)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!batch,
  })

  // Compute available students (not enrolled in this batch) – ensure uniqueness
  const availableStudents = allStudents?.filter(s => {
    const isEnrolled = enrolledStudents?.some(e => e.student_id === s.id)
    return !isEnrolled
  }) || []
  const uniqueAvailable = availableStudents.filter((s, index, self) => 
    self.findIndex(t => t.id === s.id) === index
  )

  const handleEdit = () => {
    form.setFieldsValue({
      batch_name: batch.batch_name,
      course_id: batch.course_id,
      teacher_id: batch.teacher_id,
      start_date: batch.start_date ? dayjs(batch.start_date) : null,
      end_date: batch.end_date ? dayjs(batch.end_date) : null,
      capacity: batch.capacity,
      status: batch.status,
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const updates = {
        batch_name: values.batch_name,
        course_id: values.course_id,
        teacher_id: values.teacher_id || null,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        capacity: values.capacity || null,
        status: values.status,
      }
      const { error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', id)
      if (error) throw error
      message.success('Batch updated')
      setEditing(false)
      refetch()
    } catch (err) {
      message.error(err.message)
    }
  }

  const handleAssignStudents = async () => {
    if (!selectedStudentIds || selectedStudentIds.length === 0) {
      message.warning('Please select at least one student')
      return
    }

    try {
      const enrollments = selectedStudentIds.map(studentId => ({
        student_id: studentId,
        batch_id: parseInt(id),
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        branch_id: batch?.branch_id || selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
      }))

      const { error } = await supabase
        .from('student_enrollments')
        .insert(enrollments)

      if (error) throw error

      message.success(`${selectedStudentIds.length} student(s) assigned to batch`)
      setStudentsModal(false)
      setSelectedStudentIds([])
      refetchStudents()
    } catch (err) {
      message.error(err.message)
    }
  }

  const handleRemoveStudent = async (enrollmentId) => {
    try {
      const { error } = await supabase
        .from('student_enrollments')
        .update({ status: 'inactive', deleted_at: new Date().toISOString() })
        .eq('id', enrollmentId)
      if (error) throw error
      message.success('Student removed from batch')
      refetchStudents()
    } catch (err) {
      message.error(err.message)
    }
  }

  const studentColumns = [
    { title: 'Admission No', dataIndex: ['students', 'admission_no'] },
    { title: 'Student Name', dataIndex: ['students', 'full_name_formatted'] },
    { title: 'Mobile', dataIndex: ['students', 'mobile'] },
    { title: 'Enrolled On', dataIndex: 'enrollment_date', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'Action',
      render: (_, record) => (
        <Popconfirm
          title="Remove student from batch?"
          onConfirm={() => handleRemoveStudent(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
        </Popconfirm>
      ),
    },
  ]

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!batch) return <Card><p>Batch not found</p><Button onClick={() => navigate('/academics/batches')}>Back</Button></Card>

  const totalMatchingStudents = allStudents?.length || 0
  const alreadyEnrolled = enrolledStudents?.length || 0

  return (
    <div style={{ fontFamily: fontBody }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/batches')}>Back</Button>
        {!editing ? (
          <Button icon={<EditOutlined />} onClick={handleEdit} style={{ borderColor: primaryColor, color: primaryColor }}>Edit</Button>
        ) : (
          <>
            <Button icon={<SaveOutlined />} type="primary" onClick={handleSave} style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>Save</Button>
            <Button icon={<CloseOutlined />} onClick={() => setEditing(false)}>Cancel</Button>
          </>
        )}
        <Button icon={<UserAddOutlined />} onClick={() => setStudentsModal(true)} disabled={studentsLoading}>Assign Students</Button>
        <Button icon={<ReloadOutlined />} onClick={() => { refetch(); refetchStudents() }}>Refresh</Button>
      </Space>

      <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}>
        {!editing ? (
          <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} labelStyle={{ fontWeight: 500, color: primaryColor }}>
            <Descriptions.Item label="Batch Name">{batch.batch_name}</Descriptions.Item>
            <Descriptions.Item label="Course">{batch.courses?.name}</Descriptions.Item>
            <Descriptions.Item label="Teacher">{batch.teachers ? `${batch.teachers.first_name} ${batch.teachers.last_name}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="Start Date">{batch.start_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="End Date">{batch.end_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="Capacity">{batch.capacity || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={batch.status === 'active' ? 'green' : 'red'}>{batch.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="Branch">{batch.branches?.branch_name || '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item name="batch_name" label="Batch Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="course_id" label="Course" rules={[{ required: true }]}>
              <Select placeholder="Select course" loading={coursesLoading} notFoundContent="No courses found">
                {coursesForEdit?.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="teacher_id" label="Teacher">
              <Select placeholder="Select teacher" allowClear loading={teachersLoading} notFoundContent="No teachers found">
                {teachersForEdit?.map(t => <Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="start_date" label="Start Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="end_date" label="End Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="capacity" label="Capacity">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Card>

      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Enrolled Students</span>}
        bordered={false}
        style={{ marginTop: 16, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
      >
        {enrolledLoading ? <Spin /> : (
          <Table
            dataSource={enrolledStudents || []}
            columns={studentColumns}
            rowKey="id"
            pagination={false}
            size="small"
            locale={{ emptyText: 'No students enrolled yet' }}
          />
        )}
      </Card>

      <Modal
        title="Assign Students to Batch"
        open={studentsModal}
        onOk={handleAssignStudents}
        onCancel={() => { setStudentsModal(false); setSelectedStudentIds([]) }}
        okText={`Assign (${selectedStudentIds.length})`}
        confirmLoading={false}
        width={600}
      >
        {studentsError && <Alert message="Error loading students" type="error" />}
        <div style={{ marginBottom: 8 }}>
          <Text strong>Course: </Text>
          <Tag color="blue">{batch?.courses?.name || 'Not assigned'}</Tag>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            ({totalMatchingStudents} student(s) with this course, {alreadyEnrolled} already enrolled)
          </Text>
        </div>
        <Select
          mode="multiple"
          placeholder="Select one or more students"
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="children"
          value={selectedStudentIds}
          onChange={setSelectedStudentIds}
          loading={studentsLoading}
          notFoundContent={studentsLoading ? 'Loading...' : 'No available students'}
          maxTagCount="responsive"
        >
          {uniqueAvailable.map(s => (
            <Option key={s.id} value={s.id}>
              {s.full_name_formatted} ({s.admission_no})
            </Option>
          ))}
        </Select>
        {!studentsLoading && uniqueAvailable.length === 0 && (
          <Alert
            message="No students available to assign"
            description={
              totalMatchingStudents === 0
                ? `No active students found for this course (${batch?.courses?.name || 'Unknown'}). Ensure students have the course assigned in their profile.`
                : `All ${totalMatchingStudents} student(s) with this course are already enrolled in this batch.`
            }
            type={totalMatchingStudents === 0 ? 'warning' : 'info'}
            style={{ marginTop: 8 }}
          />
        )}
        {selectedStudentIds.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{selectedStudentIds.length} student(s) selected</Text>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BatchDetail