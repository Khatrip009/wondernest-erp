import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Card, Select, Table, Tag, Button, Space, Spin, Typography, Row, Col, Statistic } from 'antd'
import { EyeOutlined, BarChartOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useBatchResults } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'

const { Title } = Typography
const { Option } = Select

const ResultsDashboard = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'

  const [selectedBatch, setSelectedBatch] = useState(null)

  // Fetch batches for dropdown
  const { data: batches } = useQuery({
    queryKey: ['batches-results', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const { data, isLoading } = useBatchResults(selectedBatch)

  // Dynamically generate columns for each exam
  const examColumns = (data?.exams || []).map(exam => ({
    title: `${exam.exam_name} (${exam.total_marks})`,
    dataIndex: ['examDetails', exam.id],
    render: (_, record) => {
      const detail = record.examDetails?.find(d => d.exam_id === exam.id)
      return detail ? `${detail.obtained}/${detail.possible}` : '-'
    },
    sorter: (a, b) => {
      const aDetail = a.examDetails?.find(d => d.exam_id === exam.id)
      const bDetail = b.examDetails?.find(d => d.exam_id === exam.id)
      return (aDetail?.obtained || 0) - (bDetail?.obtained || 0)
    },
  }))

  const baseColumns = [
    {
      title: 'Admission No',
      dataIndex: 'admission_no',
      width: 120,
    },
    {
      title: 'Student',
      dataIndex: 'full_name_formatted',
      sorter: (a, b) => (a.full_name_formatted || '').localeCompare(b.full_name_formatted || ''),
    },
    ...examColumns,
    {
      title: 'Total',
      dataIndex: 'totalObtained',
      render: (v) => v || 0,
      sorter: (a, b) => a.totalObtained - b.totalObtained,
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
      render: (g) => {
        const color = g === 'A' ? 'green' : g === 'B' ? 'blue' : g === 'C' ? 'orange' : 'red'
        return <Tag color={color}>{g}</Tag>
      },
    },
    {
      title: 'Action',
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/academics/results/student/${record.id}`)}
        >
          Report Card
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Select
              placeholder="Select Batch"
              style={{ width: '100%' }}
              value={selectedBatch}
              onChange={setSelectedBatch}
              allowClear
            >
              {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Button icon={<BarChartOutlined />} disabled={!selectedBatch} onClick={() => navigate(`/academics/results/batch/${selectedBatch}`)}>
              Batch Summary
            </Button>
          </Col>
        </Row>
      </Card>

      {selectedBatch && (
        <Card
          bordered={false}
          style={{ marginTop: 16, borderTop: `4px solid ${primaryColor}` }}
        >
          {isLoading ? <Spin /> : (
            <Table
              dataSource={data?.students || []}
              columns={baseColumns}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              size="middle"
              scroll={{ x: 'max-content' }}
            />
          )}
        </Card>
      )}
    </div>
  )
}

export default ResultsDashboard