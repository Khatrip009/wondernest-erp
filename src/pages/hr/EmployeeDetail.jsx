import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, Spin, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useEmployee } from '../../hooks/useHR'
import { useTheme } from '../../contexts/ThemeContext'

const { Title } = Typography

const EmployeeDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: emp, isLoading } = useEmployee(id)
  const { theme, darkMode } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  if (isLoading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }} />
  if (!emp) return <Card>Employee not found</Card>

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/employees')} style={{ borderColor: primaryColor, color: primaryColor }}>Back</Button>
        <Button icon={<EditOutlined />} onClick={() => navigate(`/hr/employees/${id}/edit`)}>Edit</Button>
      </Space>
      <Card bordered={false} style={{ backgroundColor: cardBg, borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}>
        <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading }}>{emp.first_name} {emp.last_name}</Title>
        <Descriptions bordered column={2} size="small" labelStyle={{ color: primaryColor, fontWeight: 600, fontFamily: fontBody }} contentStyle={{ fontFamily: fontBody, color: textColor }}>
          <Descriptions.Item label="Employee Code">{emp.employee_code || '-'}</Descriptions.Item>
          <Descriptions.Item label="Mobile">{emp.mobile || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{emp.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Qualification">{emp.qualification || '-'}</Descriptions.Item>
          <Descriptions.Item label="Joining Date">{emp.joining_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Status"><Tag color={emp.status === 'active' ? 'green' : 'red'}>{emp.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="Salary Type">{emp.salary_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="Monthly Salary">₹{emp.monthly_salary || 0}</Descriptions.Item>
          <Descriptions.Item label="Per Lecture Rate">₹{emp.per_lecture_rate || 0}</Descriptions.Item>
          <Descriptions.Item label="TDS %">{emp.tds_percentage || 0}%</Descriptions.Item>
          <Descriptions.Item label="Department">{emp.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="Designation">{emp.designation || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}

export default EmployeeDetail