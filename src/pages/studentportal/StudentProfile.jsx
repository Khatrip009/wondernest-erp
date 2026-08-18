import { Card, Descriptions, Tag, Spin, Alert } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const StudentProfile = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student-profile-full', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          parents ( father_name, mother_name, mobile, email )
        `)
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (error) return <Alert message="Error loading profile" description={error.message} type="error" showIcon />
  if (!student) return <Alert message="Student not found" type="warning" showIcon />

  return (
    <Card title={<span style={{ color: primaryColor }}>My Profile</span>} bordered={false}>
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Full Name">{student.full_name_formatted}</Descriptions.Item>
        <Descriptions.Item label="Admission No">{student.admission_no}</Descriptions.Item>
        <Descriptions.Item label="Gender">{student.gender || '-'}</Descriptions.Item>
        <Descriptions.Item label="Date of Birth">{student.dob ? dayjs(student.dob).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
        <Descriptions.Item label="Mobile">{student.mobile}</Descriptions.Item>
        <Descriptions.Item label="Email">{student.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="City">{student.city || '-'}</Descriptions.Item>
        <Descriptions.Item label="State">{student.state || '-'}</Descriptions.Item>
        <Descriptions.Item label="Pincode">{student.pincode || '-'}</Descriptions.Item>
        <Descriptions.Item label="School">{student.school_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="Standard">{student.standard || '-'}</Descriptions.Item>
        <Descriptions.Item label="Board">{student.board || '-'}</Descriptions.Item>
        <Descriptions.Item label="Father's Name">{student.parents?.father_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="Mother's Name">{student.parents?.mother_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="Parent Mobile">{student.parents?.mobile || '-'}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={student.status === 'active' ? 'green' : 'red'}>{student.status}</Tag>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  )
}

export default StudentProfile