// StudentEdit.jsx (fully fixed)
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Form, Input, Select, DatePicker, Button, Row, Col,
  message, Spin, Divider, Steps, Typography, Statistic, Alert
} from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Step } = Steps
const { Title } = Typography

const StudentEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const lastStudentId = useRef(null)

  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const statBg = darkMode ? '#2c2c2c' : '#f9f9f9'
  const labelColor = primaryColor

  // ----- 1. Fetch services (org‑wide) -----
  const { data: services, isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ['inventory-services-edit', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, description, unit_price, tax_rates(rate)')
        .eq('item_type', 'service')
        .eq('is_active', true)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
      if (error) throw error
      return data
    },
    enabled: !!org?.id,
  })

  // ----- 2. Fetch courses -----
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ['courses-dropdown', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .order('name')
      return data?.map(c => ({ ...c, course_name: c.name })) || []
    },
    enabled: !!org?.id,
  })

  // ----- 3. Fetch levels from course_levels -----
  const selectedCourseId = Form.useWatch('course_id', form)
  const { data: levels, isLoading: levelsLoading, error: levelsError } = useQuery({
    queryKey: ['levels-dropdown', selectedCourseId, org?.id],
    queryFn: async () => {
      if (!selectedCourseId || !org?.id) return []
      const { data } = await supabase
        .from('course_levels')
        .select('id, name, level_number')
        .eq('course_id', selectedCourseId)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .order('level_number')
      return data?.map(l => ({ ...l, level_name: l.name })) || []
    },
    enabled: !!selectedCourseId && !!org?.id,
  })

  // ----- 4. Fetch batches -----
  const { data: batches, isLoading: batchesLoading, error: batchesError } = useQuery({
    queryKey: ['batches-dropdown-edit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
        .is('deleted_at', null)
      if (error) throw error
      return data || []
    },
  })

  // ----- 5. Fetch student + parent + fee directly -----
  const { data: student, isLoading: studentLoading, error: studentError } = useQuery({
    queryKey: ['student-edit', id],
    queryFn: async () => {
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('*, parents(*)')
        .eq('id', id)
        .single()
      if (studentErr) throw studentErr

      const { data: feeData } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        ...studentData,
        parent: studentData.parents || null,
        fee: feeData || null,
      }
    },
    enabled: !!id,
  })

  const selectedServiceId = Form.useWatch('service_id', form)
  const selectedService = services?.find(s => s.id === selectedServiceId)

  // ----- Populate form -----
  useEffect(() => {
    if (student && lastStudentId.current !== student.id) {
      lastStudentId.current = student.id
      const parent = student.parent || {}
      const fee = student.fee || {}

      form.setFieldsValue({
        admission_form_number: student.admission_form_number || '',
        salutation: student.salutation || undefined,
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        suffix: student.suffix || undefined,
        gender: student.gender || undefined,
        dob: student.dob ? dayjs(student.dob) : null,
        mobile: student.mobile || '',
        whatsapp: student.whatsapp || '',
        email: student.email || '',
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || '',
        school_name: student.school_name || '',
        board: student.board || undefined,
        standard: student.standard || '',
        joining_date: student.joining_date ? dayjs(student.joining_date) : null,
        father_name: parent.father_name || '',
        mother_name: parent.mother_name || '',
        parent_mobile: parent.mobile || '',
        parent_email: parent.email || '',
        parent_occupation: parent.occupation || '',
        parent_address: parent.address || '',
        batch_id: student.batch_id || undefined,
        service_id: fee.service_id || undefined,
        course_id: student.course_id ? Number(student.course_id) : undefined,
        level_id: student.level_id ? Number(student.level_id) : undefined,
        discount: fee.discount || 0,
        due_date: fee.due_date ? dayjs(fee.due_date) : null,
      })
    }
  }, [student, form])

  const onFinish = async (values) => {
    try {
      const branchId = selectedBranch?.id || student.branch_id || null
      const financialYearId = selectedFinancialYear?.id || student.financial_year_id || null
      const orgId = org?.id

      // 1. Update student
      const studentData = {
        admission_form_number: values.admission_form_number || null,
        salutation: values.salutation || null,
        first_name: values.first_name,
        last_name: values.last_name || '',
        suffix: values.suffix || null,
        gender: values.gender || null,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        mobile: values.mobile,
        whatsapp: values.whatsapp || null,
        email: values.email || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        pincode: values.pincode || null,
        school_name: values.school_name || null,
        board: values.board || null,
        standard: values.standard || null,
        joining_date: values.joining_date ? values.joining_date.format('YYYY-MM-DD') : null,
        course_id: values.course_id || null,
        level_id: values.level_id || null,
        branch_id: branchId,
        financial_year_id: financialYearId,
        organization_id: orgId,
      }
      const { error: studentErr } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', Number(id))
      if (studentErr) throw studentErr

      // 2. Parent upsert
      const parentPayload = {
        father_name: values.father_name || null,
        mother_name: values.mother_name || null,
        mobile: values.parent_mobile || null,
        email: values.parent_email || null,
        occupation: values.parent_occupation || null,
        address: values.parent_address || null,
        branch_id: branchId,
        financial_year_id: financialYearId,
      }
      const hasParentData = Object.values(parentPayload).some(v => v && v !== '')
      if (student.parent?.id) {
        if (hasParentData) {
          await supabase.from('parents').update(parentPayload).eq('id', student.parent.id)
        }
      } else if (hasParentData) {
        const { data: newParent } = await supabase
          .from('parents')
          .insert([parentPayload])
          .select('id')
          .single()
        if (newParent) {
          await supabase.from('students').update({ parent_id: newParent.id }).eq('id', Number(id))
        }
      }

      // 3. Enrollment (optional)
      if (values.batch_id) {
        const { data: existingEnroll } = await supabase
          .from('student_enrollments')
          .select('id')
          .eq('student_id', Number(id))
          .eq('status', 'active')
          .maybeSingle()
        const enrollPayload = {
          student_id: Number(id),
          batch_id: values.batch_id,
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active',
          branch_id: branchId,
          financial_year_id: financialYearId,
        }
        if (existingEnroll?.id) {
          await supabase.from('student_enrollments').update(enrollPayload).eq('id', existingEnroll.id)
        } else {
          await supabase.from('student_enrollments').insert([enrollPayload])
        }
      }

      // 4. Fee upsert
      if (values.service_id) {
        const service = services?.find(s => s.id === values.service_id)
        if (service) {
          const taxRate = service.tax_rates?.[0]?.rate || 0
          const totalFee = service.unit_price * (1 + taxRate / 100)
          const discount = parseFloat(values.discount) || 0
          const finalFee = Math.max(totalFee - discount, 0)
          const feePayload = {
            student_id: Number(id),
            service_id: service.id,
            base_fee: service.unit_price,
            tax_rate: taxRate,
            tax_amount: totalFee - service.unit_price,
            total_fee: totalFee,
            discount,
            final_fee: finalFee,
            status: 'Pending',
            due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
            branch_id: branchId,
            financial_year_id: financialYearId,
            organization_id: orgId,            // ✅ required
          }

          const existingFee = student.fee
          if (existingFee?.id) {
            await supabase.from('student_fees').update(feePayload).eq('id', existingFee.id)
          } else {
            await supabase.from('student_fees').insert([feePayload])
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['student', id] })
      message.success('Student updated successfully')
      navigate(`/students/${id}`)
    } catch (err) {
      console.error('Submit error:', err)
      message.error(err.message)
    }
  }

  // Loading / error states
  const isLoading = studentLoading || servicesLoading || batchesLoading || coursesLoading || levelsLoading
  const anyError = studentError || servicesError || batchesError || coursesError || levelsError
  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  if (anyError) {
    const msg = anyError.message || 'Unknown error'
    return <Alert message="Error" description={msg} type="error" showIcon style={{ margin: 20 }} />
  }
  if (!student) return (
    <Card style={{ margin: 20, textAlign: 'center', backgroundColor: cardBg }}>
      <Title level={4} style={{ color: textColor }}>Student not found</Title>
      <Button onClick={() => navigate('/students')}>Back to Students</Button>
    </Card>
  )

  const steps = [
    { title: 'Personal' },
    { title: 'Address & School' },
    { title: 'Parent & Fee' },
  ]

  const labelStyle = { color: labelColor, fontWeight: 500, fontFamily: fontBody }

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Edit Student</span>}
        extra={<Button onClick={() => navigate(`/students/${id}`)} style={{ borderColor: primaryColor, color: primaryColor }}>Cancel</Button>}
        style={{
          maxWidth: 800, margin: '0 auto', borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`, backgroundColor: cardBg, fontFamily: fontBody,
        }}
      >
        <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
          {steps.map(step => <Step key={step.title} title={step.title} />)}
        </Steps>

        <Form form={form} layout="vertical" onFinish={onFinish} style={{ backgroundColor: cardBg }}>
          {/* Step 0: Personal */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="admission_form_number" label={<span style={labelStyle}>Adm. Form No</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="salutation" label={<span style={labelStyle}>Prefix</span>}>
                  <Select placeholder="None" allowClear style={{ fontFamily: fontBody }}>
                    <Option value="Mr.">Mr.</Option>
                    <Option value="Ms.">Ms.</Option>
                    <Option value="Miss">Miss</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="first_name" label={<span style={labelStyle}>First Name</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="suffix" label={<span style={labelStyle}>Suffix</span>}>
                  <Select placeholder="None" allowClear style={{ fontFamily: fontBody }}>
                    <Option value="Jr.">Jr.</Option>
                    <Option value="Sr.">Sr.</Option>
                    <Option value="Master">Master</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="last_name" label={<span style={labelStyle}>Last Name</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="gender" label={<span style={labelStyle}>Gender</span>}>
                  <Select style={{ fontFamily: fontBody }}>
                    <Option value="M">Male</Option>
                    <Option value="F">Female</Option>
                    <Option value="O">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="dob" label={<span style={labelStyle}>Date of Birth</span>}>
                  <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="joining_date" label={<span style={labelStyle}>Admission Date</span>}>
                  <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="mobile" label={<span style={labelStyle}>Mobile</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="whatsapp" label={<span style={labelStyle}>WhatsApp</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="email" label={<span style={labelStyle}>Email</span>}>
                  <Input type="email" style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ borderColor }} />
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={() => setCurrentStep(1)} style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>Next</Button>
            </div>
          </div>

          {/* Step 1: Address & School */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Divider style={{ color: primaryColor, borderColor }}>Address</Divider>
            <Form.Item name="address" label={<span style={labelStyle}>Address</span>}>
              <Input.TextArea rows={2} style={{ fontFamily: fontBody }} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="city" label={<span style={labelStyle}>City</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="state" label={<span style={labelStyle}>State</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="pincode" label={<span style={labelStyle}>Pincode</span>}>
                  <Input maxLength={6} style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ color: primaryColor, borderColor }}>School</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="school_name" label={<span style={labelStyle}>School Name</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="board" label={<span style={labelStyle}>Board</span>}>
                  <Select style={{ fontFamily: fontBody }}>
                    <Option value="GSEB">GSEB</Option>
                    <Option value="CBSE">CBSE</Option>
                    <Option value="ICSE">ICSE</Option>
                    <Option value="IB">IB</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="standard" label={<span style={labelStyle}>Standard</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ borderColor }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(0)}>Previous</Button>
              <Button type="primary" onClick={() => setCurrentStep(2)} style={{ backgroundColor: primaryColor }}>Next</Button>
            </div>
          </div>

          {/* Step 2: Parent, Course, Level, Batch, Fee */}
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            <Divider style={{ color: primaryColor, borderColor }}>Parent (optional)</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="father_name" label={<span style={labelStyle}>Father Name</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="mother_name" label={<span style={labelStyle}>Mother Name</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="parent_mobile" label={<span style={labelStyle}>Parent Mobile</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="parent_email" label={<span style={labelStyle}>Parent Email</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="parent_occupation" label={<span style={labelStyle}>Occupation</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="parent_address" label={<span style={labelStyle}>Parent Address</span>}>
              <Input.TextArea rows={2} style={{ fontFamily: fontBody }} />
            </Form.Item>

            <Divider style={{ color: primaryColor, borderColor }}>Course & Level</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="course_id" label={<span style={labelStyle}>Course</span>}>
                  <Select
                    placeholder="Select course"
                    showSearch
                    style={{ fontFamily: fontBody }}
                    optionFilterProp="children"
                    loading={coursesLoading}
                    notFoundContent="No courses found"
                  >
                    {courses?.map(c => (
                      <Option key={c.id} value={c.id}>{c.course_name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="level_id" label={<span style={labelStyle}>Level</span>}>
                  <Select
                    placeholder={selectedCourseId ? "Select level" : "Select a course first"}
                    showSearch
                    style={{ fontFamily: fontBody }}
                    loading={levelsLoading}
                    disabled={!selectedCourseId}
                    notFoundContent={selectedCourseId ? 'No levels for this course' : '—'}
                    allowClear
                  >
                    {levels?.map(l => (
                      <Option key={l.id} value={l.id}>{l.level_name} (Lv.{l.level_number})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ color: primaryColor, borderColor }}>Batch & Fee</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="service_id" label={<span style={labelStyle}>Select Service</span>}>
                  <Select
                    placeholder="Select a service"
                    showSearch
                    style={{ fontFamily: fontBody }}
                    optionFilterProp="children"
                  >
                    {services?.map(s => (
                      <Option key={s.id} value={s.id}>{s.item_name} – ₹{s.unit_price}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="batch_id" label={<span style={labelStyle}>Batch</span>}>
                  <Select
                    placeholder="Select batch (optional)"
                    allowClear
                    showSearch
                    style={{ fontFamily: fontBody }}
                    loading={batchesLoading}
                    notFoundContent="No batches available"
                  >
                    {batches?.map(b => (
                      <Option key={b.id} value={b.id}>{b.batch_name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="discount" label={<span style={labelStyle}>Discount (₹)</span>}>
                  <Input type="number" min={0} style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="due_date" label={<span style={labelStyle}>Fee Due Date</span>}>
                  <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>

            {selectedService && (
              <Card size="small" style={{ marginBottom: 16, backgroundColor: statBg, borderColor: primaryColor }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Base Fee" value={selectedService.unit_price} prefix="₹" precision={2} valueStyle={{ fontFamily: fontHeading, color: primaryColor }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Tax Rate" value={selectedService.tax_rates?.[0]?.rate || 0} suffix="%" valueStyle={{ fontFamily: fontHeading, color: primaryColor }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Total Fee" value={selectedService.unit_price * (1 + (selectedService.tax_rates?.[0]?.rate || 0) / 100)} prefix="₹" precision={2} valueStyle={{ fontFamily: fontHeading, color: primaryColor }} />
                  </Col>
                </Row>
              </Card>
            )}

            <Divider style={{ borderColor }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(1)}>Previous</Button>
              <Button
                type="primary"
                onClick={() => form.submit()}
                style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default StudentEdit