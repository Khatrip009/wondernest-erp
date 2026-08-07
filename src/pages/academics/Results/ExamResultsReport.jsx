import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, Table, Button, Space, Select, Row, Col, Tag, message, Alert } from 'antd'
import { DownloadOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useExamResultsReport } from '../../../hooks/useAcademics'
import { useTheme } from '../../../contexts/ThemeContext'
import { exportExamResultsReportPDF } from '../../../utils/exportExamResultsReportPDF'
import { useOrganization } from '../../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Option } = Select

const ExamResultsReport = () => {
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [filters, setFilters] = useState({
    exam_id: null,
    batch_id: null,
  })

  // Fetch exams for filter dropdown
  const { data: exams, error: examsError } = useQuery({
    queryKey: ['exams-report-dropdown', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('exams').select('id, exam_name, batch_id, batches(batch_name)').order('exam_date', { ascending: false })
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      console.log('📚 Exams dropdown:', data)
      return data
    },
  })

  // Fetch batches for filter
  const { data: batches, error: batchesError } = useQuery({
    queryKey: ['batches-report-exam', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase.from('batches').select('id, batch_name').eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const queryFilters = {
    exam_id: filters.exam_id || undefined,
    batch_id: filters.batch_id || undefined,
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  }

  const { data: reportData, isLoading, refetch, error: reportError } = useExamResultsReport(queryFilters)

  console.log('📊 Report data:', reportData, 'Error:', reportError)

  const handleExportPDF = () => {
    if (!reportData || reportData.length === 0) {
      message.warning('No data to export')
      return
    }
    const examName = exams?.find(e => e.id === filters.exam_id)?.exam_name || ''
    exportExamResultsReportPDF({
      reportData,
      organization: org || {},
      theme,
      branchName: selectedBranch?.branch_name || 'All Branches',
      examFilter: examName || 'All Exams',
    })
    message.success('PDF exported')
  }

  const expandedRowRender = (exam) => (
    <Table
      dataSource={exam.students || []}
      columns={[
        { title: 'Adm No', dataIndex: 'admission_no', width: 120 },
        { title: 'Student', dataIndex: 'full_name_formatted' },
        {
          title: 'Marks',
          dataIndex: 'marks_obtained',
          render: (v) => v !== null ? v : '-',
        },
        {
          title: 'Grade',
          dataIndex: 'grade',
          render: (g) => g || '-',
        },
        { title: 'Remarks', dataIndex: 'remarks', render: (r) => r || '-' },
      ]}
      rowKey="id"
      pagination={false}
      size="small"
    />
  )

  const columns = [
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Exam</span>,
      dataIndex: 'exam_name',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Date</span>,
      dataIndex: 'exam_date',
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Batch</span>,
      dataIndex: ['batches', 'batch_name'],
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Subject</span>,
      dataIndex: ['subjects', 'subject_name'],
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Total Marks</span>,
      dataIndex: 'total_marks',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Students</span>,
      dataIndex: 'total_students',
      align: 'center',
    },
    {
      title: <span style={{ fontFamily: fontHeading, color: primaryColor }}>Reported</span>,
      dataIndex: 'students_with_marks',
      align: 'center',
    },
  ]

  // Error states
  if (examsError) return <Alert message="Error loading exams" description={examsError.message} type="error" showIcon />
  if (batchesError) return <Alert message="Error loading batches" description={batchesError.message} type="error" showIcon />
  if (reportError) return <Alert message="Error loading report" description={reportError.message} type="error" showIcon />

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Select Exam"
            allowClear
            style={{ width: '100%' }}
            value={filters.exam_id || undefined}
            onChange={(val) => setFilters({ ...filters, exam_id: val })}
            showSearch
            optionFilterProp="children"
          >
            {exams?.map(e => <Option key={e.id} value={e.id}>{e.exam_name} ({e.batches?.batch_name})</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={6}>
          <Select
            placeholder="Batch"
            allowClear
            style={{ width: '100%' }}
            value={filters.batch_id || undefined}
            onChange={(val) => setFilters({ ...filters, batch_id: val })}
          >
            {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={10}>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            <Button icon={<ClearOutlined />} onClick={() => setFilters({ exam_id: null, batch_id: null })}>Clear</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportPDF}>Export PDF</Button>
          </Space>
        </Col>
      </Row>
      <Table
        dataSource={reportData || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} exams` }}
        size="middle"
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => record.students && record.students.length > 0,
        }}
        locale={{ emptyText: 'No exam results found' }}
      />
    </Card>
  )
}

export default ExamResultsReport