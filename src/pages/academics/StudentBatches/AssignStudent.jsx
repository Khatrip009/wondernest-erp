import { useState } from 'react'
import { Card, Select, Button, Table, Space, message, Alert, Typography, Divider } from 'antd'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useTheme } from '../../../contexts/ThemeContext'

const { Title } = Typography

const AssignStudent = () => {
  const { theme } = useTheme()
  const outletContext = useOutletContext() || {}
  const { selectedBranch, selectedFinancialYear } = outletContext
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const queryClient = useQueryClient()

  const [selectedBatch, setSelectedBatch] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])

  // Fetch all active batches
  const { data: batches } = useQuery({
    queryKey: ['batches-for-assign', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name, courses(name)')
        .eq('status', 'active')
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  // Fetch students for the selected batch (already enrolled)
  const { data: enrolledStudents, refetch: refetchEnrolled } = useQuery({
    queryKey: ['batch-enrolled-students', selectedBatch],
    queryFn: async () => {
      if (!selectedBatch) return []
      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students ( id, full_name_formatted, admission_no, mobile )
        `)
        .eq('batch_id', selectedBatch)
        .eq('status', 'active')
      if (error) throw error
      return data.map(e => e.student_id)
    },
    enabled: !!selectedBatch,
  })

  // Fetch all active students in the branch
  const { data: allStudents } = useQuery({
    queryKey: ['all-students-branch', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, full_name_formatted, admission_no, mobile')
        .eq('status', 'active')
        .not('full_name_formatted', 'is', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!selectedBranch?.id,
  })

  // Compute available students (not enrolled in selected batch)
  const availableStudents = allStudents?.filter(s => {
    return !enrolledStudents?.includes(s.id)
  }) || []

  const assignMutation = useMutation({
    mutationFn: async ({ batchId, studentIds }) => {
      const enrollments = studentIds.map(studentId => ({
        student_id: studentId,
        batch_id: batchId,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        branch_id: selectedBranch?.id,
        financial_year_id: selectedFinancialYear?.id,
      }))
      const { error } = await supabase
        .from('student_enrollments')
        .insert(enrollments)
      if (error) throw error
    },
    onSuccess: () => {
      message.success('Students assigned successfully')
      setSelectedStudents([])
      refetchEnrolled()
      queryClient.invalidateQueries(['batch-enrolled-students'])
    },
    onError: (err) => {
      message.error(err.message)
    },
  })

  const handleAssign = () => {
    if (!selectedBatch) {
      message.warning('Please select a batch')
      return
    }
    if (selectedStudents.length === 0) {
      message.warning('Please select at least one student')
      return
    }
    assignMutation.mutate({ batchId: selectedBatch, studentIds: selectedStudents })
  }

  const columns = [
    { title: 'Admission No', dataIndex: 'admission_no' },
    { title: 'Student Name', dataIndex: 'full_name_formatted' },
    { title: 'Mobile', dataIndex: 'mobile' },
  ]

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}
    >
      <Title level={4} style={{ color: primaryColor }}>Assign Students to Batch</Title>
      <Divider />

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Select
            placeholder="Select Batch"
            style={{ width: 300 }}
            value={selectedBatch}
            onChange={setSelectedBatch}
            options={batches?.map(b => ({
              label: `${b.batch_name} (${b.courses?.name || 'No Course'})`,
              value: b.id,
            }))}
          />
        </div>

        {selectedBatch && (
          <>
            <div>
              <Select
                mode="multiple"
                placeholder="Select students to assign"
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="children"
                value={selectedStudents}
                onChange={setSelectedStudents}
                notFoundContent="No available students"
              >
                {availableStudents?.map(s => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.full_name_formatted} ({s.admission_no})
                  </Select.Option>
                ))}
              </Select>
              <div style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  onClick={handleAssign}
                  loading={assignMutation.isLoading}
                  disabled={selectedStudents.length === 0}
                >
                  Assign {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                </Button>
              </div>
            </div>

            <Divider>Currently Enrolled Students</Divider>
            <Table
              dataSource={allStudents?.filter(s => enrolledStudents?.includes(s.id)) || []}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'No students enrolled' }}
            />
          </>
        )}
      </Space>
    </Card>
  )
}

export default AssignStudent