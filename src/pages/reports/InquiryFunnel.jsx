import { Button, Card, Table, Typography, Space, Spin } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useFunnelData } from '../../hooks/useReports'
import { exportReportPDF } from '../../utils/pdfExport'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Title } = Typography

const InquiryFunnel = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const { data, isLoading } = useFunnelData()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  const columns = [
    {
      title: 'Month',
      dataIndex: 'month',
      render: (val) => (val ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '-'),
    },
    { title: 'Total', dataIndex: 'total_inquiries' },
    { title: 'Contacted', dataIndex: 'contacted' },
    { title: 'Demo Scheduled', dataIndex: 'demo_scheduled' },
    { title: 'Demo Conducted', dataIndex: 'demo_conducted' },
    { title: 'Converted', dataIndex: 'converted' },
    { title: 'Lost/Rejected', dataIndex: 'lost_rejected' },
    { title: 'Conversion Rate', dataIndex: 'conversion_rate', render: (val) => `${val}%` },
  ]

  const handleExport = () => {
    if (data) {
      // Use a simple PDF export or the general one
      exportReportPDF({
        title: 'Inquiry Funnel',
        subtitle: 'Monthly status breakdown',
        columns: columns,
        data: data,
        fileName: 'inquiry_funnel.pdf',
        organization: org,
        branchName: 'All Branches',
        branchAddress: '',
      })
    }
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/inquiries/reports')}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          Back to Reports
        </Button>
      </Space>

      <Card
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Inquiry Funnel</Title>}
        extra={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            Export PDF
          </Button>
        }
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : (
          <Table
            dataSource={data}
            columns={columns}
            rowKey="month"
            scroll={{ x: 'max-content' }}
            pagination={false}
            size="middle"
            bordered={false}
          />
        )}
      </Card>
    </div>
  )
}

export default InquiryFunnel