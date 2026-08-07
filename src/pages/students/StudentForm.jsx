// StudentForm.jsx (fully fixed)
import { useState } from 'react'
import {
  Card, Form, Input, Select, DatePicker, Button, Row, Col,
  message, Divider, Steps, Statistic, Spin, Alert
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Option } = Select
const { Step } = Steps

const StudentForm = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
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

  // Services (org‑wide, not branch‑scoped)
  const { data: services, isLoading: sLoading, error: sError } = useQuery({
    queryKey: ['inventory-services', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, unit_price, tax_rates(rate)')
        .eq('item_type', 'service')
        .eq('is_active', true)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
      if (error) throw error
      return data
    },
    enabled: !!org?.id,
  })

  // Courses (org‑wide, no parent_id filter)
  const { data: courses, isLoading: cLoading, error: cError } = useQuery({
    queryKey: ['courses-dropdown', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('organization_id', org.id)
        .eq('status', true)
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!org?.id,
  })

  const selectedCourseId = Form.useWatch('course_id', form)

  // Levels from course_levels table
  const { data: levels, isLoading: lLoading, error: lError } = useQuery({
    queryKey: ['levels-dropdown', selectedCourseId, org?.id],
    queryFn: async () => {
      if (!selectedCourseId || !org?.id) return []
      const { data, error } = await supabase
        .from('course_levels')
        .select('id, name, level_number')
        .eq('course_id', selectedCourseId)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .order('level_number')
      if (error) throw error
      return data || []
    },
    enabled: !!selectedCourseId && !!org?.id,
  })

  // Batches (branch‑scoped)
  const { data: batches, isLoading: bLoading, error: bError } = useQuery({
    queryKey: ['batches-dropdown', selectedBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
        .is('deleted_at', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedBranch?.id,
  })

  const selectedServiceId = Form.useWatch('service_id', form)
  const selectedService = services?.find(s => s.id === selectedServiceId)

  const steps = [
    { title: 'Personal' },
    { title: 'Address & School' },
    { title: 'Parent & Enrollment' },
  ]

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const branchId = selectedBranch?.id || null
      const financialYearId = selectedFinancialYear?.id || null

      // Auth user creation via Edge Function
      let authUserId = null
      if (values.email) {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          'create-student-user',
          {
            body: {
              email: values.email,
              password: 'student123',
              fullName: `${values.first_name} ${values.last_name || ''}`.trim(),
              organization_id: org?.id || null,
              branch_id: branchId || null,
              financial_year_id: financialYearId || null,
            },
          }
        )
        if (fnError) {
          console.error('Edge function error:', fnError)
          throw new Error(fnError.message || 'Failed to create student user')
        }
        if (result?.success && result?.userId) {
          authUserId = result.userId
        } else {
          console.warn('Student auth user not created (may already exist)')
        }
      }

      // Student data
      const studentData = {
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
        joining_date: values.joining_date
          ? values.joining_date.format('YYYY-MM-DD')
          : new Date().toISOString().split('T')[0],
        status: 'active',
        branch_id: branchId,
        financial_year_id: financialYearId,
        admission_form_number: values.admission_form_number || null,
        user_id: authUserId,
        course_id: values.course_id || null,
        level_id: values.level_id || null,
        organization_id: org?.id,
      }

      // Parent data
      const parentPayload = {
        father_name: values.father_name || null,
        mother_name: values.mother_name || null,
        mobile: values.parent_mobile || null,
        email: values.parent_email || null,
        occupation: values.parent_occupation || null,
        address: values.parent_address || null,
      }
      const hasParentData = Object.values(parentPayload).some(v => v)
      const parentData = hasParentData ? parentPayload : null

      // Enrollment data
      const enrollmentData = values.batch_id
        ? { batch_id: values.batch_id, enrollment_date: new Date().toISOString().split('T')[0] }
        : null

      // Fee data
      let feeData = null
      if (selectedService && values.service_id) {
        const taxRate = selectedService.tax_rates?.[0]?.rate || 0
        const basePrice = selectedService.unit_price
        const discount = parseFloat(values.discount) || 0
        const taxableBase = Math.max(basePrice - discount, 0)
        const taxAmount = taxableBase * taxRate / 100
        const finalFee = taxableBase + taxAmount
        feeData = {
          service_id: selectedService.id,
          base_fee: taxableBase,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_fee: finalFee,
          discount: discount,
          final_fee: finalFee,
          due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        }
      }

      // Call RPC
      const { data, error } = await supabase.rpc('create_student_with_user', {
        student_data: studentData,
        parent_data: parentData,
        enrollment_data: enrollmentData,
        fee_data: feeData,
      })
      if (error) throw error

      message.success(`Student created (Admission No: ${data.admission_no})`)
      navigate('/students')
    } catch (err) {
      console.error(err)
      message.error(err.message || 'Failed to create student')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { color: labelColor, fontWeight: 500, fontFamily: fontBody }

  if (!org) return <Alert message="No organization found" type="error" showIcon style={{ margin: 20 }} />
  if (!selectedBranch) return <Alert message="Branch required" description="Please select a branch from the top bar before creating a student." type="warning" showIcon style={{ margin: 20 }} />

  if (sLoading || cLoading || bLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  const errorMsg = sError?.message || cError?.message || bError?.message || lError?.message
  if (errorMsg) return <Alert message="Error loading data" description={errorMsg} type="error" showIcon style={{ margin: 20 }} />

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>New Student Admission</span>}
        extra={<Button onClick={() => navigate('/students')} style={{ borderColor: primaryColor, color: primaryColor }}>Cancel</Button>}
        style={{
          maxWidth: 800,
          margin: '0 auto',
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
          fontFamily: fontBody,
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
                <Form.Item name="salutation" label={<span style={labelStyle}>Prefix</span>} rules={[{ required: true, message: 'Select a salutation' }]}>
                  <Select placeholder="Select" allowClear={false} style={{ fontFamily: fontBody }}>
                    <Option value="Mr.">Mr.</Option>
                    <Option value="Ms.">Ms.</Option>
                    <Option value="Mrs.">Mrs.</Option>
                    <Option value="Miss">Miss</Option>
                    <Option value="Jr.">Jr.</Option>
                    <Option value="Sr.">Sr.</Option>
                    <Option value="Master">Master</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="first_name" label={<span style={labelStyle}>First Name</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={9}>
                <Form.Item name="last_name" label={<span style={labelStyle}>Last Name</span>} rules={[{ required: true, message: 'Last name is required' }]}>
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
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="gender" label={<span style={labelStyle}>Gender</span>} rules={[{ required: true, message: 'Select gender' }]}>
                  <Select allowClear={false} style={{ fontFamily: fontBody }}>
                    <Option value="M">Male</Option>
                    <Option value="F">Female</Option>
                    <Option value="O">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="dob" label={<span style={labelStyle}>Date of Birth</span>} rules={[{ required: true, message: 'Select date of birth' }]}>
                  <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="joining_date" label={<span style={labelStyle}>Admission Date</span>} rules={[{ required: true, message: 'Select joining date' }]}>
                  <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ color: primaryColor, borderColor }}>Contact</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="mobile" label={<span style={labelStyle}>Mobile</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="whatsapp" label={<span style={labelStyle}>WhatsApp</span>}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="email" label={<span style={labelStyle}>Email</span>}>
              <Input type="email" style={{ fontFamily: fontBody }} />
            </Form.Item>
            <Divider style={{ borderColor }} />
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={() => setCurrentStep(1)} style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}>Next</Button>
            </div>
          </div>

          {/* Step 1: Address & School */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Divider style={{ color: primaryColor, borderColor }}>Address</Divider>
            <Form.Item name="address" label={<span style={labelStyle}>Address</span>} rules={[{ required: true }]}>
              <Input.TextArea rows={2} style={{ fontFamily: fontBody }} />
            </Form.Item>
            <Form.Item name="admission_form_number" label={<span style={labelStyle}>Admission Form Number</span>}>
              <Input placeholder="e.g. AF-2024-001" style={{ fontFamily: fontBody }} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="city" label={<span style={labelStyle}>City</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="state" label={<span style={labelStyle}>State</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="pincode" label={<span style={labelStyle}>Pincode</span>} rules={[{ required: true }]}>
                  <Input maxLength={6} style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ color: primaryColor, borderColor }}>School</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="school_name" label={<span style={labelStyle}>School Name</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="board" label={<span style={labelStyle}>Board</span>} rules={[{ required: true }]}>
                  <Select allowClear={false} style={{ fontFamily: fontBody }}>
                    <Option value="GSEB">GSEB</Option>
                    <Option value="CBSE">CBSE</Option>
                    <Option value="ICSE">ICSE</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="standard" label={<span style={labelStyle}>Standard</span>} rules={[{ required: true }]}>
                  <Input style={{ fontFamily: fontBody }} />
                </Form.Item>
              </Col>
            </Row>
            <Divider style={{ borderColor }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(0)} style={{ fontFamily: fontBody }}>Previous</Button>
              <Button type="primary" onClick={() => setCurrentStep(2)} style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}>Next</Button>
            </div>
          </div>

          {/* Step 2: Parent & Enrollment */}
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

            <Divider style={{ color: primaryColor, borderColor }}>Course & Fee</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="course_id" label={<span style={labelStyle}>Course</span>} rules={[{ required: true, message: 'Select a course' }]}>
                  <Select
                    placeholder="Select a course"
                    showSearch
                    style={{ fontFamily: fontBody }}
                    optionFilterProp="children"
                    loading={cLoading}
                    notFoundContent="No courses available"
                  >
                    {courses?.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="level_id" label={<span style={labelStyle}>Level</span>} rules={[{ required: true, message: 'Select a level' }]}>
                  <Select
                    placeholder={selectedCourseId ? "Select a level" : "Select a course first"}
                    showSearch
                    style={{ fontFamily: fontBody }}
                    loading={lLoading}
                    disabled={!selectedCourseId}
                    notFoundContent={selectedCourseId ? 'No levels for this course' : '—'}
                  >
                    {levels?.map(l => <Option key={l.id} value={l.id}>{l.name} (Lv.{l.level_number})</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="service_id" label={<span style={labelStyle}>Select Service</span>} rules={[{ required: true, message: 'Select a service' }]}>
                  <Select
                    placeholder="Select a service"
                    showSearch
                    style={{ fontFamily: fontBody }}
                    optionFilterProp="children"
                    notFoundContent="No services available"
                  >
                    {services?.map(s => <Option key={s.id} value={s.id}>{s.item_name} – ₹{s.unit_price}</Option>)}
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
                    loading={bLoading}
                    notFoundContent="No batches available"
                  >
                    {batches?.map(b => <Option key={b.id} value={b.id}>{b.batch_name}</Option>)}
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
              <Button onClick={() => setCurrentStep(1)} style={{ fontFamily: fontBody }}>Previous</Button>
              <Button
                type="primary"
                onClick={() => form.submit()}
                loading={loading}
                style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}
              >
                Create Student
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default StudentForm