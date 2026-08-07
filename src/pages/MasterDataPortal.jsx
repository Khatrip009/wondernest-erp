import { useState } from 'react'
import {
  Button, Space, Table, Modal, Form, Input, InputNumber,
  Select, Switch, message, Card, Typography, Tabs, Tag, Row, Col, DatePicker
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { useOrganization } from '../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { TabPane } = Tabs
const { Title, Text } = Typography
const { confirm } = Modal

const MasterDataPortal = () => {
  const { theme } = useTheme()
  const { org } = useOrganization()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const queryClient = useQueryClient()
  const orgId = org?.id

  // ---------- Shared helpers ----------
  const handleDelete = (title, onOk) => {
    confirm({
      title: `Delete this ${title}?`,
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      onOk,
    })
  }

  // ---------- 1. Courses ----------
  const useCourses = () => useQuery({
    queryKey: ['master-courses', orgId],
    queryFn: async () => {
      let query = supabase.from('courses').select('*').is('parent_id', null).order('name')
      if (orgId) query = query.eq('organization_id', orgId)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!orgId
  })

  const createCourse = useMutation({
    mutationFn: async (values) => {
      const payload = { ...values, name: values.course_name, organization_id: orgId }
      delete payload.course_name
      const { data, error } = await supabase.from('courses').insert(payload).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Failed to create course')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-courses'])
  })

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const payload = { ...values, name: values.course_name }
      delete payload.course_name
      const { data, error } = await supabase.from('courses').update(payload).eq('id', id).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Course not found or permission denied')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-courses'])
  })

  const deleteCourse = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('courses').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-courses'])
  })

  // ---------- Levels ----------
  const useLevels = (courseId) => useQuery({
    queryKey: ['master-levels', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('parent_id', courseId)
        .is('deleted_at', null)
        .order('level_number')
      if (error) throw error
      return data || []
    },
    enabled: !!courseId
  })

  // ---------- Teachers ----------
  const useTeachers = () => useQuery({
    queryKey: ['master-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('*').order('first_name')
      if (error) throw error
      return data || []
    }
  })

  // ---------- Batches ----------
  const useBatches = () => useQuery({
    queryKey: ['master-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*, courses(name), teachers(first_name, last_name)')
        .order('batch_name')
      if (error) throw error
      return data || []
    }
  })

  // ---------- Tax Rates ----------
  const useTaxRates = () => useQuery({
    queryKey: ['master-tax-rates', orgId],
    queryFn: async () => {
      let query = supabase.from('tax_rates').select('*').order('rate')
      if (orgId) query = query.eq('organization_id', orgId)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!orgId
  })

  // ---------- Inquiry Sources ----------
  const useSources = () => useQuery({
    queryKey: ['master-sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inquiry_sources').select('*').order('name')
      if (error) throw error
      return data || []
    }
  })

  // ---------- Mediums ----------
  const useMediums = () => useQuery({
    queryKey: ['master-mediums'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mediums').select('*').order('name')
      if (error) throw error
      return data || []
    }
  })

  // ---------- Branches ----------
  const useBranches = () => useQuery({
    queryKey: ['master-branches', orgId],
    queryFn: async () => {
      let query = supabase.from('branches').select('*').order('branch_name')
      if (orgId) query = query.eq('organization_id', orgId)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!orgId
  })

  const createBranch = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('branches').insert({ ...values, organization_id: orgId }).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Failed to create branch')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-branches'])
  })
  const updateBranch = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase.from('branches').update(values).eq('id', id).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Branch not found or permission denied')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-branches'])
  })
  const deleteBranch = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('branches').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-branches'])
  })

  // ---------- Financial Years ----------
  const useFinancialYears = () => useQuery({
    queryKey: ['master-financial-years', orgId],
    queryFn: async () => {
      let query = supabase.from('financial_years').select('*').order('start_date', { ascending: false })
      if (orgId) query = query.eq('organization_id', orgId)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!orgId
  })

  const createFY = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('financial_years').insert({ ...values, organization_id: orgId }).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Failed to create financial year')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-financial-years'])
  })
  const updateFY = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase.from('financial_years').update(values).eq('id', id).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Financial year not found or permission denied')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-financial-years'])
  })
  const deleteFY = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('financial_years').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-financial-years'])
  })

  // ---------- Subjects ----------
  const useSubjects = () => useQuery({
    queryKey: ['master-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*, courses(name), branches(branch_name), financial_years(name)')
        .order('subject_name')
      if (error) throw error
      return data || []
    }
  })

  const { data: courseOptions } = useQuery({
    queryKey: ['master-courses-options', orgId],
    queryFn: async () => {
      let query = supabase.from('courses').select('id, name').is('parent_id', null).eq('status', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })
  const { data: branchOptions } = useQuery({
    queryKey: ['master-branch-options', orgId],
    queryFn: async () => {
      let query = supabase.from('branches').select('id, branch_name').eq('is_active', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })
  const { data: fyOptions } = useQuery({
    queryKey: ['master-fy-options', orgId],
    queryFn: async () => {
      let query = supabase.from('financial_years').select('id, name').eq('is_active', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })

  const createSubject = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('subjects').insert(values).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Failed to create subject')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-subjects'])
  })
  const updateSubject = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase.from('subjects').update(values).eq('id', id).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Subject not found or permission denied')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-subjects'])
  })
  const deleteSubject = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('subjects').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-subjects'])
  })

  // ---------- HSN/SAC Codes ----------
  const useHsnSac = () => useQuery({
    queryKey: ['master-hsn-sac'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsn_sac_codes')
        .select('*, tax_rates(rate, name)')
        .order('code')
      if (error) throw error
      return data || []
    }
  })

  const { data: taxRateOptions } = useQuery({
    queryKey: ['master-tax-rate-options', orgId],
    queryFn: async () => {
      let query = supabase.from('tax_rates').select('id, name, rate').eq('is_active', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })

  const createHsn = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('hsn_sac_codes').insert(values).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Failed to create HSN/SAC code')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-hsn-sac'])
  })
  const updateHsn = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('hsn_sac_codes')
        .update(values)
        .eq('id', id)
        .select()
        .maybeSingle()          // ✅ avoid 406
      if (error) throw error
      if (!data) throw new Error('HSN/SAC code not found or permission denied')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-hsn-sac'])
  })
  const deleteHsn = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('hsn_sac_codes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-hsn-sac'])
  })

  // ---------- Vendors ----------
  const useVendors = () => useQuery({
    queryKey: ['master-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*, branches(branch_name), financial_years(name)')
        .order('vendor_name')
      if (error) throw error
      return data || []
    }
  })

  const createVendor = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('vendors').insert(values).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Failed to create vendor')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-vendors'])
  })
  const updateVendor = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase.from('vendors').update(values).eq('id', id).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Vendor not found or permission denied')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-vendors'])
  })
  const deleteVendor = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-vendors'])
  })

  // ---------- Inventory Items ----------
  const useInventoryItems = () => useQuery({
    queryKey: ['master-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory_items').select('*').order('item_name')
      if (error) throw error
      return data || []
    }
  })

  const createInventoryItem = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('inventory_items').insert(values).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Failed to create inventory item')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-inventory'])
  })
  const updateInventoryItem = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase.from('inventory_items').update(values).eq('id', id).select().maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Item not found or permission denied')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-inventory'])
  })
  const deleteInventoryItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('inventory_items').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-inventory'])
  })

  // ---------- Dropdown queries for Inventory ----------
  const { data: coursesDropdown } = useQuery({
    queryKey: ['courses-dropdown', orgId],
    queryFn: async () => {
      let query = supabase.from('courses').select('id, name').is('parent_id', null).eq('status', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })
  const { data: taxRatesDropdown } = useQuery({
    queryKey: ['tax-rates-dropdown', orgId],
    queryFn: async () => {
      let query = supabase.from('tax_rates').select('id, name, rate').eq('is_active', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })
  const { data: branchesDropdown } = useQuery({
    queryKey: ['branches-dropdown', orgId],
    queryFn: async () => {
      let query = supabase.from('branches').select('id, branch_name').eq('is_active', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })
  const { data: fyDropdown } = useQuery({
    queryKey: ['financial-years-dropdown', orgId],
    queryFn: async () => {
      let query = supabase.from('financial_years').select('id, name').eq('is_active', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })

  // ===================== TAB COMPONENTS =====================

  // ----- Courses Tab -----
  function CoursesTab() {
    const { data: courses, isLoading } = useCourses()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const ExpandedLevels = ({ courseId }) => {
      const { data: levels, isLoading: levelsLoading } = useLevels(courseId)
      if (levelsLoading) return <Text style={{ color: primaryColor }}>Loading levels...</Text>
      return (
        <div style={{ padding: '0 24px' }}>
          <Space style={{ marginBottom: 8 }}>
            <Text strong style={{ color: primaryColor }}>Levels</Text>
            <Button size="small" type="primary" icon={<PlusOutlined />}>Add Level</Button>
          </Space>
          {levels?.length ? levels.map(l => (
            <Card key={l.id} size="small" style={{ marginBottom: 4, borderColor: primaryColor }}>
              <Row justify="space-between">
                <Col>
                  <Text strong style={{ color: primaryColor }}>{l.name}</Text>
                  <Text style={{ color: primaryColor }}> (Level {l.level_number}) – {l.duration_months} months</Text>
                </Col>
                <Col>
                  <Space>
                    <Button size="small">Edit</Button>
                    <Button size="small" danger>Delete</Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          )) : <Text type="secondary" style={{ color: primaryColor }}>No levels yet.</Text>}
        </div>
      )
    }

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateCourse.mutateAsync({ id: modal.record.id, ...values })
          message.success('Course updated')
        } else {
          await createCourse.mutateAsync(values)
          message.success('Course created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) {
        message.error(err.message)
      }
    }

    const columns = [
      { title: <span style={{ color: primaryColor }}>Name</span>, dataIndex: 'name', key: 'name' },
      { title: <span style={{ color: primaryColor }}>Duration (months)</span>, dataIndex: 'duration_months', key: 'duration' },
      {
        title: <span style={{ color: primaryColor }}>Status</span>,
        dataIndex: 'status',
        key: 'status',
        render: (v) => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
      },
      {
        title: <span style={{ color: primaryColor }}>Actions</span>,
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue({ ...record, course_name: record.name }); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('course', () => deleteCourse.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Courses</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Course</Button>}
      >
        <Table dataSource={courses || []} columns={columns} rowKey="id" loading={isLoading} expandable={{ expandedRowRender: (course) => <ExpandedLevels courseId={course.id} /> }} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Course' : 'New Course'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createCourse.isLoading || updateCourse.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record ? { ...modal.record, course_name: modal.record.name } : { status: true }}>
            <Form.Item name="course_name" label={<span style={{ color: primaryColor }}>Course Name</span>} rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label={<span style={{ color: primaryColor }}>Description</span>}><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="duration_months" label={<span style={{ color: primaryColor }}>Duration (months)</span>}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label={<span style={{ color: primaryColor }}>Active</span>} valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Teachers Tab -----
  function TeachersTab() {
    const { data: teachers, isLoading } = useTeachers()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createTeacher = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('teachers').insert(values).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Failed to create teacher')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-teachers'])
    })
    const updateTeacher = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('teachers').update(values).eq('id', id).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Teacher not found or permission denied')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-teachers'])
    })
    const deleteTeacher = useMutation({
      mutationFn: async (id) => {
        const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries(['master-teachers'])
    })

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateTeacher.mutateAsync({ id: modal.record.id, ...values })
          message.success('Teacher updated')
        } else {
          await createTeacher.mutateAsync(values)
          message.success('Teacher created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: <span style={{ color: primaryColor }}>Employee Code</span>, dataIndex: 'employee_code' },
      { title: <span style={{ color: primaryColor }}>Name</span>, render: (_, r) => <span style={{ color: primaryColor }}>{r.first_name} {r.last_name}</span> },
      { title: <span style={{ color: primaryColor }}>Mobile</span>, dataIndex: 'mobile', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Email</span>, dataIndex: 'email', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Status</span>, dataIndex: 'status', render: v => <Tag color={v === 'active' ? 'green' : 'red'} style={{ color: '#fff' }}>{v}</Tag> },
      {
        title: <span style={{ color: primaryColor }}>Actions</span>,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('teacher', () => deleteTeacher.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Teachers</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Teacher</Button>}
      >
        <Table dataSource={teachers || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Teacher' : 'New Teacher'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createTeacher.isLoading || updateTeacher.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { status: 'active', salary_type: 'fixed' }}>
            <Form.Item name="employee_code" label={<span style={{ color: primaryColor }}>Employee Code</span>}><Input /></Form.Item>
            <Form.Item name="first_name" label={<span style={{ color: primaryColor }}>First Name</span>} rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="last_name" label={<span style={{ color: primaryColor }}>Last Name</span>}><Input /></Form.Item>
            <Form.Item name="mobile" label={<span style={{ color: primaryColor }}>Mobile</span>}><Input /></Form.Item>
            <Form.Item name="email" label={<span style={{ color: primaryColor }}>Email</span>}><Input type="email" /></Form.Item>
            <Form.Item name="qualification" label={<span style={{ color: primaryColor }}>Qualification</span>}><Input /></Form.Item>
            <Form.Item name="joining_date" label={<span style={{ color: primaryColor }}>Joining Date</span>}><Input type="date" /></Form.Item>
            <Form.Item name="salary_type" label={<span style={{ color: primaryColor }}>Salary Type</span>}>
              <Select><Select.Option value="fixed">Fixed</Select.Option><Select.Option value="lecture_based">Lecture Based</Select.Option></Select>
            </Form.Item>
            <Form.Item name="monthly_salary" label={<span style={{ color: primaryColor }}>Monthly Salary</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="per_lecture_rate" label={<span style={{ color: primaryColor }}>Per Lecture Rate</span>}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label={<span style={{ color: primaryColor }}>Status</span>}>
              <Select><Select.Option value="active">Active</Select.Option><Select.Option value="inactive">Inactive</Select.Option></Select>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Batches Tab -----
  function BatchesTab() {
    const { data: batches, isLoading } = useBatches()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()
    const { data: courses } = useQuery({
      queryKey: ['master-courses-dropdown', orgId],
      queryFn: async () => {
        let query = supabase.from('courses').select('id, name').is('parent_id', null).eq('status', true)
        if (orgId) query = query.eq('organization_id', orgId)
        const { data } = await query
        return data || []
      },
      enabled: !!orgId
    })
    const { data: teachers } = useQuery({
      queryKey: ['master-teachers-dropdown'],
      queryFn: async () => {
        const { data } = await supabase.from('teachers').select('id, first_name, last_name').eq('status', 'active')
        return data || []
      }
    })

    const createBatch = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('batches').insert(values).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Failed to create batch')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-batches'])
    })
    const updateBatch = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('batches').update(values).eq('id', id).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Batch not found or permission denied')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-batches'])
    })
    const deleteBatch = useMutation({
      mutationFn: async (id) => {
        const { error } = await supabase.from('batches').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries(['master-batches'])
    })

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateBatch.mutateAsync({ id: modal.record.id, ...values })
          message.success('Batch updated')
        } else {
          await createBatch.mutateAsync(values)
          message.success('Batch created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: <span style={{ color: primaryColor }}>Batch Name</span>, dataIndex: 'batch_name', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Course</span>, render: (_, r) => <span style={{ color: primaryColor }}>{r.courses?.name || '-'}</span> },
      { title: <span style={{ color: primaryColor }}>Teacher</span>, render: (_, r) => <span style={{ color: primaryColor }}>{r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '-'}</span> },
      { title: <span style={{ color: primaryColor }}>Start Date</span>, dataIndex: 'start_date', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>End Date</span>, dataIndex: 'end_date', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Status</span>, dataIndex: 'status', render: v => <Tag color={v === 'active' ? 'green' : 'red'} style={{ color: '#fff' }}>{v}</Tag> },
      {
        title: <span style={{ color: primaryColor }}>Actions</span>,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('batch', () => deleteBatch.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Batches</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Batch</Button>}
      >
        <Table dataSource={batches || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Batch' : 'New Batch'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createBatch.isLoading || updateBatch.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { status: 'active' }}>
            <Form.Item name="course_id" label={<span style={{ color: primaryColor }}>Course</span>} rules={[{ required: true }]}>
              <Select><Select.Option value="">Select</Select.Option>{courses?.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item name="batch_name" label={<span style={{ color: primaryColor }}>Batch Name</span>} rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="start_date" label={<span style={{ color: primaryColor }}>Start Date</span>}><Input type="date" /></Form.Item>
            <Form.Item name="end_date" label={<span style={{ color: primaryColor }}>End Date</span>}><Input type="date" /></Form.Item>
            <Form.Item name="teacher_id" label={<span style={{ color: primaryColor }}>Teacher</span>}>
              <Select><Select.Option value="">None</Select.Option>{teachers?.map(t => <Select.Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item name="capacity" label={<span style={{ color: primaryColor }}>Capacity</span>}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label={<span style={{ color: primaryColor }}>Status</span>}>
              <Select><Select.Option value="active">Active</Select.Option><Select.Option value="inactive">Inactive</Select.Option></Select>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Tax Rates Tab -----
  function TaxRatesTab() {
    const { data: taxRates, isLoading } = useTaxRates()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createTaxRate = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('tax_rates').insert({ ...values, organization_id: orgId }).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Failed to create tax rate')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-tax-rates'])
    })
    const updateTaxRate = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('tax_rates').update(values).eq('id', id).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Tax rate not found or permission denied')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-tax-rates'])
    })
    const deleteTaxRate = useMutation({
      mutationFn: async (id) => {
        const { error } = await supabase.from('tax_rates').update({ is_active: false }).eq('id', id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries(['master-tax-rates'])
    })

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateTaxRate.mutateAsync({ id: modal.record.id, ...values })
          message.success('Tax rate updated')
        } else {
          await createTaxRate.mutateAsync(values)
          message.success('Tax rate created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: <span style={{ color: primaryColor }}>Name</span>, dataIndex: 'name', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Rate (%)</span>, dataIndex: 'rate', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Type</span>, dataIndex: 'type', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Default</span>, dataIndex: 'is_default', render: v => v ? <Tag color="blue">Yes</Tag> : 'No' },
      { title: <span style={{ color: primaryColor }}>Active</span>, dataIndex: 'is_active', render: v => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
      {
        title: <span style={{ color: primaryColor }}>Actions</span>,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('tax rate', () => deleteTaxRate.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Tax Rates</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Tax Rate</Button>}
      >
        <Table dataSource={taxRates || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Tax Rate' : 'New Tax Rate'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createTaxRate.isLoading || updateTaxRate.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { is_active: true, type: 'percentage', country: 'India' }}>
            <Form.Item name="name" label={<span style={{ color: primaryColor }}>Name</span>} rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="rate" label={<span style={{ color: primaryColor }}>Rate (%)</span>} rules={[{ required: true }]}><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="type" label={<span style={{ color: primaryColor }}>Type</span>}><Input /></Form.Item>
            <Form.Item name="country" label={<span style={{ color: primaryColor }}>Country</span>}><Input /></Form.Item>
            <Form.Item name="is_default" label={<span style={{ color: primaryColor }}>Default</span>} valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_active" label={<span style={{ color: primaryColor }}>Active</span>} valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Inquiry Sources Tab -----
  function SourcesTab() {
    const { data: sources, isLoading } = useSources()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createSource = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('inquiry_sources').insert(values).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Failed to create source')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-sources'])
    })
    const updateSource = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('inquiry_sources').update(values).eq('id', id).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Source not found or permission denied')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-sources'])
    })
    const deleteSource = useMutation({
      mutationFn: async (id) => {
        const { error } = await supabase.from('inquiry_sources').update({ is_active: false }).eq('id', id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries(['master-sources'])
    })

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateSource.mutateAsync({ id: modal.record.id, ...values })
          message.success('Source updated')
        } else {
          await createSource.mutateAsync(values)
          message.success('Source created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: <span style={{ color: primaryColor }}>Name</span>, dataIndex: 'name', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Campaign</span>, dataIndex: 'campaign', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Cost per Lead</span>, dataIndex: 'cost_per_lead', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      { title: <span style={{ color: primaryColor }}>Active</span>, dataIndex: 'is_active', render: v => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
      {
        title: <span style={{ color: primaryColor }}>Actions</span>,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('source', () => deleteSource.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Inquiry Sources</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Source</Button>}
      >
        <Table dataSource={sources || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Source' : 'New Source'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createSource.isLoading || updateSource.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { is_active: true }}>
            <Form.Item name="name" label={<span style={{ color: primaryColor }}>Name</span>} rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="campaign" label={<span style={{ color: primaryColor }}>Campaign</span>}><Input /></Form.Item>
            <Form.Item name="cost_per_lead" label={<span style={{ color: primaryColor }}>Cost per Lead</span>}><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="is_active" label={<span style={{ color: primaryColor }}>Active</span>} valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Mediums Tab -----
  function MediumsTab() {
    const { data: mediums, isLoading } = useMediums()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createMedium = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('mediums').insert(values).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Failed to create medium')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-mediums'])
    })
    const updateMedium = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('mediums').update(values).eq('id', id).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Medium not found or permission denied')
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-mediums'])
    })
    const deleteMedium = useMutation({
      mutationFn: async (id) => {
        const { error } = await supabase.from('mediums').delete().eq('id', id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries(['master-mediums'])
    })

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateMedium.mutateAsync({ id: modal.record.id, ...values })
          message.success('Medium updated')
        } else {
          await createMedium.mutateAsync(values)
          message.success('Medium created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: <span style={{ color: primaryColor }}>Name</span>, dataIndex: 'name', render: (text) => <span style={{ color: primaryColor }}>{text}</span> },
      {
        title: <span style={{ color: primaryColor }}>Actions</span>,
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('medium', () => deleteMedium.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Mediums</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Medium</Button>}
      >
        <Table dataSource={mediums || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Medium' : 'New Medium'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createMedium.isLoading || updateMedium.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || {}}>
            <Form.Item name="name" label={<span style={{ color: primaryColor }}>Name</span>} rules={[{ required: true }]}><Input /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Branches Tab -----
  function BranchesTab() {
    const { data, isLoading } = useBranches()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateBranch.mutateAsync({ id: modal.record.id, ...values })
          message.success('Branch updated')
        } else {
          await createBranch.mutateAsync(values)
          message.success('Branch created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: 'Branch Name', dataIndex: 'branch_name', render: (t) => <span style={{ color: primaryColor }}>{t}</span> },
      { title: 'City', dataIndex: 'city' },
      { title: 'State', dataIndex: 'state' },
      { title: 'Phone', dataIndex: 'phone' },
      { title: 'Email', dataIndex: 'email' },
      {
        title: 'Active',
        dataIndex: 'is_active',
        render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>
      },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('branch', () => deleteBranch.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Branches</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Branch</Button>}
      >
        <Table dataSource={data || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Branch' : 'New Branch'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createBranch.isLoading || updateBranch.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { is_active: true }}>
            <Form.Item name="branch_name" label="Branch Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="city" label="City"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="state" label="State"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="pincode" label="Pincode"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
            </Row>
            <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Financial Years Tab -----
  function FinancialYearsTab() {
    const { data, isLoading } = useFinancialYears()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const handleSave = async (values) => {
      try {
        const payload = {
          name: values.name,
          start_date: values.start_date.format('YYYY-MM-DD'),
          end_date: values.end_date.format('YYYY-MM-DD'),
          is_active: values.is_active,
        }
        if (modal.record) {
          await updateFY.mutateAsync({ id: modal.record.id, ...payload })
          message.success('Financial year updated')
        } else {
          await createFY.mutateAsync(payload)
          message.success('Financial year created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Start Date', dataIndex: 'start_date' },
      { title: 'End Date', dataIndex: 'end_date' },
      {
        title: 'Active',
        dataIndex: 'is_active',
        render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>
      },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              form.setFieldsValue({
                ...record,
                start_date: dayjs(record.start_date),
                end_date: dayjs(record.end_date)
              });
              setModal({ open: true, record })
            }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('financial year', () => deleteFY.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Financial Years</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Financial Year</Button>}
      >
        <Table dataSource={data || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Financial Year' : 'New Financial Year'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createFY.isLoading || updateFY.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}
            initialValues={modal.record ? { ...modal.record, start_date: dayjs(modal.record.start_date), end_date: dayjs(modal.record.end_date) } : { is_active: true }}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="end_date" label="End Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Subjects Tab -----
  function SubjectsTab() {
    const { data, isLoading } = useSubjects()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateSubject.mutateAsync({ id: modal.record.id, ...values })
          message.success('Subject updated')
        } else {
          await createSubject.mutateAsync(values)
          message.success('Subject created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: 'Subject Name', dataIndex: 'subject_name' },
      { title: 'Course', render: (_, r) => r.courses?.name || '-' },
      { title: 'Branch', dataIndex: ['branches', 'branch_name'] },
      { title: 'Financial Year', dataIndex: ['financial_years', 'name'] },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('subject', () => deleteSubject.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Subjects</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Subject</Button>}
      >
        <Table dataSource={data || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Subject' : 'New Subject'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createSubject.isLoading || updateSubject.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || {}}>
            <Form.Item name="subject_name" label="Subject Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="course_id" label="Course"><Select allowClear>{courseOptions?.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}</Select></Form.Item>
            <Form.Item name="branch_id" label="Branch"><Select allowClear>{branchOptions?.map(b => <Select.Option key={b.id} value={b.id}>{b.branch_name}</Select.Option>)}</Select></Form.Item>
            <Form.Item name="financial_year_id" label="Financial Year"><Select allowClear>{fyOptions?.map(f => <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>)}</Select></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- HSN/SAC Tab (FIXED) -----
  function HsnSacTab() {
    const { data, isLoading } = useHsnSac()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateHsn.mutateAsync({ id: modal.record.id, ...values })
          message.success('Code updated')
        } else {
          await createHsn.mutateAsync(values)
          message.success('Code created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: 'Code', dataIndex: 'code' },
      { title: 'Description', dataIndex: 'description' },
      {
        title: 'Default Tax Rate',
        render: (_, r) => r.tax_rates ? `${r.tax_rates.rate}% (${r.tax_rates.name})` : '-'
      },
      {
        title: 'Service',
        dataIndex: 'is_service',
        render: (v) => v ? 'Yes' : 'No'
      },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              form.setFieldsValue({
                code: record.code,
                description: record.description,
                default_tax_rate_id: record.default_tax_rate_id,
                is_service: record.is_service,
              });
              setModal({ open: true, record })
            }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />}
              onClick={() => handleDelete('HSN/SAC code', () => deleteHsn.mutateAsync(record.id))}>
              Delete
            </Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>HSN / SAC Codes</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />}
          onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>
          Add Code
        </Button>}
      >
        <Table dataSource={data || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Code' : 'New HSN/SAC Code'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createHsn.isLoading || updateHsn.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ is_service: false }}>
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="default_tax_rate_id" label="Default Tax Rate">
              <Select allowClear>
                {taxRateOptions?.map(t => (
                  <Select.Option key={t.id} value={t.id}>{t.name} ({t.rate}%)</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="is_service" label="Is Service" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Vendors Tab -----
  function VendorsTab() {
    const { data, isLoading } = useVendors()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateVendor.mutateAsync({ id: modal.record.id, ...values })
          message.success('Vendor updated')
        } else {
          await createVendor.mutateAsync(values)
          message.success('Vendor created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: 'Vendor Name', dataIndex: 'vendor_name' },
      { title: 'GSTIN', dataIndex: 'gstin' },
      { title: 'Contact Person', dataIndex: 'contact_person' },
      { title: 'Phone', dataIndex: 'phone' },
      { title: 'Email', dataIndex: 'email' },
      { title: 'Branch', dataIndex: ['branches', 'branch_name'] },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('vendor', () => deleteVendor.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Vendors</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Vendor</Button>}
      >
        <Table dataSource={data || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Vendor' : 'New Vendor'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createVendor.isLoading || updateVendor.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || {}}>
            <Form.Item name="vendor_name" label="Vendor Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="gstin" label="GSTIN"><Input /></Form.Item>
            <Form.Item name="pan" label="PAN"><Input /></Form.Item>
            <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="state_code" label="State Code"><Input maxLength={2} /></Form.Item>
            <Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
            </Row>
            <Form.Item name="bank_name" label="Bank Name"><Input /></Form.Item>
            <Form.Item name="account_number" label="Account Number"><Input /></Form.Item>
            <Form.Item name="ifsc_code" label="IFSC Code"><Input /></Form.Item>
            <Form.Item name="branch_id" label="Branch"><Select allowClear>{branchOptions?.map(b => <Select.Option key={b.id} value={b.id}>{b.branch_name}</Select.Option>)}</Select></Form.Item>
            <Form.Item name="financial_year_id" label="Financial Year"><Select allowClear>{fyOptions?.map(f => <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>)}</Select></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ----- Inventory Tab -----
  function InventoryTab() {
    const { data: items, isLoading } = useInventoryItems()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()
    const [itemType, setItemType] = useState('product')
    const [selectedCourseId, setSelectedCourseId] = useState(null)

    const { data: levelsForCourse } = useQuery({
      queryKey: ['levels-for-course', selectedCourseId],
      queryFn: async () => {
        if (!selectedCourseId) return []
        const { data } = await supabase
          .from('courses')
          .select('id, name, level_number')
          .eq('parent_id', selectedCourseId)
          .is('deleted_at', null)
          .order('level_number')
        return data || []
      },
      enabled: !!selectedCourseId
    })

    const { data: taxRatesList } = useQuery({
      queryKey: ['tax-rates-list', orgId],
      queryFn: async () => {
        let query = supabase.from('tax_rates').select('id, rate, name')
        if (orgId) query = query.eq('organization_id', orgId)
        const { data } = await query
        return data || []
      },
      enabled: !!orgId
    })
    const { data: coursesList } = useQuery({
      queryKey: ['courses-list', orgId],
      queryFn: async () => {
        let query = supabase.from('courses').select('id, name')
        if (orgId) query = query.eq('organization_id', orgId)
        const { data } = await query
        return data || []
      },
      enabled: !!orgId
    })
    const { data: levelsList } = useQuery({
      queryKey: ['levels-list', orgId],
      queryFn: async () => {
        const { data } = await supabase
          .from('courses')
          .select('id, name')
          .not('parent_id', 'is', null)
          .is('deleted_at', null)
        return data || []
      }
    })

    const handleSave = async (values) => {
      try {
        const payload = {
          item_name: values.item_name,
          description: values.description || '',
          unit: values.unit || 'pcs',
          unit_price: values.unit_price || 0,
          current_stock: values.current_stock || 0,
          reorder_level: values.reorder_level || 5,
          hsn_sac_code: values.hsn_sac_code || null,
          tax_rate_id: values.tax_rate_id || null,
          item_type: values.item_type,
          is_active: values.is_active !== undefined ? values.is_active : true,
          branch_id: values.branch_id || null,
          financial_year_id: values.financial_year_id || null,
          course_id: values.item_type === 'service' ? values.course_id || null : null,
          level_id: values.item_type === 'service' ? values.level_id || null : null,
        }
        if (modal.record) {
          await updateInventoryItem.mutateAsync({ id: modal.record.id, ...payload })
          message.success('Item updated')
        } else {
          await createInventoryItem.mutateAsync(payload)
          message.success('Item created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) {
        message.error(err.message)
      }
    }

    const columns = [
      { title: 'Name', dataIndex: 'item_name', render: (t) => <span style={{ color: primaryColor }}>{t}</span> },
      { title: 'Type', dataIndex: 'item_type', render: (t) => <Tag color={t === 'service' ? 'blue' : 'green'}>{t}</Tag> },
      { title: 'Price', dataIndex: 'unit_price', render: (v) => `₹${Number(v).toFixed(2)}` },
      { title: 'Stock', dataIndex: 'current_stock' },
      {
        title: 'Tax Rate',
        render: (_, record) => {
          const tax = taxRatesList?.find(tr => tr.id === record.tax_rate_id)
          return tax ? `${tax.rate}%` : '-'
        }
      },
      {
        title: 'Course',
        render: (_, record) => {
          const course = coursesList?.find(c => c.id === record.course_id)
          return course ? course.name : '-'
        }
      },
      {
        title: 'Level',
        render: (_, record) => {
          const level = levelsList?.find(l => l.id === record.level_id)
          return level ? level.name : '-'
        }
      },
      {
        title: 'Active',
        dataIndex: 'is_active',
        render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>
      },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              form.setFieldsValue({
                ...record,
                tax_rate_id: record.tax_rate_id || null,
                branch_id: record.branch_id || null,
                financial_year_id: record.financial_year_id || null,
                course_id: record.course_id || null,
                level_id: record.level_id || null,
              })
              setItemType(record.item_type)
              setSelectedCourseId(record.course_id || null)
              setModal({ open: true, record })
            }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('item', () => deleteInventoryItem.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    const handleTypeChange = (value) => {
      setItemType(value)
      setSelectedCourseId(null)
      form.setFieldsValue({ course_id: null, level_id: null })
    }

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Inventory Items</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setItemType('product'); setModal({ open: true, record: null }) }}>Add Item</Button>}
      >
        <Table dataSource={items || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Item' : 'New Item'}
          open={modal.open}
          onCancel={() => { setModal({ open: false, record: null }); form.resetFields() }}
          onOk={() => form.submit()}
          confirmLoading={createInventoryItem.isLoading || updateInventoryItem.isLoading}
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ item_type: 'product', is_active: true, unit: 'pcs' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="item_name" label="Item Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="item_type" label="Type" rules={[{ required: true }]}>
                  <Select onChange={handleTypeChange}>
                    <Select.Option value="product">Product</Select.Option>
                    <Select.Option value="service">Service</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="unit" label="Unit">
                  <Input placeholder="pcs, box, etc." />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="unit_price" label="Unit Price (₹)">
                  <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="current_stock" label="Current Stock">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="reorder_level" label="Reorder Level">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="hsn_sac_code" label="HSN/SAC Code">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="tax_rate_id" label="Tax Rate">
                  <Select allowClear>
                    {taxRatesDropdown?.map(tr => (
                      <Select.Option key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            {itemType === 'service' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="course_id" label="Course">
                    <Select
                      allowClear
                      onChange={(val) => setSelectedCourseId(val)}
                    >
                      {coursesDropdown?.map(c => (
                        <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="level_id" label="Level">
                    <Select allowClear disabled={!selectedCourseId}>
                      {levelsForCourse?.map(l => (
                        <Select.Option key={l.id} value={l.id}>{l.name} (Level {l.level_number})</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="branch_id" label="Branch">
                  <Select allowClear>
                    {branchesDropdown?.map(b => (
                      <Select.Option key={b.id} value={b.id}>{b.branch_name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="financial_year_id" label="Financial Year">
                  <Select allowClear>
                    {fyDropdown?.map(f => (
                      <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="is_active" label="Active" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ---------- MAIN RENDER ----------
  return (
    <div style={{ fontFamily: fontBody, padding: 16, color: primaryColor }}>
      <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading, marginBottom: 24 }}>
        Master Data Management
      </Title>

      <Tabs defaultActiveKey="inventory" size="large">
        <TabPane tab={<span style={{ color: primaryColor }}>Inventory</span>} key="inventory">
          <InventoryTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Branches</span>} key="branches">
          <BranchesTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Financial Years</span>} key="financial-years">
          <FinancialYearsTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Subjects</span>} key="subjects">
          <SubjectsTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>HSN/SAC</span>} key="hsn-sac">
          <HsnSacTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Vendors</span>} key="vendors">
          <VendorsTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Courses</span>} key="courses">
          <CoursesTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Teachers</span>} key="teachers">
          <TeachersTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Batches</span>} key="batches">
          <BatchesTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Tax Rates</span>} key="taxrates">
          <TaxRatesTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Inquiry Sources</span>} key="sources">
          <SourcesTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Mediums</span>} key="mediums">
          <MediumsTab />
        </TabPane>
      </Tabs>
    </div>
  )
}

export default MasterDataPortal