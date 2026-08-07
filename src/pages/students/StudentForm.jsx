import { useState } from 'react'
import {
  Card, Form, Input, Select, DatePicker, Button, Row, Col,
  message, Divider, Steps, Statistic, Spin, Alert
} from 'antd'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Option } = Select
const { Step } = Steps

const StudentForm = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext()
  const { selectedBranch, selectedFinancialYear } = outletContext || {}

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  // ----- Fetch services (inventory_items of type 'service') -----
  const {
    data: services,
    isLoading: sLoading,
    error: sError
  } = useQuery({
    queryKey: ['inventory-services', selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('id, item_name, description, unit_price, tax_rates(rate)')
        .eq('item_type', 'service')
        .eq('is_active', true)
        .is('deleted_at', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)    // ✅ filter by branch
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!selectedBranch?.id,   // ✅ require branch
  })

  // ----- Fetch courses (root courses only) -----
// ----- Fetch courses (root courses only) -----
const {
  data: courses,
  isLoading: cLoading,
  error: cError
} = useQuery({
  queryKey: ['courses-dropdown', org?.id, selectedBranch?.id],
  queryFn: async () => {
    let query = supabase
      .from('courses')
      .select('id, name')
      .is('parent_id', null)
      .eq('status', true)
      .is('deleted_at', null)
      .order('name')
    
    if (org?.id) query = query.eq('organization_id', org.id)
    if (selectedBranch?.id) {
      query = query.or(`branch_id.eq.${selectedBranch.id},branch_id.is.null`)
    }
    const { data, error } = await query
    if (error) throw error
    return data?.map(c => ({ ...c, course_name: c.name })) || []
  },
  enabled: !!org?.id,
})

// ----- Fetch levels -----
const selectedCourseId = Form.useWatch('course_id', form)
const {
  data: levels,
  isLoading: lLoading,
  error: lError
} = useQuery({
  queryKey: ['levels-dropdown', selectedCourseId, org?.id, selectedBranch?.id],
  queryFn: async () => {
    if (!selectedCourseId) return []
    let query = supabase
      .from('courses')
      .select('id, name, level_number')
      .eq('parent_id', selectedCourseId)
      .eq('status', true)
      .is('deleted_at', null)
      .order('level_number')
    
    if (org?.id) query = query.eq('organization_id', org.id)
    if (selectedBranch?.id) {
      query = query.or(`branch_id.eq.${selectedBranch.id},branch_id.is.null`)
    }
    const { data, error } = await query
    if (error) throw error
    return data?.map(l => ({ ...l, level_name: l.name })) || []
  },
  enabled: !!selectedCourseId && !!org?.id,
})
  // ----- Fetch batches -----
  const {
    data: batches,
    isLoading: bLoading,
    error: bError
  } = useQuery({
    queryKey: ['batches-dropdown', selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('status', 'active')
        .is('deleted_at', null)
      if (selectedBranch?.id) query = query.eq('branch_id', selectedBranch.id)    // ✅ filter by branch
      if (selectedFinancialYear?.id) query = query.eq('financial_year_id', selectedFinancialYear.id)
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

      // ----- Create auth user if email provided -----
      let authUserId = null
      if (values.email) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: 'student123',
          options: {
            data: {
              full_name: `${values.first_name} ${values.last_name || ''}`.trim(),
              mobile: values.mobile,
              role: 'student',
            },
          },
        })
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            console.warn('Auth user already exists, student will be created without auth link')
          } else {
            throw signUpError
          }
        } else {
          authUserId = signUpData.user.id
        }
      }

      // ----- Build student data (with organization_id) -----
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
        joining_date: values.joining_date ? values.joining_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        status: 'active',
        branch_id: branchId,
        financial_year_id: financialYearId,
        admission_form_number: values.admission_form_number || null,
        user_id: authUserId,
        course_id: values.course_id || null,
        level_id: values.level_id || null,
        organization_id: org?.id,   // ✅ ensure org_id is set
      }

      // ----- Parent data -----
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

      // ----- Enrollment data -----
      const enrollmentData = values.batch_id
        ? { batch_id: values.batch_id, enrollment_date: new Date().toISOString().split('T')[0] }
        : null

      // ----- Fee data -----
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

      // ----- Call the all-in-one RPC -----
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

  const labelStyle = { color: primaryColor, fontWeight: 500, fontFamily: fontBody }

  // ----- Guards -----
  if (!org) {
    return <Alert message="No organization found" type="error" showIcon style={{ margin: 20 }} />
  }
  if (!selectedBranch) {
    return (
      <Alert
        message="Branch required"
        description="Please select a branch from the top bar before creating a student."
        type="warning"
        showIcon
        style={{ margin: 20 }}
      />
    )
  }

  // ----- Loading states -----
  if (sLoading || cLoading || bLoading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  }

  const errorMsg = sError?.message || cError?.message || bError?.message || lError?.message
  if (errorMsg) {
    return <Alert message="Error loading data" description={errorMsg} type="error" showIcon style={{ margin: 20 }} />
  }

  // ----- Render -----
  return (
    <Card
      title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>New Student Admission</span>}
      extra={<Button onClick={() => navigate('/students')} style={{ borderColor: primaryColor, color: primaryColor }}>Cancel</Button>}
      style={{
        maxWidth: 800,
        margin: '0 auto',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderTop: `4px solid ${primaryColor}`,
        fontFamily: fontBody,
      }}
    >
      <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
        {steps.map(step => <Step key={step.title} title={step.title} />)}
      </Steps>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Step 0: Personal */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="salutation" label={<span style={labelStyle}>Prefix</span>} rules={[{ required: true, message: 'Select a salutation' }]}>
                <Select placeholder="Select" allowClear={false} style={{ fontFamily: fontBody }}>
                  <Option value="Mr.">Mr.</Option>
                  <Option value="Ms.">Ms.</Option>
                  <Option value="Mrs.">Mrs.</Option>
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
          <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>Contact</Divider>
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
          <Divider />
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" onClick={() => setCurrentStep(1)} style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}>Next</Button>
          </div>
        </div>

        {/* Step 1: Address & School */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Divider orientation="left" style={{ color: primaryColor, fontFamily: fontHeading }}>Address</Divider>
          <Form.Item name="address" label={<span style={labelStyle}>Address</span>} rules={[{ required: true, message: 'Address is required' }]}>
            <Input.TextArea rows={2} style={{ fontFamily: fontBody }} />
          </Form.Item>
          <Form.Item name="admission_form_number" label={<span style={labelStyle}>Admission Form Number</span>}>
            <Input placeholder="e.g. AF-2024-001" style={{ fontFamily: fontBody }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label={<span style={labelStyle}>City</span>} rules={[{ required: true, message: 'City is required' }]}>
                <Input style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label={<span style={labelStyle}>State</span>} rules={[{ required: true, message: 'State is required' }]}>
                <Input style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pincode" label={<span style={labelStyle}>Pincode</span>} rules={[{ required: true, message: 'Pincode is required' }]}>
                <Input maxLength={6} style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left" style={{ color: primaryColor, fontFamily: fontHeading }}>School</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="school_name" label={<span style={labelStyle}>School Name</span>} rules={[{ required: true, message: 'School name is required' }]}>
                <Input style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="board" label={<span style={labelStyle}>Board</span>} rules={[{ required: true, message: 'Board is required' }]}>
                <Select allowClear={false} style={{ fontFamily: fontBody }}>
                  <Option value="GSEB">GSEB</Option>
                  <Option value="CBSE">CBSE</Option>
                  <Option value="ICSE">ICSE</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="standard" label={<span style={labelStyle}>Standard</span>} rules={[{ required: true, message: 'Standard/Class is required' }]}>
                <Input style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)} style={{ fontFamily: fontBody }}>Previous</Button>
            <Button type="primary" onClick={() => setCurrentStep(2)} style={{ backgroundColor: primaryColor, borderColor: primaryColor, fontFamily: fontBody }}>Next</Button>
          </div>
        </div>

        {/* Step 2: Parent, Course, Level, Batch, Fee */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <Divider orientation="left" style={{ color: primaryColor, fontFamily: fontHeading }}>Parent (optional)</Divider>
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

          <Divider orientation="left" style={{ color: primaryColor, fontFamily: fontHeading }}>Course & Fee</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="course_id"
                label={<span style={labelStyle}>Course</span>}
                rules={[{ required: true, message: 'Select a course' }]}
              >
                <Select
                  placeholder="Select a course"
                  showSearch
                  style={{ fontFamily: fontBody }}
                  optionFilterProp="children"
                  loading={cLoading}
                  notFoundContent={courses?.length ? 'No courses found' : 'No courses available'}
                >
                  {courses?.map(c => (
                    <Option key={c.id} value={c.id}>{c.course_name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="level_id"
                label={<span style={labelStyle}>Level</span>}
                rules={[{ required: true, message: 'Select a level' }]}
              >
                <Select
                  placeholder={selectedCourseId ? "Select a level" : "Select a course first"}
                  showSearch
                  style={{ fontFamily: fontBody }}
                  loading={lLoading}
                  disabled={!selectedCourseId}
                  notFoundContent={selectedCourseId ? 'No levels for this course' : '—'}
                >
                  {levels?.map(l => (
                    <Option key={l.id} value={l.id}>{l.level_name} (Lv.{l.level_number})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="service_id"
                label={<span style={labelStyle}>Select Service</span>}
                rules={[{ required: true, message: 'Select a service' }]}
              >
                <Select
                  placeholder="Select a service"
                  showSearch
                  style={{ fontFamily: fontBody }}
                  optionFilterProp="children"
                  notFoundContent="No services available"
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
                  loading={bLoading}
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
            <Card size="small" style={{ marginBottom: 16, background: '#f9f9f9', borderColor: primaryColor }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontFamily: fontBody, color: primaryColor }}>Base Fee</span>}
                    value={selectedService.unit_price}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ fontFamily: fontHeading, color: primaryColor }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontFamily: fontBody, color: primaryColor }}>Tax Rate</span>}
                    value={selectedService.tax_rates?.[0]?.rate || 0}
                    suffix="%"
                    valueStyle={{ fontFamily: fontHeading, color: primaryColor }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontFamily: fontBody, color: primaryColor }}>Total Fee</span>}
                    value={selectedService.unit_price * (1 + (selectedService.tax_rates?.[0]?.rate || 0) / 100)}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ fontFamily: fontHeading, color: primaryColor }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Divider />
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
  )
}

export default StudentForm