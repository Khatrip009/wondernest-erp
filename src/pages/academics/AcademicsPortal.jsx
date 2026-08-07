import { useState } from 'react'
import { Layout, Menu, Button, Space } from 'antd'
import {
  TeamOutlined,
  BookOutlined,
  HomeOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  TrophyOutlined,
  PlusOutlined,
  CalendarOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import BranchSelector from '../../components/BranchSelector'
import { useTheme } from '../../contexts/ThemeContext'

const { Header, Content } = Layout

const AcademicsPortal = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, setSelectedBranch, selectedFinancialYear, setSelectedFinancialYear } = outletContext

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const path = location.pathname
  let activeTab = 'batches'
  if (path.includes('/academics/homework')) activeTab = 'homework'
  else if (path.includes('/academics/exams')) activeTab = 'exams'
  else if (path.includes('/academics/online-classes')) activeTab = 'online-classes'
  else if (path.includes('/academics/results')) activeTab = 'results'
  else if (path.includes('/academics/certificates')) activeTab = 'certificates'
  else if (path.includes('/academics/student-batches')) activeTab = 'student-batches'

  const handleTabClick = (key) => {
    switch (key) {
      case 'batches': navigate('/academics/batches'); break
      case 'homework': navigate('/academics/homework'); break
      case 'exams': navigate('/academics/exams'); break
      case 'online-classes': navigate('/academics/online-classes'); break
      case 'results': navigate('/academics/results'); break
      case 'certificates': navigate('/academics/certificates'); break
      case 'student-batches': navigate('/academics/student-batches'); break
      case 'attendance': navigate('/academics/attendance'); break
      case 'attendance-report': navigate('/academics/attendance-report'); break;
      case 'exam-results-report': navigate('/academics/exam-results-report'); break;
      case 'batch-student-list': navigate('/academics/batch-student-list'); break;
      default: break
    }
  }

  const handleBranchChange = (branchId) => {
    if (!branchId) { setSelectedBranch?.(null); return }
    setSelectedBranch?.({ id: branchId })
  }

  return (
    <Layout style={{ background: 'transparent' }}>
      <Header
        style={{
          background: 'white',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          height: 48,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          gap: 8,
        }}
      >
        <Space size={0} align="center" style={{ flexShrink: 0 }}>
          <Menu
            mode="horizontal"
            selectedKeys={[activeTab]}
            onClick={({ key }) => handleTabClick(key)}
            style={{ borderBottom: 'none', fontSize: 14, fontFamily: fontBody }}
            items={[
              { key: 'batches', icon: <TeamOutlined />, label: 'Batches' },
              { key: 'student-batches', icon: <BookOutlined />, label: 'Student Batches' },
              { key: 'attendance', icon: <CalendarOutlined />, label: 'Attendance' },
              { key: 'attendance-report', icon: <FileTextOutlined />, label: 'Attendance Report' },
              { key: 'homework', icon: <HomeOutlined />, label: 'Homework' },
              { key: 'exams', icon: <FileTextOutlined />, label: 'Exams' },
              { key: 'online-classes', icon: <VideoCameraOutlined />, label: 'Online Classes' },
              { key: 'results', icon: <BarChartOutlined />, label: 'Results' },
              { key: 'certificates', icon: <TrophyOutlined />, label: 'Certificates' },
              { key: 'exam-results-report', icon: <FileTextOutlined />, label: 'Exam Results Report',},
              { key: 'batch-student-list', icon: <UserAddOutlined />, label: 'Batch Student List',},
            ]}
          />
          <BranchSelector
            value={selectedBranch?.id}
            onChange={handleBranchChange}
            style={{ minWidth: 120, fontFamily: fontBody }}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/academics/batches/new')}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor, flexShrink: 0, fontFamily: fontBody }}
        >
          New Batch
        </Button>
      </Header>
      <Content style={{ padding: '12px', fontFamily: fontBody }}>
        <Outlet context={{ selectedBranch, setSelectedBranch, selectedFinancialYear, setSelectedFinancialYear }} />
      </Content>
    </Layout>
  )
}

export default AcademicsPortal