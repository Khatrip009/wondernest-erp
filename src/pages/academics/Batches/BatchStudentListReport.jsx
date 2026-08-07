import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, Table, Button, Space, Select, Row, Col, Tag, message, Alert } from 'antd'
import { DownloadOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useBatchStudentList } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import { exportBatchStudentListPDF } from '../../../utils/exportBatchStudentListPDF'
import { useOrganization } from '../../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Option } = Select

const BatchStudentListReport = () => {
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [filters, setFilters] = useState({
    batch_id: null,
  })

  // Fetch batches for filter dropdown
  const { data: batches, error: batchesError } = useQuery({
    queryKey: ['batches-student-list', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('batches').select('id, batch_name, courses(name)').eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const queryFilters = {
    batch_id: filters.batch_id || undefined,
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  }

  const { data: reportData, isLoading, refetch, error: reportError } = useBatchStudentList(queryFilters)

  const handleExportPDF = () => {
    if (!reportData || reportData.length === 0) {
      message.warning('No data to export')
      return
    }
    const batchName = batches?.find(b => b.id === filters.batch_id)?.batch_name || ''
    exportBatchStudentListPDF({
      reportData,
      organization: org || {},
      theme,
      branchName: selectedBranch?.branch_name || 'All Branches',
      batchFilter: batchName || 'All Batches',
    })
    message.success('PDF exported')
  }

  const expandedRowRender = (batch) => (
    <Table
      dataSource={batch.students || []}
      columns={[
        { title: 'Adm No', dataIndex: 'admission_no', width: 120 },
        { title: 'Student', dataIndex: 'full_name_formatted' },
        { title: 'Mobile', dataIndex: 'mobile', render: (v) => v || '-' },
        { title: 'Email', dataIndex: 'email', render: (v) => v || '-' },
        { title: 'DOB', dataIndex: 'dob', render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
        { title: 'Gender', dataIndex: 'gender', render: (v) => v || '-' },
        { title: 'Enrolled', dataIndex: 'enrollment_date', render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
      ]}
      rowKey="id"
      pagination={false}
      size="small"
    />
  )

  const columns = [
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Batch</span>,
      dataIndex: 'batch_name',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Course</span>,
      dataIndex: ['courses', 'name'],
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Teacher</span>,
      render: (_, record) => record.teachers ? `${record.teachers.first_name} ${record.teachers.last_name}` : '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Students</span>,
      dataIndex: 'total_students',
      align: 'center',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Start Date</span>,
      dataIndex: 'start_date',
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>End Date</span>,
      dataIndex: 'end_date',
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
  ]

  if (batchesError) return <Alert message="Error loading batches" description={batchesError.message} type="error" showIcon />
  if (reportError) return <Alert message="Error loading report" description={reportError.message} type="error" showIcon />

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Select
            placeholder="Select Batch"
            allowClear
            style={{ width: '100%' }}
            value={filters.batch_id || undefined}
            onChange={(val) => setFilters({ ...filters, batch_id: val })}
            showSearch
            optionFilterProp="children"
          >
            {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name} ({b.courses?.name})</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={12}>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            <Button icon={<ClearOutlined />} onClick={() => setFilters({ batch_id: null })}>Clear</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportPDF}>Export PDF</Button>
          </Space>
        </Col>
      </Row>
      <Table
        dataSource={reportData || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} batches` }}
        size="middle"
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => record.students && record.students.length > 0,
        }}
        locale={{ emptyText: 'No batches found' }}
      />
    </Card>
  )
}

export default BatchStudentListReport