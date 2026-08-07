// MasterDataPortal.jsx – fully fixed (fee modal with HSN dropdown, item name correctly sent)
import { useState, useMemo } from 'react'
import {
  Button, Space, Table, Modal, Form, Input, InputNumber,
  Select, Switch, message, Card, Typography, Tabs, Tag, Row, Col, DatePicker
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { useScope } from '../contexts/ScopeContext'
import dayjs from 'dayjs'

const { TabPane } = Tabs
const { Title, Text } = Typography
const { confirm } = Modal

const MasterDataPortal = () => {
  const { theme } = useTheme()
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const queryClient = useQueryClient()
  const orgId = org?.id
  const branchId = selectedBranch?.id
  const fyId = selectedFinancialYear?.id

  const handleDelete = (title, onOk) => {
    confirm({
      title: `Delete this ${title}?`,
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      onOk,
    })
  }

  // ===================== QUERIES & MUTATIONS =====================

  // ---------- Courses ----------
  const useCourses = () => useQuery({
    queryKey: ['master-courses', orgId],
    queryFn: async () => {
      let query = supabase.from('courses').select('*').order('name')
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
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['master-courses'])
      queryClient.invalidateQueries(['courses-dropdown'])
    }
  })

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const payload = { ...values, name: values.course_name }
      delete payload.course_name
      const { error } = await supabase.from('courses').update(payload).eq('id', id)
      if (error) throw error
      return { id, ...payload }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['master-courses'])
      queryClient.invalidateQueries(['courses-dropdown'])
    }
  })

  const deleteCourse = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('courses').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['master-courses'])
      queryClient.invalidateQueries(['courses-dropdown'])
    }
  })

  // ---------- Course Levels ----------
  const useLevels = (courseId) => useQuery({
    queryKey: ['master-levels', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_levels')
        .select('*')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('level_number')
      if (error) throw error
      return data || []
    },
    enabled: !!courseId
  })

  const createLevel = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('course_levels').insert(values).select().maybeSingle()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-levels'])
  })

  const updateLevel = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { error } = await supabase.from('course_levels').update(values).eq('id', id)
      if (error) throw error
      return { id, ...values }
    },
    onSuccess: () => queryClient.invalidateQueries(['master-levels'])
  })

  const deleteLevel = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('course_levels').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(['master-levels'])
  })

  // ---------- Batches ----------
  const useBatches = () => useQuery({
    queryKey: ['master-batches', branchId, fyId],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('*, courses(name), teachers(first_name, last_name)')
        .order('batch_name')
      if (branchId) query = query.eq('branch_id', branchId)
      if (fyId) query = query.eq('financial_year_id', fyId)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!branchId && !!fyId
  })

  const createBatch = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('batches').insert(values).select().maybeSingle()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-batches'])
  })
  const updateBatch = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { error } = await supabase.from('batches').update(values).eq('id', id)
      if (error) throw error
      return { id, ...values }
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

  // ---------- Inquiry Sources ----------
  const useSources = () => useQuery({
    queryKey: ['master-sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inquiry_sources').select('*').order('name')
      if (error) throw error
      return data || []
    }
  })

  const createSource = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('inquiry_sources').insert(values).select().maybeSingle()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-sources'])
  })
  const updateSource = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { error } = await supabase.from('inquiry_sources').update(values).eq('id', id)
      if (error) throw error
      return { id, ...values }
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
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-branches'])
  })
  const updateBranch = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { error } = await supabase.from('branches').update(values).eq('id', id)
      if (error) throw error
      return { id, ...values }
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
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-financial-years'])
  })
  const updateFY = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { error } = await supabase.from('financial_years').update(values).eq('id', id)
      if (error) throw error
      return { id, ...values }
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

  // ---------- Inventory Items ----------
  const useInventoryItems = () => useQuery({
    queryKey: ['master-inventory', orgId],
    queryFn: async () => {
      let query = supabase.from('inventory_items').select('*').order('item_name')
      if (orgId) query = query.eq('organization_id', orgId)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!orgId
  })

  const createInventoryItem = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from('inventory_items').insert(values).select().maybeSingle()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(['master-inventory'])
  })
  const updateInventoryItem = useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { error } = await supabase.from('inventory_items').update(values).eq('id', id)
      if (error) throw error
      return { id, ...values }
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

  // ========== Dropdown queries ==========
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
  const { data: taxRatesDropdown } = useQuery({
    queryKey: ['tax-rates-dropdown'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_rates')
        .select('id, name, rate')
        .eq('is_active', true)
      return data || []
    }
  })
  // ✅ HSN/SAC codes dropdown (global)
  // ✅ HSN/SAC codes dropdown – only service codes
  const { data: hsnCodesDropdown } = useQuery({
    queryKey: ['hsn-codes-service-dropdown'],
    queryFn: async () => {
      const { data } = await supabase
        .from('hsn_sac_codes')
        .select('code, description')
        .eq('is_service', true)          // only service codes
        .order('code')
      return data || []
    }
  })
  const { data: coursesDropdown } = useQuery({
    queryKey: ['courses-dropdown-master', orgId],
    queryFn: async () => {
      let query = supabase.from('courses').select('id, name').eq('status', true)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data } = await query
      return data || []
    },
    enabled: !!orgId
  })
  const { data: levelsList } = useQuery({
    queryKey: ['levels-list', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data } = await supabase
        .from('course_levels')
        .select('id, name')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!orgId
  })

  // ===================== TAB COMPONENTS =====================

  // ---------- Courses Tab (with fee management, HSN dropdown, item name fix) ----------
  function CoursesTab() {
    const { data: courses, isLoading } = useCourses()
    const [modal, setModal] = useState({ open: false, record: null })
    const [levelModal, setLevelModal] = useState({ open: false, courseId: null, record: null })
    const [feeModal, setFeeModal] = useState({ open: false, course: null })
    const [form] = Form.useForm()
    const [levelForm] = Form.useForm()
    const [feeForm] = Form.useForm()

    // Fee management helpers
    const { data: feeItems, refetch: refetchFees } = useQuery({
      queryKey: ['course-fees', feeModal.course?.id],
      queryFn: async () => {
        if (!feeModal.course?.id) return []
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, item_name, unit_price, tax_rate_id, hsn_sac_code, course_id, level_id')
          .eq('course_id', feeModal.course.id)
          .eq('item_type', 'service')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .order('level_id', { ascending: true, nullsFirst: true })
        if (error) throw error
        return data || []
      },
      enabled: !!feeModal.course?.id,
    })

    const upsertFee = useMutation({
      mutationFn: async (payload) => {
        const { id, ...rest } = payload
        if (id) {
          const { error } = await supabase.from('inventory_items').update(rest).eq('id', id)
          if (error) throw error
          return { id, ...rest }
        } else {
          const { data, error } = await supabase.from('inventory_items').insert({
            ...rest,
            organization_id: orgId,
            item_type: 'service',
            is_active: true,
          }).select().maybeSingle()
          if (error) throw error
          return data
        }
      },
        onSuccess: () => {
    refetchFees();                                // still refresh the fee list
    queryClient.invalidateQueries(['master-inventory']);   // ✅ also refresh the Inventory tab
  },

    })

const FeeModal = () => {
  const course = feeModal.course
  if (!course) return null

  const { data: levels = [] } = useLevels(course.id)

  const feeRows = useMemo(() => {
    const rows = []
    if (levels.length === 0) {
      const existing = feeItems?.find(f => !f.level_id)
      rows.push({ key: 'course', levelName: 'Course Fee (Full Course)', levelId: null, feeItem: existing || null })
    } else {
      levels.forEach(level => {
        const existing = feeItems?.find(f => f.level_id === level.id)
        rows.push({
          key: `level-${level.id}`,
          levelName: `${level.name} (Lv.${level.level_number})`,
          levelId: level.id,
          feeItem: existing || null,
        })
      })
    }
    return rows
  }, [levels, feeItems])

  const handleSaveFees = async () => {
    try {
      const values = await feeForm.validateFields()
      const promises = (values.fees || []).map((fee, idx) => {
        const row = feeRows[idx]
        if (!row) return Promise.resolve()

        const payload = {
          id: row?.feeItem?.id || null,
          course_id: course.id,
          level_id: row?.levelId,
          item_name: row?.levelName,
          unit_price: Number(fee.amount) || 0,
          tax_rate_id: fee.tax_rate_id || null,
          hsn_sac_code: fee.hsn_sac_code || null,
        }
        return upsertFee.mutateAsync(payload)
      })

      await Promise.all(promises)
      message.success('Fees saved successfully')
      setFeeModal({ open: false, course: null })
    } catch (err) {
      console.error('Fee save error:', err)
      message.error(err.message || 'Failed to save fees')
    }
  }

  return (
    <Modal
      title={<span style={{ color: primaryColor }}>Manage Fees – {course.name}</span>}
      open={feeModal.open}
      onCancel={() => setFeeModal({ open: false, course: null })}
      onOk={handleSaveFees}
      confirmLoading={upsertFee.isLoading}
      width={860}
      destroyOnClose
    >
      <div style={{ marginBottom: 16, fontFamily: fontBody }}>
        <Text type="secondary">
          These fees will be stored as <strong>services</strong> in your inventory and can be used when billing students.
          {levels.length > 0 && ' Each level has its own fee.'}
        </Text>
      </div>

      <Form form={feeForm} layout="vertical" initialValues={{
        fees: feeRows.map(r => ({
          key: r.key,
          amount: r.feeItem?.unit_price || '',
          tax_rate_id: r.feeItem?.tax_rate_id || undefined,
          hsn_sac_code: r.feeItem?.hsn_sac_code || undefined,
        }))
      }}>
        <Table
          dataSource={feeRows}
          rowKey="key"
          pagination={false}
          size="small"
          locale={{ emptyText: 'No fee rows to display.' }}
        >
          <Table.Column
            title="Fee For"
            dataIndex="levelName"
            width={200}
          />
          <Table.Column
            title="Amount (₹)"
            dataIndex="key"
            width={140}
            render={(key, record, index) => (
              <Form.Item
                name={['fees', index, 'amount']}
                noStyle
                rules={[{ required: true, message: 'Enter amount' }]}
              >
                <InputNumber
                  min={0}
                  step={100}
                  style={{ width: '100%' }}
                  placeholder="e.g. 15000"
                />
              </Form.Item>
            )}
          />
          <Table.Column
            title="Tax Rate"
            dataIndex="key"
            width={170}
            render={(key, record, index) => (
              <Form.Item name={['fees', index, 'tax_rate_id']} noStyle>
                <Select
                  allowClear
                  placeholder="Select tax"
                  style={{ width: '100%' }}
                >
                  {taxRatesDropdown?.map(tr => (
                    <Select.Option key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          />
          <Table.Column
            title="HSN / SAC Code"
            dataIndex="key"
            width={220}
            render={(key, record, index) => (
              <Form.Item name={['fees', index, 'hsn_sac_code']} noStyle>
                <Select
                  allowClear
                  showSearch
                  placeholder="Search code or description"
                  style={{ width: '100%' }}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {hsnCodesDropdown?.map(h => (
                    <Select.Option key={h.code} value={h.code}>
                      {h.code} – {h.description}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          />
        </Table>
      </Form>
    </Modal>
  )
}

    const handleLevelSave = async (values) => {
      try {
        if (levelModal.record) {
          await updateLevel.mutateAsync({ id: levelModal.record.id, ...values })
          message.success('Level updated')
        } else {
          await createLevel.mutateAsync({ ...values, course_id: levelModal.courseId, organization_id: orgId })
          message.success('Level created')
        }
        setLevelModal({ open: false, courseId: null, record: null })
        levelForm.resetFields()
      } catch (err) { message.error(err.message) }
    }

    const ExpandedLevels = ({ courseId }) => {
      const { data: levels, isLoading: levelsLoading } = useLevels(courseId)
      if (levelsLoading) return <Text style={{ color: primaryColor }}>Loading levels...</Text>
      return (
        <div style={{ padding: '0 24px' }}>
          <Space style={{ marginBottom: 8 }}>
            <Text strong style={{ color: primaryColor }}>Levels</Text>
            <Button size="small" type="primary" icon={<PlusOutlined />}
              onClick={() => { levelForm.resetFields(); setLevelModal({ open: true, courseId, record: null }) }}>
              Add Level
            </Button>
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
                    <Button size="small" icon={<EditOutlined />} onClick={() => {
                      levelForm.setFieldsValue({ name: l.name, level_number: l.level_number, duration_months: l.duration_months, status: l.status })
                      setLevelModal({ open: true, courseId, record: l })
                    }}>Edit</Button>
                    <Button size="small" danger icon={<DeleteOutlined />}
                      onClick={() => handleDelete('level', () => deleteLevel.mutateAsync(l.id))}>Delete</Button>
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
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: <span style={{ color: primaryColor }}>Name</span>, dataIndex: 'name', key: 'name' },
      { title: <span style={{ color: primaryColor }}>Duration (months)</span>, dataIndex: 'duration_months', key: 'duration' },
      { title: <span style={{ color: primaryColor }}>Status</span>, dataIndex: 'status', key: 'status', render: (v) => v ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
      {
        title: <span style={{ color: primaryColor }}>Actions</span>,
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue({ ...record, course_name: record.name }); setModal({ open: true, record }) }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('course', () => deleteCourse.mutateAsync(record.id))}>Delete</Button>
            <Button size="small" onClick={() => { setFeeModal({ open: true, course: record }) }}>Manage Fees</Button>
          </Space>
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        title={<Title level={4} style={{ color: primaryColor, margin: 0 }}>Courses</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal({ open: true, record: null }) }}>Add Course</Button>}
      >
        <Table dataSource={courses || []} columns={columns} rowKey="id" loading={isLoading}
          expandable={{ expandedRowRender: (course) => <ExpandedLevels courseId={course.id} /> }} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Course' : 'New Course'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createCourse.isLoading || updateCourse.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}
            initialValues={modal.record ? { ...modal.record, course_name: modal.record.name } : { status: true }}>
            <Form.Item name="course_name" label={<span style={{ color: primaryColor }}>Course Name</span>} rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label={<span style={{ color: primaryColor }}>Description</span>}><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="duration_months" label={<span style={{ color: primaryColor }}>Duration (months)</span>}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label={<span style={{ color: primaryColor }}>Active</span>} valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
        <Modal
          title={levelModal.record ? 'Edit Level' : 'New Level'}
          open={levelModal.open}
          onCancel={() => setLevelModal({ open: false, courseId: null, record: null })}
          onOk={() => levelForm.submit()}
          confirmLoading={createLevel.isLoading || updateLevel.isLoading}
        >
          <Form form={levelForm} layout="vertical" onFinish={handleLevelSave}
            initialValues={levelModal.record ? { name: levelModal.record.name, level_number: levelModal.record.level_number, duration_months: levelModal.record.duration_months, status: levelModal.record.status } : { status: true }}>
            <Form.Item name="name" label="Level Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="level_number" label="Level Number"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="duration_months" label="Duration (months)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
        <FeeModal />
      </Card>
    )
  }

  // ---------- Batches Tab ----------
  function BatchesTab() {
    const { data: batches, isLoading } = useBatches()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()
    const { data: courses } = useQuery({
      queryKey: ['master-courses-dropdown', orgId],
      queryFn: async () => {
        let query = supabase.from('courses').select('id, name').eq('status', true)
        if (orgId) query = query.eq('organization_id', orgId)
        const { data } = await query
        return data || []
      },
      enabled: !!orgId
    })
    const { data: teachers } = useQuery({
      queryKey: ['master-teachers-dropdown', branchId, fyId],
      queryFn: async () => {
        let query = supabase.from('teachers').select('id, first_name, last_name').eq('status', 'active')
        if (branchId) query = query.eq('branch_id', branchId)
        if (fyId) query = query.eq('financial_year_id', fyId)
        const { data } = await query
        return data || []
      },
      enabled: !!branchId && !!fyId
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
      { title: 'Course', render: (_, r) => r.courses?.name || '-' },
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
        <Table dataSource={batches || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
        <Modal
          title={modal.record ? 'Edit Batch' : 'New Batch'}
          open={modal.open}
          onCancel={() => setModal({ open: false, record: null })}
          onOk={() => form.submit()}
          confirmLoading={createBatch.isLoading || updateBatch.isLoading}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={modal.record || { status: 'active' }}>
            <Form.Item name="course_id" label="Course" rules={[{ required: true }]}>
              <Select>{courses?.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item name="batch_name" label="Batch Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="start_date" label="Start Date"><Input type="date" /></Form.Item>
            <Form.Item name="end_date" label="End Date"><Input type="date" /></Form.Item>
            <Form.Item name="teacher_id" label="Teacher">
              <Select>{teachers?.map(t => <Select.Option key={t.id} value={t.id}>{t.first_name} {t.last_name}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item name="capacity" label="Capacity"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label="Status">
              <Select><Select.Option value="active">Active</Select.Option><Select.Option value="inactive">Inactive</Select.Option></Select>
            </Form.Item>
            <Form.Item name="branch_id" label="Branch">
              <Select allowClear>{branchOptions?.map(b => <Select.Option key={b.id} value={b.id}>{b.branch_name}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item name="financial_year_id" label="Financial Year">
              <Select allowClear>{fyOptions?.map(f => <Select.Option key={f.id} value={f.id}>{f.name}</Select.Option>)}</Select>
            </Form.Item>
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
        <Table dataSource={sources || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
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

  // ---------- Branches Tab ----------
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
      { title: 'Branch Name', dataIndex: 'branch_name' },
      { title: 'City', dataIndex: 'city' },
      { title: 'State', dataIndex: 'state' },
      { title: 'Phone', dataIndex: 'phone' },
      { title: 'Email', dataIndex: 'email' },
      { title: 'Active', dataIndex: 'is_active', render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
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

  // ---------- Financial Years Tab ----------
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
      { title: 'Active', dataIndex: 'is_active', render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              form.setFieldsValue({ ...record, start_date: dayjs(record.start_date), end_date: dayjs(record.end_date) });
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

  // ---------- Inventory Tab ----------
  function InventoryTab() {
    const { data: items, isLoading } = useInventoryItems()
    const [modal, setModal] = useState({ open: false, record: null })
    const [form] = Form.useForm()
    const [itemType, setItemType] = useState('product')
    const [selectedCourseId, setSelectedCourseId] = useState(null)

    const { data: levelsForCourse } = useQuery({
      queryKey: ['levels-for-course-inventory', selectedCourseId, orgId],
      queryFn: async () => {
        if (!selectedCourseId || !orgId) return []
        const { data } = await supabase
          .from('course_levels')
          .select('id, name, level_number')
          .eq('course_id', selectedCourseId)
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .order('level_number')
        return data || []
      },
      enabled: !!selectedCourseId
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
          organization_id: orgId,
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
      } catch (err) { message.error(err.message) }
    }

    const columns = [
      { title: 'Name', dataIndex: 'item_name' },
      { title: 'Type', dataIndex: 'item_type', render: (t) => <Tag color={t === 'service' ? 'blue' : 'green'}>{t}</Tag> },
      { title: 'Price', dataIndex: 'unit_price', render: (v) => `₹${Number(v).toFixed(2)}` },
      { title: 'Stock', dataIndex: 'current_stock' },
      { title: 'Tax Rate', render: (_, record) => {
          const tax = taxRatesDropdown?.find(tr => tr.id === record.tax_rate_id)
          return tax ? `${tax.rate}%` : '-'
        }
      },
      { title: 'Course', render: (_, record) => coursesDropdown?.find(c => c.id === record.course_id)?.name || '-' },
      { title: 'Level', render: (_, record) => levelsList?.find(l => l.id === record.level_id)?.name || '-' },
      { title: 'Active', dataIndex: 'is_active', render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
      {
        title: 'Actions',
        render: (_, record) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              form.setFieldsValue({ ...record, tax_rate_id: record.tax_rate_id || null, course_id: record.course_id || null, level_id: record.level_id || null })
              setItemType(record.item_type)
              setSelectedCourseId(record.course_id || null)
              setModal({ open: true, record })
            }}>Edit</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('item', () => deleteInventoryItem.mutateAsync(record.id))}>Delete</Button>
          </Space>
        )
      }
    ]

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
                <Form.Item name="item_name" label="Item Name" rules={[{ required: true }]}><Input /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="item_type" label="Type" rules={[{ required: true }]}>
                  <Select onChange={(val) => { setItemType(val); setSelectedCourseId(null); form.setFieldsValue({ course_id: null, level_id: null }) }}>
                    <Select.Option value="product">Product</Select.Option>
                    <Select.Option value="service">Service</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="unit" label="Unit"><Input placeholder="pcs, box, etc." /></Form.Item></Col>
              <Col span={8}><Form.Item name="unit_price" label="Unit Price (₹)"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="current_stock" label="Current Stock"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="reorder_level" label="Reorder Level"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={8}><Form.Item name="hsn_sac_code" label="HSN/SAC Code"><Input /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="tax_rate_id" label="Tax Rate">
                  <Select allowClear>
                    {taxRatesDropdown?.map(tr => <Select.Option key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            {itemType === 'service' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="course_id" label="Course">
                    <Select allowClear onChange={(val) => setSelectedCourseId(val)}>
                      {coursesDropdown?.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="level_id" label="Level">
                    <Select allowClear disabled={!selectedCourseId}>
                      {levelsForCourse?.map(l => <Select.Option key={l.id} value={l.id}>{l.name} (Level {l.level_number})</Select.Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}
            <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          </Form>
        </Modal>
      </Card>
    )
  }

  // ===================== MAIN RENDER =====================
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
        <TabPane tab={<span style={{ color: primaryColor }}>Courses</span>} key="courses">
          <CoursesTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Batches</span>} key="batches">
          <BatchesTab />
        </TabPane>
        <TabPane tab={<span style={{ color: primaryColor }}>Inquiry Sources</span>} key="sources">
          <SourcesTab />
        </TabPane>
      </Tabs>
    </div>
  )
}

export default MasterDataPortal