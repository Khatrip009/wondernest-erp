import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Spin } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import { useCertificate } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import { exportCertificatePDF } from '../../../utils/exportCertificatePDF'
import dayjs from 'dayjs'

const CertificateDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: certificate, isLoading } = useCertificate(id)

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!certificate) return <Card>Certificate not found</Card>

  const handlePrint = () => {
    const certData = {
      certificate_no: certificate.certificate_no,
      student_name: certificate.students?.full_name_formatted || 'Student',
      course_name: certificate.courses?.name || 'Course',
      level_name: certificate.levels?.name || '',
      issue_date: certificate.issue_date,
    }
    exportCertificatePDF(certData, {}, {})
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/certificates')}>Back</Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print / PDF</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Certificate No">{certificate.certificate_no}</Descriptions.Item>
          <Descriptions.Item label="Student">{certificate.students?.full_name_formatted}</Descriptions.Item>
          <Descriptions.Item label="Admission No">{certificate.students?.admission_no}</Descriptions.Item>
          <Descriptions.Item label="Course">{certificate.courses?.name}</Descriptions.Item>
          <Descriptions.Item label="Level">{certificate.levels?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Issue Date">{dayjs(certificate.issue_date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={certificate.deleted_at ? 'red' : 'green'}>
              {certificate.deleted_at ? 'Revoked' : 'Active'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}

export default CertificateDetail