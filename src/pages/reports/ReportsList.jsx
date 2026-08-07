// src/pages/reports/ReportsList.jsx
import { Card, Row, Col, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { inquiryReports } from '../../config/inquiryReports'   // adjust if you have a different config
import { useTheme } from '../../contexts/ThemeContext'

const { Title, Text } = Typography

const ReportsList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  return (
    <div style={{ fontFamily: fontBody, padding: '4px 0' }}>
      <Title level={4} style={{ color: primaryColor, marginBottom: 24 }}>
        Inquiry Reports
      </Title>
      <Row gutter={[16, 16]}>
        {inquiryReports.map((r) => {
          const Icon = r.icon
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={r.key}>
              <Card
                hoverable
                bordered={false}
                style={{
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s',
                  borderTop: `3px solid ${r.color}`,
                }}
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                onClick={() => navigate(`/reports/${r.key}`)}   // ✅ corrected
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 28, color: r.color, marginRight: 12, lineHeight: 1 }}>
                    <Icon />
                  </div>
                  <Title level={5} style={{ margin: 0, color: primaryColor }}>
                    {r.title}
                  </Title>
                </div>
                <Text type="secondary" style={{ fontSize: 13, flex: 1 }}>
                  {r.description}
                </Text>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

export default ReportsList