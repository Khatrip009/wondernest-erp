import { Typography } from 'antd';
import { useAppContext } from '../contexts/useAppContext';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  const { org, user } = useAppContext();
  const { theme } = useTheme();

  // Hard‑debug: log the theme and the extracted colour
  console.log('📦 theme in Dashboard:', theme);
  const primaryColor = theme?.primary_color || '#0D47A1';
  console.log('🎨 primaryColor:', primaryColor);

  return (
    <div>
      <Title
        level={2}
        style={{
          color: primaryColor,
          fontFamily: theme?.font_heading || 'Righteous',
        }}
      >
        Welcome to {org?.company_name || 'Shreevidhya'} ERP
      </Title>

      <Paragraph
        style={{
          color: primaryColor,
          fontFamily: theme?.font_body || 'Montserrat',
        }}
      >
        You are logged in as <strong>{user?.email}</strong>.
      </Paragraph>

      {org?.tagline && (
        <Paragraph
          type="secondary"
          style={{
            fontStyle: 'italic',
            color: theme?.accent_color || '#FF1070',
            fontFamily: theme?.font_body || 'Montserrat',
          }}
        >
          “{org.tagline}”
        </Paragraph>
      )}

      <Paragraph
        style={{
          color: primaryColor,
          fontFamily: theme?.font_body || 'Montserrat',
        }}
      >
        Start managing your institute from the sidebar.
      </Paragraph>
    </div>
  );
};

export default Dashboard;