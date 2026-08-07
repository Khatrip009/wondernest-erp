import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider, Alert } from 'antd'
import { SearchOutlined, EyeOutlined, EditOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useFees } from '../../hooks/useFees'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Option } = Select

const FeesList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const { org } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ search: '', status: '', student_id: '' })

  const orgId = org?.id
  const branchId = selectedBranch?.id
  const financialYearId = selectedFinancialYear?.id // ✅ extract ID from object

  // ----- Fetch fees (only when org, branch, and FY are available) -----
  const {
    data,
    isLoading,
    error: feesError,
  } = useFees(
    page,
    pageSize,
    {
      ...filters,
      branch_id: branchId,
      financial_year_id: financialYearId,
    },
    orgId // ✅ pass orgId as fourth argument
  )

  // ----- Fetch students dropdown – scoped by organization and branch -----
  const {
    data: students,
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: ['students-dropdown', orgId, branchId],
    queryFn: async () => {
      if (!orgId) return []
      try {
        let query = supabase
          .from('students')
          .select('id, full_name_formatted, admission_no')
          .eq('status', 'active')
          .eq('organization_id', orgId)
          .order('full_name_formatted')

        if (branchId) {
          query = query.eq('branch_id', branchId)
        }

        const { data, error } = await query
        if (error) throw error
        return data || []
      } catch (err) {
        console.error('Failed to fetch students for dropdown:', err)
        return []
      }
    },
    enabled: !!orgId && !!branchId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  // ----- Table columns -----
  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: ['students', 'full_name_formatted'],
      render: (text, record) => {
        const name = text || record?.students?.full_name_formatted || 'N/A'
        const studentId = record?.student_id
        return studentId ? (
          <a
            onClick={() => navigate(`/students/${studentId}`)}
            style={{ color: primaryColor, fontFamily: fontBody }}
          >
            {name}
          </a>
        ) : (
          <span style={{ color: '#999' }}>{name}</span>
        )
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission No</span>,
      dataIndex: ['students', 'admission_no'],
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Service</span>,
      dataIndex: ['inventory_items', 'item_name'],
      render: (text) => <span style={{ fontFamily: fontBody }}>{text || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Total Fee</span>,
      dataIndex: 'total_fee',
      render: (value) => <span style={{ fontFamily: fontBody }}>₹{Number(value || 0).toFixed(2)}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Paid</span>,
      dataIndex: 'paid_amount',
      render: (value) => <span style={{ fontFamily: fontBody }}>₹{Number(value || 0).toFixed(2)}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Balance</span>,
      render: (_, record) => {
        const balance = (record.final_fee || 0) - (record.paid_amount || 0)
        return <span style={{ fontFamily: fontBody }}>₹{balance.toFixed(2)}</span>
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      render: (value) => (
        <Tag
          color={
            value === 'Paid'
              ? 'green'
              : value === 'Partially Paid'
              ? 'orange'
              : value === 'Unpaid'
              ? 'red'
              : 'default'
          }
          style={{ fontFamily: fontBody }}
        >
          {value || 'Pending'}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Due Date</span>,
      dataIndex: 'due_date',
      render: (date) => <span style={{ fontFamily: fontBody }}>{date || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/fees/${record.id}`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/fees/${record.id}/edit`)}
            style={{ fontFamily: fontBody }}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ]

  // ----- Handle errors -----
  const errorMessage = feesError?.message || studentsError?.message

  // ----- Show a message if not ready -----
  const isReady = !!orgId && !!branchId && !!financialYearId

  if (!isReady) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}`, textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#999', fontFamily: fontBody }}>
          Please select a branch and financial year to view fees.
        </p>
      </Card>
    )
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        {errorMessage && (
          <Alert
            message="Error loading data"
            description={errorMessage}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Input
              placeholder="Search student name or admission no"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
              style={{ fontFamily: fontBody }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.status || undefined}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Option value="Paid">Paid</Option>
              <Option value="Partially Paid">Partially Paid</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Unpaid">Unpaid</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Student"
              allowClear
              style={{ width: '100%', fontFamily: fontBody }}
              value={filters.student_id || undefined}
              onChange={(value) => setFilters({ ...filters, student_id: value })}
              loading={studentsLoading}
              showSearch
              optionFilterProp="children"
              notFoundContent={studentsLoading ? 'Loading...' : 'No students found'}
            >
              {students?.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.full_name_formatted} ({s.admission_no})
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button
              icon={<ClearOutlined />}
              onClick={() => setFilters({ search: '', status: '', student_id: '' })}
              block
            >
              Clear
            </Button>
          </Col>
        </Row>
        <Divider style={{ margin: '16px 0' }} />
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total: data?.count || 0,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default FeesList