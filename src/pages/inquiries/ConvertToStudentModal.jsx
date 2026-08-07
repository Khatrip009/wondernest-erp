import { useState } from 'react'
import {
  Modal, Form, Input, Select, DatePicker, Button, message,
  Row, Col, Divider, Steps, Statistic, Card
} from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Step } = Steps
const { TextArea } = Input

const ConvertToStudentModal = ({ open, inquiry, onClose }) => {
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const { org } = useOrganization()
  const { theme } = useTheme()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  // Fetch courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, course_name').eq('status', true)
      return data
    },
    enabled: open,
  })

  const selectedCourseId = Form.useWatch('course_id', form)

  // Fetch levels for selected course
  const { data: levels, isLoading: levelsLoading } = useQuery({
    queryKey: ['course_levels', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return []
      const { data } = await supabase
        .from('course_levels')
        .select('id, level_name, level_number')
        .eq('course_id', selectedCourseId)
        .order('level_number', { ascending: true })
      return data
    },
    enabled: !!selectedCourseId,
  })

  // Fetch services linked to the selected course
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['inventory-services-convert', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return []
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, description, unit_price, tax_rates(rate)')
        .eq('item_type', 'service')
        .eq('is_active', true)
        .eq('course_id', selectedCourseId)
      if (error) throw error
      return data
    },
    enabled: !!selectedCourseId,
  })

  const selectedServiceId = Form.useWatch('service_id', form)
  const selectedService = services?.find(s => s.id === selectedServiceId)

  const steps = [
    { title: 'Personal & GST Details' },
    { title: 'Parent & Enrollment' },
  ]

  const onFinish = async () => {
    setLoading(true)
    try {
      const values = await form.validateFields()
      console.log('Conversion form values:', values)   // useful for debugging

      const branchId = inquiry.branch_id || org?.branch_id || 1
      const financialYearId = inquiry.financial_year_id

      // 1. Auth user
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
            console.warn('Auth user already exists, proceeding without linking')
          } else {
            throw signUpError
          }
        } else if (signUpData?.user) {
          authUserId = signUpData.user.id
        }
      }

      // 2. Student data for RPC
      const studentData = {
        salutation: values.salutation || null,
        first_name: values.first_name,
        last_name: values.last_name || '',
        suffix: values.suffix || null,
        gender: values.gender || null,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        mobile: values.mobile,
        whatsapp: inquiry.whatsapp || null,
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
        admission_form_number: null,
        user_id: authUserId,
        course_id: values.course_id || null,
        level_id: values.level_id || null,
        // GST fields
        gstin: values.gstin || null,
        legal_business_name: values.legal_business_name || null,
        trade_name: values.trade_name || null,
        state_code: values.state_code || null,
        place_of_supply: values.place_of_supply || null,
        registration_type: values.registration_type || null,
        billing_address: values.billing_address || null,
      }

      // 3. Parent data
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

      // 4. Enrollment data (batch optional)
      const enrollmentData = values.batch_id
        ? { batch_id: values.batch_id, enrollment_date: new Date().toISOString().split('T')[0] }
        : null

      // 5. Fee data
      let feeData = null
      if (selectedService && values.service_id) {
        const taxRate = selectedService.tax_rates?.[0]?.rate || 0
        const totalFee = selectedService.unit_price * (1 + taxRate / 100)
        const discount = parseFloat(values.discount) || 0
        feeData = {
          service_id: selectedService.id,
          total_fee: totalFee,
          discount,
          final_fee: Math.max(totalFee - discount, 0),
          due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        }
      }

      // 6. Call RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_student_with_user', {
        student_data: studentData,
        parent_data: parentData,
        enrollment_data: enrollmentData,
        fee_data: feeData,
      })
      if (rpcError) throw rpcError

      // 7. Update inquiry
      await supabase
        .from('inquiries')
        .update({
          converted_student_id: rpcResult.student_id,
          converted_at: new Date().toISOString(),
          status: 'Converted',
        })
        .eq('id', inquiry.id)

      message.success(`Student admitted (Admission No: ${rpcResult.admission_no})`)
      queryClient.invalidateQueries({ queryKey: ['inquiry', inquiry.id] })
      queryClient.invalidateQueries({ queryKey: ['inquiries'] })
      onClose()
      form.resetFields()
      setCurrentStep(0)
    } catch (err) {
      console.error(err)
      message.error(err.message || 'Admission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission Form</span>}
      open={open}
      onCancel={() => {
        onClose()
        form.resetFields()
        setCurrentStep(0)
      }}
      footer={null}
      width={800}
      destroyOnClose
      styles={{ body: { fontFamily: fontBody } }}
    >
      <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
        {steps.map(step => <Step key={step.title} title={step.title} />)}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          salutation: inquiry?.salutation || undefined,
          first_name: inquiry?.student_name?.split(' ')[0] || '',
          last_name: inquiry?.student_name?.split(' ').slice(1).join(' ') || '',
          suffix: inquiry?.suffix || undefined,
          gender: inquiry?.student_gender || undefined,
          dob: inquiry?.student_dob ? dayjs(inquiry.student_dob) : undefined,
          mobile: inquiry?.mobile,
          email: inquiry?.email,
          address: inquiry?.address || '',
          gstin: inquiry?.gstin || '',
          legal_business_name: inquiry?.legal_business_name || '',
          trade_name: inquiry?.trade_name || '',
          state_code: inquiry?.state_code || '',
          place_of_supply: inquiry?.place_of_supply || '',
          registration_type: inquiry?.registration_type || '',
          billing_address: inquiry?.billing_address || '',
        }}
      >
        {/* ===== STEP 0: Personal & GST – always in DOM, hidden when not active ===== */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="salutation" label="Prefix">
                <Select placeholder="None" allowClear>
                  <Option value="Mr.">Mr.</Option>
                  <Option value="Ms.">Ms.</Option>
                  <Option value="Mrs.">Mrs.</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="last_name" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="suffix" label="Suffix">
                <Select placeholder="None" allowClear>
                  <Option value="Jr.">Jr.</Option>
                  <Option value="Sr.">Sr.</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gender" label="Gender" rules={[{ required: true, message: 'Required' }]}>
                <Select>
                  <Option value="M">Male</Option>
                  <Option value="F">Female</Option>
                  <Option value="O">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="dob" label="Date of Birth" rules={[{ required: true, message: 'Required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="joining_date" label="Admission Date" rules={[{ required: true, message: 'Required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Contact</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mobile" label="Mobile" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Address</Divider>
          <Form.Item name="address" label="Address" rules={[{ required: true, message: 'Required' }]}>
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="City" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label="State" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pincode" label="Pincode" rules={[{ required: true }]}>
                <Input maxLength={6} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>School Info</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="school_name" label="School Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="board" label="Board" rules={[{ required: true }]}>
                <Select>
                  <Option value="GSEB">GSEB</Option>
                  <Option value="CBSE">CBSE</Option>
                  <Option value="ICSE">ICSE</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="standard" label="Standard" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Divider>GST Details (Optional)</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gstin" label="GSTIN">
                <Input maxLength={15} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Button onClick={() => message.info('Auto-fill not implemented')} style={{ marginTop: 30 }}>
                Verify & Auto-fill
              </Button>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="legal_business_name" label="Legal Business Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trade_name" label="Trade Name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="state_code" label="State Code">
                <Input maxLength={2} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="place_of_supply" label="Place of Supply">
                <Input maxLength={2} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="registration_type" label="Reg. Type">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="billing_address" label="Billing Address">
            <TextArea rows={2} />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" onClick={() => setCurrentStep(1)} style={{ backgroundColor: primaryColor }}>
              Next
            </Button>
          </div>
        </div>

        {/* ===== STEP 1: Parent & Enrollment – always in DOM, hidden when not active ===== */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Divider>Parent (optional)</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="father_name" label="Father Name"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mother_name" label="Mother Name"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="parent_mobile" label="Parent Mobile"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="parent_email" label="Parent Email"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="parent_occupation" label="Occupation"><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="parent_address" label="Parent Address"><Input /></Form.Item>

          <Divider>Course & Level</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="course_id" label="Course" rules={[{ required: true, message: 'Select a course' }]}>
                <Select
                  placeholder="Select course"
                  showSearch
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
              <Form.Item name="level_id" label="Level" rules={[{ required: true, message: 'Select a level' }]}>
                <Select
                  placeholder={selectedCourseId ? "Select level" : "Select a course first"}
                  showSearch
                  loading={levelsLoading}
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

          <Divider>Service & Fee</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="service_id"
                label="Select Service"
                rules={[{ required: true, message: 'Select a service' }]}
              >
                <Select
                  placeholder="Select a service"
                  showSearch
                  optionFilterProp="children"
                  loading={servicesLoading}
                  disabled={!selectedCourseId}
                  notFoundContent="No services for this course"
                >
                  {services?.map(s => (
                    <Option key={s.id} value={s.id}>{s.item_name} – ₹{s.unit_price}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batch_id" label="Batch (optional)">
                <Select placeholder="Select batch" allowClear>
                  {/* Add batch fetching if needed */}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount" label="Discount (₹)">
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Fee Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {selectedService && (
            <Card size="small" style={{ marginBottom: 16, background: '#f9f9f9', borderColor: primaryColor }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Base Fee" value={selectedService.unit_price} prefix="₹" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic title="Tax Rate" value={selectedService.tax_rates?.[0]?.rate || 0} suffix="%" />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Total Fee"
                    value={selectedService.unit_price * (1 + (selectedService.tax_rates?.[0]?.rate || 0) / 100)}
                    prefix="₹"
                    precision={2}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>Previous</Button>
            <Button type="primary" onClick={onFinish} loading={loading} style={{ backgroundColor: primaryColor }}>
              Complete Admission
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  )
}

export default ConvertToStudentModal