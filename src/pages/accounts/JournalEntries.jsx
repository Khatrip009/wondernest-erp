import { useState } from 'react'
import { Table, Card, Input, Select, Row, Col, Button, Space, Tag, Divider } from 'antd'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useJournalEntries } from '../../hooks/useAccounts'
import { useTheme } from '../../contexts/ThemeContext'

const JournalEntries = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { selectedBranch, selectedFinancialYear, orgId } = useOutletContext() || {}
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState({ search: '' })

  const { data, isLoading } = useJournalEntries(page, pageSize, {
    ...filters,
    orgId,                                    // ✅ pass organization ID
    branch_id: selectedBranch?.id,
    financial_year_id: selectedFinancialYear?.id,
  })

  const columns = [
    { title: 'Date', dataIndex: 'entry_date', render: (d) => new Date(d).toLocaleDateString() },
    { title: 'Reference', dataIndex: 'reference' },
    { title: 'Description', dataIndex: 'description' },
    {
      title: 'Lines',
      render: (_, record) => (
        <div>
          {record.journal_entry_lines?.slice(0, 2).map((line, i) => (
            <div key={i}>
              {line.chart_of_accounts?.account_name} ({line.debit ? `Dr ${line.debit}` : `Cr ${line.credit}`})
            </div>
          ))}
        </div>
      ),
    },
    { title: 'Posted', dataIndex: 'is_posted', render: (v) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Yes' : 'No'}</Tag> },
    {
      title: 'Actions',
      render: (_, record) => (
        <Button size="small" onClick={() => navigate(`/accounts/journal/${record.id}`)}>View</Button>
      ),
    },
  ]

  return (
    <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search reference or description"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            allowClear
          />
        </Col>
        <Col xs={24} sm={4}>
          <Button onClick={() => setFilters({ search: '' })}>Clear</Button>
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
  )
}

export default JournalEntries