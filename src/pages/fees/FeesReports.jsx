import { Card, Typography } from 'antd'
import { useTheme } from '../../contexts/ThemeContext'

const { Title } = Typography

const FeesReports = () => {
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'

  return (
    <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}` }}>
      <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading }}>Fee Reports</Title>
      <p>Coming soon – detailed fee collection reports, pending dues, and more.</p>
    </Card>
  )
}

export default FeesReports