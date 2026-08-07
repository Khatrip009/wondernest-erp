// EmployeeList.jsx – org‑scoped with proper fallback
import { useState } from 'react'
import { Table, Card, Button, Space, Tag, Input, Row, Col, Divider } from 'antd'
import { SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useDeleteEmployee } from '../../hooks/useHR'

const EmployeeList = () => {
  const navigate = useNavigate()
  const { theme, darkMode } = useTheme()
  const { selectedBranch } = useScope()
  const { org } = useOrganization()
  const deleteMutation = useDeleteEmployee()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [search, setSearch] = useState('')

  // Fetch teachers – scoped to branch, or to the whole organisation
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['teachers-list', selectedBranch?.id, org?.id],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('*')
        .is('deleted_at', null)
        .order('first_name')

      if (selectedBranch?.id) {
        // Filter by single branch
        query = query.eq('branch_id', selectedBranch.id)
      } else if (org?.id) {
        // Get all branch IDs for this organisation
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('organization_id', org.id)

        if (branchError) throw branchError

        const branchIds = (branchData || []).map(b => b.id)

        if (branchIds.length > 0) {
          // Show teachers belonging to any of those branches, or teachers with no branch (global)
          query = query.or(
            `branch_id.in.(${branchIds.join(',')}),branch_id.is.null`
          )
        } else {
          // No branches – only show teachers without a branch (global teachers)
          query = query.is('branch_id', null)
        }
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id, // wait for organisation to load
  })

  // Show error if any
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'red' }}>Failed to load employees: {error.message}</p>
      </div>
    )
  }

  const filtered = employees?.filter(e =>
    `${e.first_name} ${e.last_name} ${e.employee_code} ${e.mobile}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const columns = [
    { title: 'Code', dataIndex: 'employee_code' },
    { title: 'Name', render: (_, r) => `${r.first_name} ${r.last_name}` },
    { title: 'Mobile', dataIndex: 'mobile' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'active' ? 'green' : 'red'}>{s}</Tag> },
    {
      title: 'Actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/hr/employees/${r.id}`)}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/hr/employees/${r.id}/edit`)}>Edit</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => { if (window.confirm('Delete?')) deleteMutation.mutate(r.id) }}>Delete</Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8, fontFamily: fontBody }}>
      <Card
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          borderTop: `4px solid ${primaryColor}`,
        }}
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Employees</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/hr/employees/new')}>
            Add Employee
          </Button>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </Card>
    </div>
  )
}

export default EmployeeList