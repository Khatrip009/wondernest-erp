import { useState } from 'react'
import {
  Layout, Menu, Button, Space, Table, Modal, Form, Input, InputNumber,
  Select, Switch, message, Card, Typography, Tabs, Tag, Row, Col // added Row, Col
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'

const { TabPane } = Tabs
const { Title, Text } = Typography
const { confirm } = Modal

const MasterDataPortal = () => {
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const queryClient = useQueryClient()

  // ---------- 1. Courses ----------
  const useCourses = () => useQuery({
    queryKey: ['master-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('course_name')
      if (error) throw error
      return data
    }
  })

  const createCourse = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('courses').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-courses'])
  })

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase.from('courses').update(values).eq('id', id).select().single()
      if (error) throw error
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

  // ---------- 2. Levels ----------
  const useLevels = (courseId) => useQuery({
    queryKey: ['master-levels', courseId],
    queryFn: async () => {
      let query = supabase.from('course_levels').select('*').order('level_number')
      if (courseId) query = query.eq('course_id', courseId)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!courseId
  })

  // ---------- 3. Teachers ----------
  const useTeachers = () => useQuery({
    queryKey: ['master-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('*').order('first_name')
      if (error) throw error
      return data
    }
  })

  // ---------- 4. Batches ----------
  const useBatches = () => useQuery({
    queryKey: ['master-batches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('batches').select('*, courses(course_name), teachers(first_name, last_name)').order('batch_name')
      if (error) throw error
      return data
    }
  })

  // ---------- 5. Tax Rates ----------
  const useTaxRates = () => useQuery({
    queryKey: ['master-tax-rates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_rates').select('*').order('rate')
      if (error) throw error
      return data
    }
  })

  // ---------- 6. Inquiry Sources ----------
  const useSources = () => useQuery({
    queryKey: ['master-sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inquiry_sources').select('*').order('name')
      if (error) throw error
      return data
    }
  })

  // ---------- 7. Mediums ----------
  const useMediums = () => useQuery({
    queryKey: ['master-mediums'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mediums').select('*').order('name')
      if (error) throw error
      return data
    }
  })

  // Generic delete confirmation
  const handleDelete = (title, onOk) => {
    confirm({
      title: `Delete this ${title}?`,
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      onOk,
    })
  }

  // ---------- Courses Tab ----------
  function CoursesTab() {
    const { data: courses, isLoading } = useCourses()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const handleSave = async (values) => {
      try {
        if (modal.record) {
          await updateCourse.mutateAsync({ id: modal.record.id, ...values })
          message.success('Course updated')
        } else {
          await createCourse.mutateAsync({ ...values, organization_id: 1 })
          message.success('Course created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) {
        message.error(err.message)
      }
    }

    const columns = [
      { title: 'Name', dataIndex: 'course_name', key: 'name' },
      { title: 'Duration (months)', dataIndex: 'duration_months', key: 'duration' },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (v) => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(record); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('course', () => deleteCourse.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

    const expandedRowRender = (course) => {
      const { data: levels, isLoading: levelsLoading } = useLevels(course.id)
      if (levelsLoading) return <Text>Loading levels...</Text>
      return (
        <div style={{ padding: '0 24px' }}>
          <Space style={{ marginBottom: 8 }}>
            <Text strong style={{ color: primaryColor }}>Levels</Text>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => {/* open level modal */}}>Add Level</Button>
          </Space>
          {levels?.length ? levels.map(l => (
            <Card key={l.id} size="small" style={{ marginBottom: 4, borderColor: primaryColor }}>
              <Row justify="space-between">
                <Col><Text strong>{l.level_name}</Text> (Level {l.level_number}) – {l.duration_months} months</Col>
                <Col><Space><Button size="small">Edit</Button><Button size="small" danger>Delete</Button></Space></Col>
              </Row>
            </Card>
          )) : <Text type="secondary">No levels yet.</Text>}
        </div>
      )
    }

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Courses</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Course</Button>}
      >
        <Table dataSource={courses} columns={columns} rowKey="id" loading={isLoading} expandable={{ expandedRowRender }} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Course' : 'New Course'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createCourse.isLoading || updateCourse.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { status: true }}>
            <Form.Item name="course_name" label="Course Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="duration_months" label="Duration (months)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ---------- Teachers Tab ----------
  function TeachersTab() {
    const { data: teachers, isLoading } = useTeachers()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createTeacher = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('teachers').insert(values).select().single()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-teachers'])
    })
    const updateTeacher = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('teachers').update(values).eq('id', id).select().single()
        if (error) throw error
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
      { title: 'Employee Code', dataIndex: 'employee_code' },
      { title: 'Name', render: (_, r) => `${r.first_name} ${r.last_name}` },
      { title: 'Mobile', dataIndex: 'mobile' },
      { title: 'Email', dataIndex: 'email' },
      { title: 'Status', dataIndex: 'status', render: v => <Tag color={v === 'active' ? 'green' : 'red'}>{v}</Tag> },
      {
        title: 'Actions',
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
        <Table dataSource={teachers} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Teacher' : 'New Teacher'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createTeacher.isLoading || updateTeacher.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { status: 'active', salary_type: 'fixed' }}>
            <Form.Item name="employee_code" label="Employee Code"><Input /></Form.Item>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="last_name" label="Last Name"><Input /></Form.Item>
            <Form.Item name="mobile" label="Mobile"><Input /></Form.Item>
            <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
            <Form.Item name="qualification" label="Qualification"><Input /></Form.Item>
            <Form.Item name="joining_date" label="Joining Date"><Input type="date" /></Form.Item>
            <Form.Item name="salary_type" label="Salary Type"><Select><Select.Option value="fixed">Fixed</Select.Option><Select.Option value="lecture_based">Lecture Based</Select.Option></Select></Form.Item>
            <Form.Item name="monthly_salary" label="Monthly Salary"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="per_lecture_rate" label="Per Lecture Rate"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label="Status"><Select><Select.Option value="active">Active</Select.Option><Select.Option value="inactive">Inactive</Select.Option></Select></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ---------- Batches Tab ----------
  function BatchesTab() {
    const { data: batches, isLoading } = useBatches()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()
    const { data: courses } = useQuery({ queryKey: ['master-courses-dropdown'], queryFn: async () => { const { data } = await supabase.from('courses').select('id, course_name').eq('status', true); return data } })
    const { data: teachers } = useQuery({ queryKey: ['master-teachers-dropdown'], queryFn: async () => { const { data } = await supabase.from('teachers').select('id, first_name, last_name').eq('status', 'active'); return data } })

    const createBatch = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('batches').insert(values).select().single()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-batches'])
    })
    const updateBatch = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('batches').update(values).eq('id', id).select().single()
        if (error) throw error
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
      { title: 'Batch Name', dataIndex: 'batch_name' },
      { title: 'Course', dataIndex: ['courses', 'course_name'] },
      { title: 'Teacher', render: (_, r) => r.teachers ? `${r.teachers.first_name} ${r.teachers.last_name}` : '-' },
      { title: 'Start Date', dataIndex: 'start_date' },
      { title: 'End Date', dataIndex: 'end_date' },
      { title: 'Status', dataIndex: 'status', render: v => <Tag color={v === 'active' ? 'green' : 'red'}>{v}</Tag> },
      {
        title: 'Actions',
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
        <Table dataSource={batches} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Batch' : 'New Batch'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createBatch.isLoading || updateBatch.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { status: 'active' }}>
            <Form.Item name="course_id" label="Course" rules={[{ required: true }]}><Select><Select.Option value="">Select</Select.Option>{courses?.map(c => <Select.Option key={c.id} value={c.id}>{c.course_name}</Select.Option>)}</Select></Form.Item>
            <Form.Item name="batch_name" label="Batch Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="start_date" label="Start Date"><Input type="date" /></Form.Item>
            <Form.Item name="end_date" label="End Date"><Input type="date" /></Form.Item>
            <Form.Item name="teacher_id" label="Teacher"><Select><Select.Option value="">None</Select.Option>{teachers?.map(t => <Select.Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Select.Option>)}</Select></Form.Item>
            <Form.Item name="capacity" label="Capacity"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label="Status"><Select><Select.Option value="active">Active</Select.Option><Select.Option value="inactive">Inactive</Select.Option></Select></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ---------- Tax Rates Tab ----------
  function TaxRatesTab() {
    const { data: taxRates, isLoading } = useTaxRates()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createTaxRate = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('tax_rates').insert(values).select().single()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-tax-rates'])
    })
    const updateTaxRate = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('tax_rates').update(values).eq('id', id).select().single()
        if (error) throw error
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
          await createTaxRate.mutateAsync({ ...values, organization_id: 1 })
          message.success('Tax rate created')
        }
        setModal({ open: false, record: null })
        form.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Rate (%)', dataIndex: 'rate' },
      { title: 'Type', dataIndex: 'type' },
      { title: 'Default', dataIndex: 'is_default', render: v => v ? <Tag color="blue">Yes</Tag> : 'No' },
      { title: 'Active', dataIndex: 'is_active', render: v => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
      {
        title: 'Actions',
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
        <Table dataSource={taxRates} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Tax Rate' : 'New Tax Rate'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createTaxRate.isLoading || updateTaxRate.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { is_active: true, type: 'percentage', country: 'India' }}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="rate" label="Rate (%)" rules={[{ required: true }]}><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="type" label="Type"><Input /></Form.Item>
            <Form.Item name="country" label="Country"><Input /></Form.Item>
            <Form.Item name="is_default" label="Default" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ---------- Inquiry Sources Tab ----------
  function SourcesTab() {
    const { data: sources, isLoading } = useSources()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createSource = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('inquiry_sources').insert(values).select().single()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-sources'])
    })
    const updateSource = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('inquiry_sources').update(values).eq('id', id).select().single()
        if (error) throw error
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
      { title: 'Name', dataIndex: 'name' },
      { title: 'Campaign', dataIndex: 'campaign' },
      { title: 'Cost per Lead', dataIndex: 'cost_per_lead' },
      { title: 'Active', dataIndex: 'is_active', render: v => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
      {
        title: 'Actions',
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
        <Table dataSource={sources} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Source' : 'New Source'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createSource.isLoading || updateSource.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { is_active: true }}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="campaign" label="Campaign"><Input /></Form.Item>
            <Form.Item name="cost_per_lead" label="Cost per Lead"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ---------- Mediums Tab ----------
  function MediumsTab() {
    const { data: mediums, isLoading } = useMediums()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()

    const createMedium = useMutation({
      mutationFn: async (values) => {
        const { data, error } = await supabase.from('mediums').insert(values).select().single()
        if (error) throw error
        return data
      },
      onSuccess: () => queryClient.invalidateQueries(['master-mediums'])
    })
    const updateMedium = useMutation({
      mutationFn: async ({ id, ...values }) => {
        const { data, error } = await supabase.from('mediums').update(values).eq('id', id).select().single()
        if (error) throw error
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
      { title: 'Name', dataIndex: 'name' },
      {
        title: 'Actions',
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
        <Table dataSource={mediums} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Medium' : 'New Medium'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createMedium.isLoading || updateMedium.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || {}}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ---------- Main render ----------
  return (
    <div style={{ fontFamily: fontBody, padding: 16 }}>
      <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading, marginBottom: 24 }}>
        Master Data Management
      </Title>

      <Tabs defaultActiveKey="courses" size="large">
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