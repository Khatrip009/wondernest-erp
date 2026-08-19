import { useState } from 'react'
import { Table, Card, Button, DatePicker, Tag, Space, message } from 'antd'
import { ReloadOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useAuth } from '../../contexts/AuthContext'  // 👈 import auth
import dayjs from 'dayjs'

const TeacherAttendance = () => {
  const { theme, darkMode } = useTheme()
  const { selectedBranch } = useScope()
  const { org } = useOrganization()
  const { user } = useAuth()  // 👈 get current user

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'

  const [date, setDate] = useState(dayjs())

  // ── 1. Get the teacher record for the logged‑in user (if any) ──
  const { data: currentTeacher } = useQuery({
    queryKey: ['current-teacher', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('teachers')
        .select('id, branch_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const isTeacher = !!currentTeacher

  // ── 2. Fetch employees – filter to only the current teacher if logged in as teacher ──
  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ['teachers-active', selectedBranch?.id, org?.id, isTeacher, currentTeacher?.id],
    queryFn: async () => {
      let q = supabase
        .from('teachers')
        .select('id, first_name, last_name')
        .eq('status', 'active')
        .is('deleted_at', null)

      if (isTeacher && currentTeacher) {
        // 👇 Only the logged‑in teacher
        q = q.eq('id', currentTeacher.id)
      } else {
        // Admin view – all teachers in branch / organisation
        if (selectedBranch?.id) {
          q = q.eq('branch_id', selectedBranch.id)
        } else if (org?.id) {
          const { data: branches } = await supabase
            .from('branches')
            .select('id')
            .eq('organization_id', org.id)
          const branchIds = (branches || []).map(b => b.id)
          if (branchIds.length > 0) {
            q = q.or(`branch_id.in.(${branchIds.join(',')}),branch_id.is.null`)
          } else {
            q = q.is('branch_id', null)
          }
        }
      }
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  // ── 3. Fetch attendance – filter to current teacher if teacher, else by branch ──
  const { data: attendance, isLoading: attLoading, refetch } = useQuery({
    queryKey: ['teacher-attendance', date.format('YYYY-MM-DD'), selectedBranch?.id, isTeacher, currentTeacher?.id],
    queryFn: async () => {
      const d = date.format('YYYY-MM-DD')
      let q = supabase.from('teacher_attendance').select('*').eq('attendance_date', d)

      if (isTeacher && currentTeacher) {
        q = q.eq('teacher_id', currentTeacher.id)
      } else if (selectedBranch?.id) {
        q = q.eq('branch_id', selectedBranch.id)
      }
      const { data, error } = await q
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  // ── Mutations (no changes needed, they act on the teacher id) ──
  const checkIn = useMutation({
    mutationFn: async (teacherId) => {
      const now = dayjs().toISOString()
      const d = date.format('YYYY-MM-DD')
      const { error } = await supabase.from('teacher_attendance').upsert({
        teacher_id: teacherId,
        attendance_date: d,
        status: 'present',
        check_in: now,
        branch_id: selectedBranch?.id || null,
        organization_id: org?.id,
        financial_year_id: null,
      }, { onConflict: 'teacher_id, attendance_date' })
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Check‑in recorded')
      refetch()
    },
    onError: (err) => message.error(err.message),
  })

  const checkOut = useMutation({
    mutationFn: async (teacherId) => {
      const now = dayjs().toISOString()
      const d = date.format('YYYY-MM-DD')
      const { error } = await supabase
        .from('teacher_attendance')
        .update({ check_out: now, status: 'checked_out' })
        .eq('teacher_id', teacherId)
        .eq('attendance_date', d)
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Check‑out recorded')
      refetch()
    },
    onError: (err) => message.error(err.message),
  })

  const markPresent = useMutation({
    mutationFn: async (teacherId) => {
      const d = date.format('YYYY-MM-DD')
      const { error } = await supabase.from('teacher_attendance').upsert({
        teacher_id: teacherId,
        attendance_date: d,
        status: 'present',
        check_in: null,
        check_out: null,
        branch_id: selectedBranch?.id || null,
        organization_id: org?.id,
      }, { onConflict: 'teacher_id, attendance_date' })
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Marked present')
      refetch()
    },
    onError: (err) => message.error(err.message),
  })

  // ── Build table data (only one row if teacher) ──
  const tableData = (employees || []).map(emp => {
    const record = attendance?.find(a => a.teacher_id === emp.id)
    return {
      key: emp.id,
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      check_in: record?.check_in,
      check_out: record?.check_out,
      status: record?.status || null,
      hasRecord: !!record,
    }
  })

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Employee</span>,
      dataIndex: 'name',
      render: (text) => <span style={{ fontFamily: fontBody, color: textColor }}>{text}</span>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Check‑in</span>,
      dataIndex: 'check_in',
      render: (val) => val
        ? dayjs(val).format('DD/MM/YYYY HH:mm')
        : <Tag color="default">Not yet</Tag>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Check‑out</span>,
      dataIndex: 'check_out',
      render: (val) => val
        ? dayjs(val).format('DD/MM/YYYY HH:mm')
        : <Tag color="default">Not yet</Tag>,
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      render: (_, record) => {
        const alreadyIn = record.check_in && !record.check_out
        const alreadyOut = record.check_in && record.check_out

        return (
          <Space>
            <Button
              icon={<LoginOutlined />}
              size="small"
              type={!alreadyIn ? 'primary' : 'default'}
              disabled={alreadyIn || alreadyOut}
              onClick={() => checkIn.mutate(record.id)}
            >
              Check‑in
            </Button>
            <Button
              icon={<LogoutOutlined />}
              size="small"
              type={alreadyIn ? 'primary' : 'default'}
              disabled={!alreadyIn || alreadyOut}
              onClick={() => checkOut.mutate(record.id)}
            >
              Check‑out
            </Button>
            {!record.hasRecord && (
              <Button
                size="small"
                onClick={() => markPresent.mutate(record.id)}
              >
                Present
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        bordered={false}
        style={{
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Attendance (Check‑in / Check‑out)</span>}
        extra={
          <Space>
            <DatePicker value={date} onChange={setDate} />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
          </Space>
        }
      >
        <Table
          dataSource={tableData}
          columns={columns}
          loading={empLoading || attLoading}
          pagination={false}
          size="middle"
          rowKey="id"
        />
      </Card>
    </div>
  )
}

export default TeacherAttendance