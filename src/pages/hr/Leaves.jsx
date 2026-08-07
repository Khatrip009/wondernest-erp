import { Table, Card, Button, Tag, Space, Typography, message } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useLeaves, useUpdateLeaveStatus } from '../../hooks/useHR'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'

const Leaves = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch } = useScope()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const { data: leaves, isLoading, refetch } = useLeaves(selectedBranch?.id)
  const updateStatus = useUpdateLeaveStatus()

  const handleAction = (id, status, remarks = '') => {
    updateStatus.mutate({ id, status, adminRemarks: remarks }, { onSuccess: () => { message.success('Updated'); refetch() } })
  }

  const columns = [
    { title: <span style={{ color: primaryColor }}>Employee</span>, render: (_, r) => r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '-' },
    { title: <span style={{ color: primaryColor }}>Start</span>, dataIndex: 'start_date' },
    { title: <span style={{ color: primaryColor }}>End</span>, dataIndex: 'end_date' },
    { title: <span style={{ color: primaryColor }}>Reason</span>, dataIndex: 'reason' },
    { title: <span style={{ color: primaryColor }}>Status</span>, dataIndex: 'status', render: s => <Tag color={s === 'Approved' ? 'green' : s === 'Rejected' ? 'red' : 'orange'}>{s}</Tag> },
    { title: <span style={{ color: primaryColor }}>Action</span>, render: (_, r) => r.status === 'Pending' ? (
      <Space>
        <Button size="small" icon={<CheckOutlined />} onClick={() => handleAction(r.id, 'Approved')}>Approve</Button>
        <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleAction(r.id, 'Rejected')}>Reject</Button>
      </Space>
    ) : null },
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Leave Requests</span>}
      >
        <Table dataSource={leaves} columns={columns} rowKey="id" loading={isLoading} />
      </Card>
    </div>
  )
}

export default Leaves