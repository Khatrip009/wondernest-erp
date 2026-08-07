import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Tag, Button, Space, Divider } from 'antd'
import { SearchOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useInvoices } from '../../hooks/useFees'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Option } = Select

const InvoicesList = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const orgId = org?.id
  const branchId = selectedBranch?.id
  const financialYearId = selectedFinancialYear?.id // ✅ extract ID

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ search: '', status: '' })

  const { data, isLoading } = useInvoices(
    page,
    pageSize,
    {
      ...filters,
      branch_id: branchId,
      financial_year_id: financialYearId,
    },
    orgId // ✅ pass orgId
  )

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Invoice No</span>,
      dataIndex: 'invoice_number',
      render: (t) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{t}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Student</span>,
      dataIndex: ['students', 'full_name_formatted'],
      render: (t) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{t || '-'}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Date</span>,
      dataIndex: 'invoice_date',
      render: (d) => <span style={{ fontFamily: fontBody, color: primaryColor }}>{d}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Grand Total</span>,
      dataIndex: 'grand_total',
      render: (v) => <span style={{ fontFamily: fontBody, color: primaryColor }}>₹{Number(v).toFixed(2)}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Paid</span>,
      dataIndex: 'paid_amount',
      render: (v) => <span style={{ fontFamily: fontBody, color: primaryColor }}>₹{Number(v).toFixed(2)}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Balance</span>,
      dataIndex: 'balance_due',
      render: (v) => <span style={{ fontFamily: fontBody, color: primaryColor }}>₹{Number(v).toFixed(2)}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      render: (v) => (
        <Tag color={v === 'Paid' ? 'green' : v === 'Partially Paid' ? 'orange' : v === 'Final' ? 'blue' : 'default'}>
          {v}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          size="small"
          onClick={() => navigate(`/fees/invoices/${record.id}`)}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          View
        </Button>
      ),
    },
  ]

  // Only show if org, branch, FY are selected
  const isReady = !!orgId && !!branchId && !!financialYearId

  if (!isReady) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}`, textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#999', fontFamily: fontBody }}>
          Please select a branch and financial year to view invoices.
        </p>
      </Card>
    )
  }

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderTop: `4px solid ${primaryColor}`,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search invoice no or student"
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
            onChange={(val) => setFilters({ ...filters, status: val })}
          >
            <Option value="Draft">Draft</Option>
            <Option value="Final">Final</Option>
            <Option value="Paid">Paid</Option>
            <Option value="Partially Paid">Partially Paid</Option>
            <Option value="Cancelled">Cancelled</Option>
          </Select>
        </Col>
        <Col xs={24} sm={4}>
          <Button
            icon={<ClearOutlined />}
            onClick={() => setFilters({ search: '', status: '' })}
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
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
        size="middle"
      />
    </Card>
  )
}

export default InvoicesList