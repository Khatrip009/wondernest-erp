// src/pages/courses/CourseList.jsx
import { useState } from 'react'
import {
  Table, Button, Space, Tag, Modal, Form, Input, InputNumber,
  Select, Switch, message, Card, Typography, Divider, Row, Col
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined
} from '@ant-design/icons'
import {
  useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse,
  useCourseLevels, useCreateCourseLevel, useUpdateCourseLevel, useDeleteCourseLevel,
  useCourseFees, useSaveCourseFee, useDeleteCourseFee
} from '../../hooks/useCourses'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext' // to get orgId

const { Text, Title } = Typography
const { confirm } = Modal

const CourseList = () => {
  const { theme } = useTheme()
  const { org } = useOrganization() // get current organization id

  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const { data: courses, isLoading } = useCourses()
  const [courseModal, setCourseModal] = useState({ open: false, record: null })
  const [levelModal, setLevelModal] = useState({ open: false, courseId: null, record: null })
  const [feeModal, setFeeModal] = useState({ open: false, levelId: null, courseId: null, record: null })

  const createCourseMut = useCreateCourse()
  const updateCourseMut = useUpdateCourse()
  const deleteCourseMut = useDeleteCourse()
  const createLevelMut = useCreateCourseLevel()
  const updateLevelMut = useUpdateCourseLevel()
  const deleteLevelMut = useDeleteCourseLevel()
  const saveFeeMut = useSaveCourseFee()
  const deleteFeeMut = useDeleteCourseFee()

  const { data: taxRates } = useQuery({
    queryKey: ['tax_rates'],
    queryFn: async () => {
      const { data } = await supabase.from('tax_rates').select('id, rate, name').eq('is_active', true)
      return data
    }
  })

  // ---------- Course CRUD ----------
  const handleCourseOk = async (values) => {
    try {
      if (courseModal.record) {
        await updateCourseMut.mutateAsync({ id: courseModal.record.id, ...values })
        message.success('Course updated')
      } else {
        await createCourseMut.mutateAsync({
          ...values,
          organization_id: org?.id,
          medium: values.medium || null,
        })
        message.success('Course created')
      }
      setCourseModal({ open: false, record: null })
    } catch (err) { message.error(err.message) }
  }

  const handleDeleteCourse = (record) => {
    confirm({
      title: 'Delete this course?',
      icon: <ExclamationCircleOutlined />,
      onOk: async () => { await deleteCourseMut.mutateAsync(record.id); message.success('Course deleted') }
    })
  }

  // ---------- Level CRUD ----------
  const handleLevelOk = async (values) => {
    try {
      if (levelModal.record) {
        await updateLevelMut.mutateAsync({ id: levelModal.record.id, ...values })
        message.success('Level updated')
      } else {
        await createLevelMut.mutateAsync({
          ...values,
          course_id: levelModal.courseId,
          organization_id: org?.id,
        })
        message.success('Level created')
      }
      setLevelModal({ open: false, courseId: null, record: null })
    } catch (err) { message.error(err.message) }
  }

  const handleDeleteLevel = (record) => {
    confirm({
      title: 'Delete level?',
      onOk: async () => { await deleteLevelMut.mutateAsync(record.id); message.success('Level deleted') }
    })
  }

  // ---------- Fee CRUD (now inventory items) ----------
  const handleFeeOk = async (values) => {
    try {
      const payload = {
        id: feeModal.record?.id,          // present if editing
        course_id: feeModal.courseId,
        level_id: feeModal.levelId,
        unit_price: values.unit_price,    // renamed from fee_amount
        tax_rate_id: values.tax_rate_id,
        item_name: values.item_name || `Service fee for course ${feeModal.courseId}`,
        organization_id: org?.id,
      }
      await saveFeeMut.mutateAsync(payload)
      message.success('Fee saved')
      setFeeModal({ open: false, levelId: null, courseId: null, record: null })
    } catch (err) { message.error(err.message) }
  }

  const handleDeleteFee = (record) => {
    confirm({
      title: 'Delete fee?',
      onOk: async () => { await deleteFeeMut.mutateAsync(record.id); message.success('Fee deleted') }
    })
  }

  // ---------- Expanded row render ----------
  const expandedRowRender = (course) => {
    const LevelsSection = () => {
      const { data: levels, isLoading: levelsLoading } = useCourseLevels(course.id)
      const { data: fees, isLoading: feesLoading } = useCourseFees(course.id)

      if (levelsLoading || feesLoading) return <Text style={{ fontFamily: fontBody }}>Loading levels...</Text>

      return (
        <div style={{ padding: '0 24px' }}>
          <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
            <Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>
              Levels & Fees for {course.name}
            </Text>
            <Button type="primary" size="small" icon={<PlusOutlined />}
              onClick={() => setLevelModal({ open: true, courseId: course.id, record: null })}>
              Add Level
            </Button>
          </Space>
          {levels?.length ? levels.map(level => {
            const levelFee = fees?.find(f => f.level_id === level.id)
            return (
              <Card key={level.id} size="small"
                style={{ marginBottom: 8, borderColor: primaryColor, fontFamily: fontBody }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong style={{ fontFamily: fontHeading, color: primaryColor }}>{level.name}</Text>
                    <Text style={{ fontFamily: fontBody, color: primaryColor }}>
                      {' '}(Lv.{level.level_number}) — {level.duration_months ? `${level.duration_months} months` : ''}
                    </Text>
                  </Col>
                  <Col>
                    <Space>
                      <Button size="small" icon={<EditOutlined />}
                        onClick={() => setLevelModal({ open: true, courseId: course.id, record: level })}>
                        Edit
                      </Button>
                      <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => handleDeleteLevel(level)}>Delete</Button>
                    </Space>
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <div>
                  {levelFee ? (
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text style={{ fontFamily: fontBody, color: primaryColor }}>
                          Fee: ₹{levelFee.unit_price} | Tax: {levelFee.tax_rates?.rate}%
                        </Text>
                        {levelFee.tax_rates?.rate && (
                          <Text type="secondary" style={{ marginLeft: 8, fontFamily: fontBody, color: primaryColor }}>
                            (Total: ₹{(levelFee.unit_price * (1 + levelFee.tax_rates.rate / 100)).toFixed(2)})
                          </Text>
                        )}
                      </Col>
                      <Col>
                        <Space>
                          <Button size="small" icon={<EditOutlined />}
                            onClick={() => setFeeModal({ open: true, levelId: level.id, courseId: course.id, record: levelFee })}>
                            Edit Fee
                          </Button>
                          <Button size="small" danger style={{ marginLeft: 8 }}
                            onClick={() => handleDeleteFee(levelFee)}>Delete Fee</Button>
                        </Space>
                      </Col>
                    </Row>
                  ) : (
                    <Button type="primary" size="small" icon={<PlusOutlined />}
                      onClick={() => setFeeModal({ open: true, levelId: level.id, courseId: course.id, record: null })}>
                      Add Fee
                    </Button>
                  )}
                </div>
              </Card>
            )
          }) : <Text type="secondary" style={{ fontFamily: fontBody, color: primaryColor }}>No levels yet.</Text>}
        </div>
      )
    }

    return <LevelsSection />
  }

  // ---------- Course table columns ----------
  const courseColumns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Course Name</span>,
      dataIndex: 'name',              // changed from 'course_name'
      key: 'name',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Medium</span>,
      dataIndex: 'medium',
      key: 'medium',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text || '—'}</span>
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Duration (months)</span>,
      dataIndex: 'duration_months',
      key: 'duration',
      render: (text) => <span style={{ color: primaryColor, fontFamily: fontBody }}>{text}</span>
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Status</span>,
      dataIndex: 'status',
      key: 'status',
      render: (val) => val
        ? <Tag color="green" style={{ fontFamily: fontBody }}>Active</Tag>
        : <Tag color="red" style={{ fontFamily: fontBody }}>Inactive</Tag>
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Actions</span>,
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => setCourseModal({ open: true, record })}>Edit</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteCourse(record)}>Delete</Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        title={<Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>Courses, Levels & Fees</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCourseModal({ open: true, record: null })}>Add Course</Button>
        }
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}` }}
      >
        <Table
          dataSource={courses}
          columns={courseColumns}
          rowKey="id"
          loading={isLoading}
          expandable={{ expandedRowRender, rowExpandable: () => true }}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* Course Modal */}
      <Modal
        title={courseModal.record ? 'Edit Course' : 'New Course'}
        open={courseModal.open}
        onCancel={() => setCourseModal({ open: false, record: null })}
        onOk={() => {
          const form = document.getElementById('course-form')
          form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }}
        confirmLoading={createCourseMut.isLoading || updateCourseMut.isLoading}
        style={{ fontFamily: fontBody }}
      >
        <Form
          id="course-form"
          layout="vertical"
          initialValues={courseModal.record || { name: '', description: '', medium: '', duration_months: '', status: true }}
          onFinish={handleCourseOk}
        >
          <Form.Item name="name" label="Course Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="medium" label="Medium (optional)">
            <Input placeholder="e.g., English, Gujarati" />
          </Form.Item>
          <Form.Item name="duration_months" label="Duration (months)">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Level Modal */}
      <Modal
        title={levelModal.record ? 'Edit Level' : 'New Level'}
        open={levelModal.open}
        onCancel={() => setLevelModal({ open: false, courseId: null, record: null })}
        onOk={() => {
          const form = document.getElementById('level-form')
          form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }}
        confirmLoading={createLevelMut.isLoading || updateLevelMut.isLoading}
        style={{ fontFamily: fontBody }}
      >
        <Form
          id="level-form"
          layout="vertical"
          initialValues={levelModal.record || { name: '', level_number: '', duration_months: '', status: true }}
          onFinish={handleLevelOk}
        >
          <Form.Item name="name" label="Level Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="level_number" label="Level Number">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="duration_months" label="Duration (months)">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Fee Modal (now inventory item) */}
      <Modal
        title={feeModal.record ? 'Edit Fee' : 'Add Fee'}
        open={feeModal.open}
        onCancel={() => setFeeModal({ open: false, levelId: null, courseId: null, record: null })}
        onOk={() => {
          const form = document.getElementById('fee-form')
          form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }}
        confirmLoading={saveFeeMut.isLoading}
        style={{ fontFamily: fontBody }}
      >
        <Form
          id="fee-form"
          layout="vertical"
          initialValues={feeModal.record
            ? { unit_price: feeModal.record.unit_price, tax_rate_id: feeModal.record.tax_rate_id, item_name: feeModal.record.item_name }
            : { unit_price: '', tax_rate_id: undefined, item_name: '' }
          }
          onFinish={handleFeeOk}
        >
          <Form.Item name="item_name" label="Service Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Tuition Fee" />
          </Form.Item>
          <Form.Item name="unit_price" label="Fee Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="tax_rate_id" label="Tax Rate">
            <Select placeholder="Select tax rate" allowClear>
              {taxRates?.map(tr => (
                <Select.Option key={tr.id} value={tr.id}>{tr.name} ({tr.rate}%)</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CourseList