// src/pages/studentportal/StudentFees.jsx
import { Card, Table, Tag, Spin, Alert } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const StudentFees = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'

  const { data: student } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const studentId = student?.id

  const { data: fees, isLoading, error } = useQuery({
    queryKey: ['student-fees', studentId],
    queryFn: async () => {
      if (!studentId) return []

      // Select only existing columns (no balance_due)
      const { data, error } = await supabase
        .from('student_fees')
        .select('id, total_fee, discount, final_fee, paid_amount, status, due_date, created_at, service_id')
        .eq('student_id', studentId)
        .order('id', { ascending: false })
      if (error) throw error

      // Fetch service names
      const serviceIds = [...new Set((data || []).map(f => f.service_id).filter(Boolean))]
      let serviceMap = {}
      if (serviceIds.length > 0) {
        const { data: services, error: serviceErr } = await supabase
          .from('inventory_items')
          .select('id, item_name')
          .in('id', serviceIds)
        if (!serviceErr && services) {
          services.forEach(s => { serviceMap[s.id] = s.item_name })
        }
      }

      // Map with computed balance
      return (data || []).map(fee => ({
        ...fee,
        service_name: serviceMap[fee.service_id] || 'Course Fee',
        balance_due: (fee.final_fee || 0) - (fee.paid_amount || 0),
      }))
    },
    enabled: !!studentId,
  })

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  if (error) return <Alert message="Error loading fees" description={error.message} type="error" showIcon />

  const columns = [
    { title: 'Fee For', dataIndex: 'service_name' },
    { title: 'Total Fee', dataIndex: 'final_fee', render: v => `₹${Number(v).toLocaleString()}` },
    { title: 'Paid', dataIndex: 'paid_amount', render: v => `₹${Number(v).toLocaleString()}` },
    { title: 'Balance', dataIndex: 'balance_due', render: v => `₹${Number(v).toLocaleString()}` },
    {
      title: 'Status',
      dataIndex: 'status',
      render: s => <Tag color={s === 'Paid' ? 'green' : s === 'Partially Paid' ? 'orange' : 'red'}>{s}</Tag>,
    },
    { title: 'Due Date', dataIndex: 'due_date', render: d => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
  ]

  return (
    <Card title={<span style={{ color: primaryColor }}>My Fees</span>} bordered={false}>
      <Table
        dataSource={fees}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No fee records' }}
      />
    </Card>
  )
}

export default StudentFees