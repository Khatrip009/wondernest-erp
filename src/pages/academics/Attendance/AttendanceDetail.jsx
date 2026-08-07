import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Spin, Table } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAttendanceSession, useAttendanceRecords } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import dayjs from 'dayjs'

const AttendanceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: session, isLoading: sessionLoading } = useAttendanceSession(id)
  const { data: records, isLoading: recordsLoading, refetch } = useAttendanceRecords(id)

  if (sessionLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!session) return <Card>Session not found</Card>

  // Calculate duration if both times are present
  let duration = null
  if (session.start_time && session.end_time) {
    const start = dayjs(session.start_time, 'HH:mm:ss')
    const end = dayjs(session.end_time, 'HH:mm:ss')
    const diffMinutes = end.diff(start, 'minutes')
    if (diffMinutes > 0) {
      const hours = Math.floor(diffMinutes / 60)
      const mins = diffMinutes % 60
      duration = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`
    }
  }

  const columns = [
    { title: 'Admission No', dataIndex: ['students', 'admission_no'] },
    { title: 'Student', dataIndex: ['students', 'full_name_formatted'] },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s) => {
        const color = s === 'present' ? 'green' : s === 'late' ? 'orange' : s === 'excused' ? 'blue' : 'red'
        return <Tag color={color}>{s || 'unknown'}</Tag>
      },
    },
    { title: 'Remarks', dataIndex: 'remarks', render: (r) => r || '-' },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/attendance')}>Back</Button>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Date">{dayjs(session.attendance_date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Batch">{session.batches?.batch_name}</Descriptions.Item>
          <Descriptions.Item label="Topic">{session.topic_covered || '-'}</Descriptions.Item>
          <Descriptions.Item label="Teacher">
            {session.teachers ? `${session.teachers.first_name} ${session.teachers.last_name}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Start Time">
            {session.start_time ? dayjs(session.start_time, 'HH:mm:ss').format('HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="End Time">
            {session.end_time ? dayjs(session.end_time, 'HH:mm:ss').format('HH:mm') : '-'}
          </Descriptions.Item>
          {duration && (
            <Descriptions.Item label="Duration" span={2}>
              {duration}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card
        title="Student Attendance"
        bordered={false}
        style={{ marginTop: 16, borderTop: `4px solid ${primaryColor}` }}
      >
        <Table
          dataSource={records || []}
          columns={columns}
          rowKey="id"
          loading={recordsLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No attendance records for this session' }}
        />
      </Card>
    </div>
  )
}

export default AttendanceDetail