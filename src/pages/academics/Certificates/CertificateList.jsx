import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider, Popconfirm } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, DeleteOutlined, ReloadOutlined, PrinterOutlined } from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useCertificates, useRevokeCertificate } from '../../../hooks/useAcademics'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'
import { exportCertificatePDF } from '../../../utils/exportCertificatePDF'
import dayjs from 'dayjs'

const { Option } = Select

const CertificateList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ search: '', course_id: '' })

  const { data, isLoading, refetch } = useCertificates(page, pageSize, {
    ...filters,
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  })
  const revokeMutation = useRevokeCertificate()

  // ✅ Fixed: removed non-existent parent_id filter
  const { data: courses } = useQuery({
    queryKey: ['courses-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data
    },
  })

  const handlePrint = (record) => {
    const certData = {
      certificate_no: record.certificate_no,
      student_name: record.students?.full_name_formatted || 'Student',
      course_name: record.courses?.name || 'Course',
      level_name: record.levels?.name || '',
      issue_date: record.issue_date,
    }
    exportCertificatePDF(certData, {}, {})
  }

  const columns = [
    {
      title: 'Certificate No',
      dataIndex: 'certificate_no',
      render: (text, record) => <a onClick={() => navigate(`/academics/certificates/${record.id}`)}>{text}</a>,
    },
    {
      title: 'Student',
      dataIndex: ['students', 'full_name_formatted'],
    },
    {
      title: 'Admission No',
      dataIndex: ['students', 'admission_no'],
    },
    {
      title: 'Course',
      dataIndex: ['courses', 'name'],
    },
    {
      title: 'Level',
      dataIndex: ['levels', 'name'],
    },
    {
      title: 'Issue Date',
      dataIndex: 'issue_date',
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/academics/certificates/${record.id}`)}>View</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record)}>Print</Button>
          <Popconfirm title="Revoke this certificate?" onConfirm={() => revokeMutation.mutate(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Revoke</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search by student name or certificate no"
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} sm={5}>
          <Select
            placeholder="Course"
            allowClear
            style={{ width: '100%' }}
            value={filters.course_id || undefined}
            onChange={(val) => setFilters({ ...filters, course_id: val })}
          >
            {courses?.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={6}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/academics/certificates/generate')}>Generate</Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
          </Space>
        </Col>
      </Row>
      <Divider style={{ margin: '16px 0' }} />
      <Table
        dataSource={data?.data}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ current: page, pageSize, total: data?.count, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPageSize(ps) } }}
        size="middle"
      />
    </Card>
  )
}

export default CertificateList