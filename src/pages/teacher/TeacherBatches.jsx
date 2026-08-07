import { useQuery } from '@tanstack/react-query'
import { Card, Table, Button } from 'antd'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const TeacherBatches = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const { data: teacher } = useQuery({ queryKey: ['teacher-me', user?.id], queryFn: async () => {
    const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle()
    return data
  }, enabled: !!user?.id })

  const { data: batches, isLoading } = useQuery({
    queryKey: ['teacher-batches', teacher?.id],
    queryFn: async () => {
      if (!teacher) return []
      const { data: d } = await supabase.from('batches').select('*, courses(name)').eq('teacher_id', teacher.id).eq('status', 'active')
      const { data: v } = await supabase.from('teacher_batches').select('batch_id, batches!inner(*, courses(name))').eq('teacher_id', teacher.id)
      return [...(d||[]), ...(v?.map(r => r.batches)||[])].filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i)
    },
    enabled: !!teacher?.id,
  })

  const columns = [
    { title: 'Batch', dataIndex: 'batch_name' },
    { title: 'Course', dataIndex: ['courses','name'] },
    { title: 'Schedule', render: (_,r) => `${r.days} ${r.start_time} - ${r.end_time}` },
    { title: 'Students', render: (_,r) => <Button size="small" href={`/teacher/batches/${r.id}/students`}>View</Button> },
  ]

  return (
    <Card title={<span style={{ color: primaryColor }}>My Batches</span>} bordered={false}>
      <Table dataSource={batches} columns={columns} rowKey="id" loading={isLoading} />
    </Card>
  )
}

export default TeacherBatches