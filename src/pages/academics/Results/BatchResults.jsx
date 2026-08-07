import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, Tag, Button, Space, Spin, Typography, Row, Col, Statistic, Progress } from 'antd'
import { ArrowLeftOutlined, TrophyOutlined } from '@ant-design/icons'
import { useBatchSummary } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'

const { Title } = Typography

const BatchResults = () => {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data, isLoading } = useBatchSummary(batchId)

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (!data) return <Card>No data found for this batch</Card>

  const { students, stats, exams } = data

  const columns = [
    {
      title: 'Student',
      dataIndex: 'full_name_formatted',
      sorter: (a, b) => (a.full_name_formatted || '').localeCompare(b.full_name_formatted || ''),
    },
    {
      title: 'Admission No',
      dataIndex: 'admission_no',
    },
    {
      title: 'Total Obtained',
      dataIndex: 'totalObtained',
    },
    {
      title: 'Total Possible',
      dataIndex: 'totalPossible',
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      render: (v) => v ? `${v.toFixed(1)}%` : '0%',
      sorter: (a, b) => a.percentage - b.percentage,
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      render: (g) => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'blue' : g === 'C' ? 'orange' : 'red'}>{g}</Tag>,
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/academics/results')}>Back</Button>
      </Space>

      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Title level={4}>Batch Results Summary</Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Statistic title="Total Students" value={stats.totalStudents} />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic title="Average Percentage" value={stats.avgPercentage} suffix="%" precision={1} />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title="Top Student"
              value={stats.topStudent?.full_name_formatted || '-'}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
            />
          </Col>
          <Col xs={24} sm={6}>
            <div>
              <div>Grade Distribution</div>
              <div>
                {Object.entries(stats.gradeDistribution).map(([grade, count]) => (
                  <span key={grade}>
                    {grade}: {count}
                  </span>
                ))}
              </div>
            </div>
          </Col>
        </Row>

        <Table
          dataSource={students}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default BatchResults