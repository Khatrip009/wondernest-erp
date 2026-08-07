// src/pages/teacher/TeacherProfile.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  Card, Descriptions, Tag, Button, Space, Spin, message,
  Tabs, Form, Input, DatePicker, Select, Row, Col, Table, Alert, Modal, Typography
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { TabPane } = Tabs
const { Text } = Typography
const { Option } = Select

const TeacherProfile = () => {
  const { user } = useAuth()
  const { theme, darkMode } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  // ---------- Fetch teacher full record ----------
  const {
    data: teacher,
    isLoading: teacherLoading,
    error: teacherError,
  } = useQuery({
    queryKey: ['teacher-full-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const teacherId = teacher?.id

  // ---------- Fetch profile (for avatar / full name) ----------
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // ---------- Fetch teacher courses ----------
  const { data: teacherCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-courses', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data, error } = await supabase
        .from('teacher_courses')
        .select('course_id, courses(name)')
        .eq('teacher_id', teacherId)
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId,
  })

  // ---------- Fetch teacher batches ----------
  const { data: teacherBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['teacher-batches-list', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data, error } = await supabase
        .from('teacher_batches')
        .select('batch_id, batches(batch_name, start_time, end_time, days)')
        .eq('teacher_id', teacherId)
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId,
  })

  // ---------- Fetch monthly attendance summary ----------
  const { data: attendanceSummary, isLoading: attendanceLoading } = useQuery({
    queryKey: ['teacher-monthly-attendance', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data, error } = await supabase
        .from('teacher_monthly_attendance')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('month_year', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId,
  })

  // ---------- Fetch salary due view ----------
  const { data: salaryDue, isLoading: salaryLoading } = useQuery({
    queryKey: ['teacher-salary-due', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const { data, error } = await supabase
        .from('teacher_salary_due')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('month_year', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!teacherId,
  })

  // ---------- Set form values when teacher data loads ----------
  useEffect(() => {
    if (teacher) {
      form.setFieldsValue({
        first_name: teacher.first_name || '',
        last_name: teacher.last_name || '',
        mobile: teacher.mobile || '',
        email: teacher.email || '',
        qualification: teacher.qualification || '',
        department: teacher.department || '',
        designation: teacher.designation || '',
        date_of_birth: teacher.date_of_birth ? dayjs(teacher.date_of_birth) : null,
        gender: teacher.gender || undefined,
        emergency_contact: teacher.emergency_contact || '',
        joining_date: teacher.joining_date ? dayjs(teacher.joining_date) : null,
        salary_type: teacher.salary_type || 'fixed',
        monthly_salary: teacher.monthly_salary || 0,
        per_lecture_rate: teacher.per_lecture_rate || 0,
        tds_percentage: teacher.tds_percentage || 0,
        staff_type: teacher.staff_type || 'teacher',
      })
    }
  }, [teacher, form])

  // ---------- Update mutation ----------
  const updateProfile = useMutation({
    mutationFn: async (values) => {
      if (!teacher) throw new Error('Teacher data not loaded')
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name || '',
        mobile: values.mobile,
        email: values.email || null,
        qualification: values.qualification || null,
        department: values.department || null,
        designation: values.designation || null,
        date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : null,
        gender: values.gender || null,
        emergency_contact: values.emergency_contact || null,
        joining_date: values.joining_date ? values.joining_date.format('YYYY-MM-DD') : null,
        salary_type: values.salary_type,
        monthly_salary: values.monthly_salary || 0,
        per_lecture_rate: values.per_lecture_rate || 0,
        tds_percentage: values.tds_percentage || 0,
        staff_type: values.staff_type,
      }
      const { error } = await supabase
        .from('teachers')
        .update(payload)
        .eq('id', teacher.id)
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Profile updated successfully')
      setEditing(false)
      queryClient.invalidateQueries(['teacher-full-profile'])
    },
    onError: (err) => message.error(err.message),
  })

  // ---------- Parse bank details JSON safely ----------
  const bankDetails = useMemo(() => {
    if (!teacher?.bank_account_details) return null
    try {
      const parsed = typeof teacher.bank_account_details === 'string'
        ? JSON.parse(teacher.bank_account_details)
        : teacher.bank_account_details
      return Array.isArray(parsed) ? parsed[0] : parsed
    } catch {
      return null
    }
  }, [teacher?.bank_account_details])

  // Avatar URL from profiles
  const avatarUrl = profile?.avatar_url || null

  // Table columns
  const courseColumns = [
    { title: 'Course', render: (_, r) => r.courses?.name || '-' },
  ]

  const batchColumns = [
    { title: 'Batch', render: (_, r) => r.batches?.batch_name || '-' },
    { title: 'Schedule', render: (_, r) => {
        const days = r.batches?.days || ''
        const start = r.batches?.start_time ? dayjs(r.batches.start_time, 'HH:mm:ss').format('hh:mm A') : '-'
        const end = r.batches?.end_time ? dayjs(r.batches.end_time, 'HH:mm:ss').format('hh:mm A') : '-'
        return `${days} | ${start} - ${end}`
      }
    },
  ]

  const attendanceColumns = [
    { title: 'Month', dataIndex: 'month_year' },
    { title: 'Present', dataIndex: 'present_days' },
    { title: 'Absent', dataIndex: 'absent_days' },
    { title: 'Leave', dataIndex: 'leave_days' },
    { title: 'Half Days', dataIndex: 'half_days' },
    { title: 'Total Hours', dataIndex: 'total_hours_worked', render: v => v ? Number(v).toFixed(2) : '-' },
  ]

  const salaryColumns = [
    { title: 'Month', dataIndex: 'month_year' },
    { title: 'Gross Salary', dataIndex: 'gross_salary', render: v => `₹${Number(v).toLocaleString()}` },
    { title: 'TDS', dataIndex: 'tds_amount', render: v => `₹${Number(v).toLocaleString()}` },
    { title: 'Net Salary', dataIndex: 'net_salary', render: v => `₹${Number(v).toLocaleString()}` },
  ]

  // ---------- Conditional rendering (after all hooks) ----------
  if (teacherLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (teacherError) {
    return (
      <Alert
        message="Error loading profile"
        description={teacherError.message}
        type="error"
        showIcon
      />
    )
  }

  if (!teacher) return <Card>Teacher profile not found</Card>

  // ---------- Main render ----------
  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        variant="borderless"
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        {/* Profile Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <Space align="center" size="large">
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              backgroundColor: darkMode ? '#2c2c2c' : '#f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${primaryColor}`,
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 32, color: primaryColor }}>{teacher.first_name?.[0] || 'T'}</span>
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, color: primaryColor, fontFamily: fontHeading }}>
                {teacher.first_name} {teacher.last_name}
              </h2>
              <Space wrap>
                <Tag color="blue">{teacher.employee_code || 'No Code'}</Tag>
                <Tag color="green">{teacher.designation || 'No Designation'}</Tag>
                <Tag color={teacher.status === 'active' ? 'green' : 'red'}>{teacher.status}</Tag>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ color: textColor }}>Department: {teacher.department || '-'}</Text>
              </div>
            </div>
          </Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditing(true)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            Edit Profile
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultActiveKey="overview" style={{ marginTop: 24 }}>
          <TabPane tab={<span style={{ fontFamily: fontBody }}>Overview</span>} key="overview">
            <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
              <Descriptions.Item label="Full Name">
                {teacher.first_name} {teacher.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Employee Code">{teacher.employee_code || '-'}</Descriptions.Item>
              <Descriptions.Item label="Gender">{teacher.gender || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {teacher.date_of_birth ? dayjs(teacher.date_of_birth).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">{teacher.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Mobile">{teacher.mobile || '-'}</Descriptions.Item>
              <Descriptions.Item label="Emergency Contact">{teacher.emergency_contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="Qualification">{teacher.qualification || '-'}</Descriptions.Item>
              <Descriptions.Item label="Joining Date">
                {teacher.joining_date ? dayjs(teacher.joining_date).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Staff Type">{teacher.staff_type || '-'}</Descriptions.Item>
              <Descriptions.Item label="Linked Email">{teacher.linked_email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Organization">{org?.company_name || '-'}</Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab={<span style={{ fontFamily: fontBody }}>Professional</span>} key="professional">
            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Designation">{teacher.designation || '-'}</Descriptions.Item>
              <Descriptions.Item label="Department">{teacher.department || '-'}</Descriptions.Item>
              <Descriptions.Item label="Salary Type">
                <Tag color={teacher.salary_type === 'fixed' ? 'blue' : 'green'}>
                  {teacher.salary_type === 'fixed' ? 'Fixed' : 'Lecture Based'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Salary">₹{Number(teacher.monthly_salary || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Per Lecture Rate">₹{Number(teacher.per_lecture_rate || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="TDS Percentage">{teacher.tds_percentage || 0}%</Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab={<span style={{ fontFamily: fontBody }}>Bank Details</span>} key="bank">
            {bankDetails ? (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Bank Name">{bankDetails.bank_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Branch">{bankDetails.branch_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Account Number">{bankDetails.account_number || '-'}</Descriptions.Item>
                <Descriptions.Item label="IFSC Code">{bankDetails.ifsc_code || '-'}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Alert message="No bank details provided" type="info" showIcon />
            )}
          </TabPane>

          <TabPane tab={<span style={{ fontFamily: fontBody }}>Courses & Batches</span>} key="courses">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title={<span style={{ color: primaryColor }}>Courses</span>} variant="borderless">
                  <Table
                    dataSource={teacherCourses}
                    columns={courseColumns}
                    rowKey="course_id"
                    loading={coursesLoading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'No courses assigned' }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title={<span style={{ color: primaryColor }}>Batches</span>} variant="borderless">
                  <Table
                    dataSource={teacherBatches}
                    columns={batchColumns}
                    rowKey="batch_id"
                    loading={batchesLoading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'No batches assigned' }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={<span style={{ fontFamily: fontBody }}>Salary & Attendance</span>} key="salary">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title={<span style={{ color: primaryColor }}>Salary Due</span>} variant="borderless">
                  <Table
                    dataSource={salaryDue}
                    columns={salaryColumns}
                    rowKey="month_year"
                    loading={salaryLoading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'No salary data' }}
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title={<span style={{ color: primaryColor }}>Monthly Attendance</span>} variant="borderless">
                  <Table
                    dataSource={attendanceSummary}
                    columns={attendanceColumns}
                    rowKey="month_year"
                    loading={attendanceLoading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: 'No attendance data' }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Profile"
        open={editing}
        onCancel={() => setEditing(false)}
        onOk={() => form.submit()}
        confirmLoading={updateProfile.isLoading}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={updateProfile.mutate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="mobile" label="Mobile" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email">
                <Input type="email" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="qualification" label="Qualification">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="department" label="Department">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="designation" label="Designation">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="staff_type" label="Staff Type">
                <Select>
                  <Option value="teacher">Teacher</Option>
                  <Option value="admin">Admin</Option>
                  <Option value="accountant">Accountant</Option>
                  <Option value="support">Support</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="gender" label="Gender">
                <Select allowClear>
                  <Option value="M">Male</Option>
                  <Option value="F">Female</Option>
                  <Option value="O">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="date_of_birth" label="Date of Birth">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="joining_date" label="Joining Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="salary_type" label="Salary Type">
                <Select>
                  <Option value="fixed">Fixed</Option>
                  <Option value="lecture_based">Lecture Based</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="monthly_salary" label="Monthly Salary">
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="per_lecture_rate" label="Per Lecture Rate">
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="tds_percentage" label="TDS %">
                <Input type="number" min={0} max={30} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="emergency_contact" label="Emergency Contact">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default TeacherProfile