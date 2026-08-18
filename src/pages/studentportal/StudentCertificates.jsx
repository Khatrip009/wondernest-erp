// src/pages/studentportal/StudentCertificates.jsx
import { Card, Table, Tag, Spin, Alert, Button, Space } from 'antd'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'   // ✅ import
import { exportCertificatePDF } from '../../utils/exportCertificatePDF'
import dayjs from 'dayjs'

const StudentCertificates = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { org } = useOrganization()   // ✅ get org
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: student } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  const { data: certificates, isLoading, error } = useQuery({
    queryKey: ['student-certificates', studentId],
    queryFn: async () => {
      if (!studentId) return []
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_no,
          issue_date,
          course_id,
          level_id,
          deleted_at,
          courses ( name ),
          course_levels ( name )
        `)
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
  })

  const handleDownloadPDF = (record) => {
    const certData = {
      certificate_no: record.certificate_no,
      student_name: student?.full_name_formatted || 'Student',
      course_name: record.courses?.name || 'Course',
      level_name: record.course_levels?.name || '',
      issue_date: record.issue_date,
    }
    // ✅ Pass actual org object
    exportCertificatePDF(certData, org, theme)
  }

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (error) return <Alert message="Error loading certificates" description={error.message} type="error" showIcon />

  const columns = [
    { title: 'Certificate No', dataIndex: 'certificate_no' },
    { title: 'Course', render: (_, record) => record.courses?.name || '-' },
    { title: 'Level', render: (_, record) => record.course_levels?.name || '-' },
    { title: 'Issue Date', dataIndex: 'issue_date', render: d => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'Status',
      dataIndex: 'deleted_at',
      render: deleted => deleted ? <Tag color="red">Revoked</Tag> : <Tag color="green">Active</Tag>,
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadPDF(record)}
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            PDF
          </Button>
          {record.certificate_url && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              href={record.certificate_url}
              target="_blank"
            >
              View
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card title={<span style={{ color: primaryColor }}>My Certificates</span>} bordered={false}>
      <Table
        dataSource={certificates}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No certificates found' }}
      />
    </Card>
  )
}

export default StudentCertificates