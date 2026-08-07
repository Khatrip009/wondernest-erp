// ConvertToStudentModal.jsx (fixed – removed deprecated GST columns)
import { useState } from 'react'
import {
  Modal, Form, Input, Select, DatePicker, Button, message,
  Row, Col, Divider, Steps, Statistic, Card, Typography
} from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useScope } from '../../contexts/ScopeContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Step } = Steps
const { TextArea } = Input
const { Text } = Typography

const ConvertToStudentModal = ({ open, inquiry, onClose }) => {
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const { org } = useOrganization()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { profile } = useAuth()
  const { theme, darkMode } = useTheme()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const bgColor = darkMode ? '#1f1f1f' : '#ffffff'
  const cardBg = darkMode ? '#2c2c2c' : '#f9f9f9'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'

  const branchId = selectedBranch?.id || inquiry?.branch_id
  const financialYearId = selectedFinancialYear?.id || inquiry?.financial_year_id

  // Fetch courses (org-wide)
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-active', org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, description')
        .eq('status', true)
        .eq('organization_id', org?.id)
        .order('name')
      if (error) throw error
      return data
    },
    enabled: open && !!org?.id,
  })

  const selectedCourseId = Form.useWatch('course_id', form)

  // Fetch levels from course_levels
  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['course-levels', selectedCourseId, org?.id],
    queryFn: async () => {
      if (!selectedCourseId) return []
      const { data, error } = await supabase
        .from('course_levels')
        .select('id, name, level_number')
        .eq('course_id', selectedCourseId)
        .eq('organization_id', org?.id)
        .order('level_number', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!selectedCourseId,
  })

  // Fetch services (org-wide)
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['inventory-services-convert', selectedCourseId, org?.id],
    queryFn: async () => {
      if (!selectedCourseId) return []
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, unit_price, tax_rate_id, tax_rates(rate)')
        .eq('item_type', 'service')
        .eq('is_active', true)
        .eq('course_id', selectedCourseId)
        .eq('organization_id', org?.id)
      if (error) throw error
      return data
    },
    enabled: !!selectedCourseId,
  })

  // Fetch batches for the selected course and branch
  const { data: batches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['batches-for-convert', selectedCourseId, branchId],
    queryFn: async () => {
      if (!selectedCourseId) return []
      let query = supabase
        .from('batches')
        .select('id, batch_name')
        .eq('course_id', selectedCourseId)
        .eq('status', 'active')
        .order('batch_name')
      if (branchId) query = query.eq('branch_id', branchId)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!selectedCourseId,
  })

  const selectedServiceId = Form.useWatch('service_id', form)
  const selectedService = services.find(s => s.id === selectedServiceId)

  const steps = [
    { title: 'Personal Details' },   // ✅ removed "& GST Details"
    { title: 'Parent & Enrollment' },
  ]

  const onFinish = async () => {
    setLoading(true)
    try {
      const values = await form.validateFields()

      // 1. Create Auth user (optional – skip if function fails)
      let authUserId = null
      if (values.email) {
        try {
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
            console.warn('Edge function error (user creation skipped):', fnError)
          } else if (result?.success && result?.userId) {
            authUserId = result.userId
          }
        } catch (edgeErr) {
          console.warn('Edge function unavailable (user creation skipped):', edgeErr.message)
        }
      }

      // 2. Build student data payload (no removed columns)
      const studentData = {
        salutation: values.salutation || null,
        first_name: values.first_name,
        last_name: values.last_name || '',
        suffix: values.suffix || null,
        gender: values.gender || null,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        mobile: values.mobile,
        whatsapp: inquiry?.whatsapp || null,
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
        // ✅ removed gstin, legal_business_name, trade_name, state_code,
        // place_of_supply, registration_type, billing_address
      }

      // 3. Parent data
      const parentData = {
        father_name: values.father_name || null,
        mother_name: values.mother_name || null,
        mobile: values.parent_mobile || null,
        email: values.parent_email || null,
        occupation: values.parent_occupation || null,
        address: values.parent_address || null,
      }
      const hasParent = Object.values(parentData).some(v => v)

      // 4. Enrollment data
      const enrollmentData = values.batch_id
        ? { batch_id: values.batch_id, enrollment_date: new Date().toISOString().split('T')[0] }
        : null

      // 5. Fee data (with org/branch/fy)
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
          organization_id: org?.id,
          branch_id: branchId,
          financial_year_id: financialYearId,
        }
      }

      // 6. Call RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_student_with_user', {
        student_data: studentData,
        parent_data: hasParent ? parentData : null,
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
      console.error('Admission error:', err)
      message.error(err.message || 'Admission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Admission Form</span>}
      open={open}
      onCancel={() => { onClose(); form.resetFields(); setCurrentStep(0) }}
      footer={null}
      width={800}
      destroyOnClose
      styles={{
        body: { backgroundColor: bgColor, fontFamily: fontBody, color: textColor },
        header: { backgroundColor: bgColor },
        content: { backgroundColor: bgColor },
      }}
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
          city: inquiry?.city || '',
          state: inquiry?.state || '',
          pincode: inquiry?.pincode || '',
          school_name: inquiry?.school_name || '',
          board: inquiry?.board || '',
          standard: inquiry?.standard || '',
          joining_date: dayjs(),
          // ✅ removed all GST fields from initial values
        }}
        style={{ backgroundColor: bgColor }}
      >
        {/* STEP 0: Personal Details */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="salutation" label={<span style={{ color: textColor }}>Prefix</span>}>
                <Select placeholder="None" allowClear>
                  <Option value="Mr.">Mr.</Option>
                  <Option value="Ms.">Ms.</Option>
                  <Option value="Miss">Miss</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="first_name" label={<span style={{ color: textColor }}>First Name</span>} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="last_name" label={<span style={{ color: textColor }}>Last Name</span>}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="suffix" label={<span style={{ color: textColor }}>Suffix</span>}>
                <Select placeholder="None" allowClear>
                  <Option value="Jr.">Jr.</Option>
                  <Option value="Sr.">Sr.</Option>
                  <Option value="Master">Master</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="gender" label={<span style={{ color: textColor }}>Gender</span>}>
                <Select placeholder="Select" allowClear>
                  <Option value="M">Male</Option>
                  <Option value="F">Female</Option>
                  <Option value="O">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="dob" label={<span style={{ color: textColor }}>Date of Birth</span>}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ color: textColor, borderColor }}>Contact & Address</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mobile" label={<span style={{ color: textColor }}>Mobile</span>} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label={<span style={{ color: textColor }}>Email</span>}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label={<span style={{ color: textColor }}>Address</span>}>
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label={<span style={{ color: textColor }}>City</span>}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="state" label={<span style={{ color: textColor }}>State</span>}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pincode" label={<span style={{ color: textColor }}>Pincode</span>}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Divider style={{ color: textColor, borderColor }}>School Info</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="school_name" label={<span style={{ color: textColor }}>School</span>}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="board" label={<span style={{ color: textColor }}>Board</span>}>
                <Select placeholder="Select" allowClear>
                  <Option value="GSEB">GSEB</Option>
                  <Option value="CBSE">CBSE</Option>
                  <Option value="ICSE">ICSE</Option>
                  <Option value="IB">IB</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="standard" label={<span style={{ color: textColor }}>Standard</span>}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="joining_date" label={<span style={{ color: textColor }}>Joining Date</span>}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {/* ✅ Admission Form Number (new field) */}
          <Form.Item name="admission_form_number" label={<span style={{ color: textColor }}>Admission Form No.</span>}>
            <Input placeholder="Leave blank to auto‑generate" style={{ width: '100%' }} />
          </Form.Item>

          {/* GST section removed entirely */}

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button
              type="primary"
              onClick={() => setCurrentStep(1)}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Next
            </Button>
          </div>
        </div>

        {/* STEP 1: Parent & Enrollment (unchanged) */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Divider style={{ color: textColor, borderColor }}>Parent / Guardian</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="father_name" label={<span style={{ color: textColor }}>Father's Name</span>}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mother_name" label={<span style={{ color: textColor }}>Mother's Name</span>}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="parent_mobile" label={<span style={{ color: textColor }}>Parent Mobile</span>}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parent_email" label={<span style={{ color: textColor }}>Parent Email</span>}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="parent_occupation" label={<span style={{ color: textColor }}>Occupation</span>}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="parent_address" label={<span style={{ color: textColor }}>Address</span>}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: textColor, borderColor }}>Course & Level</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="course_id" label={<span style={{ color: textColor }}>Course</span>} rules={[{ required: true }]}>
                <Select
                  placeholder="Select course"
                  showSearch
                  optionFilterProp="children"
                  loading={coursesLoading}
                  notFoundContent="No courses found"
                >
                  {courses.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level_id" label={<span style={{ color: textColor }}>Level</span>} rules={[{ required: true }]}>
                <Select
                  placeholder={selectedCourseId ? "Select level" : "Select a course first"}
                  showSearch
                  loading={levelsLoading}
                  disabled={!selectedCourseId}
                  notFoundContent={selectedCourseId ? 'No levels for this course' : '—'}
                >
                  {levels.map(l => (
                    <Option key={l.id} value={l.id}>{l.name} (Lv.{l.level_number})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: textColor, borderColor }}>Service & Fee</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="service_id" label={<span style={{ color: textColor }}>Select Service</span>} rules={[{ required: true }]}>
                <Select
                  placeholder="Select a service"
                  showSearch
                  optionFilterProp="children"
                  loading={servicesLoading}
                  disabled={!selectedCourseId}
                  notFoundContent="No services for this course"
                >
                  {services.map(s => (
                    <Option key={s.id} value={s.id}>{s.item_name} – ₹{s.unit_price}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batch_id" label={<span style={{ color: textColor }}>Batch (optional)</span>}>
                <Select
                  placeholder="Select batch"
                  allowClear
                  loading={batchesLoading}
                  disabled={!selectedCourseId}
                  notFoundContent="No batches available"
                >
                  {batches.map(b => (
                    <Option key={b.id} value={b.id}>{b.batch_name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="discount" label={<span style={{ color: textColor }}>Discount (₹)</span>}>
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label={<span style={{ color: textColor }}>Fee Due Date</span>}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {selectedService && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: cardBg, borderColor: primaryColor, color: textColor }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: textColor }}>Base Fee</span>}
                    value={selectedService.unit_price}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ color: textColor }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: textColor }}>Tax Rate</span>}
                    value={selectedService.tax_rates?.[0]?.rate || 0}
                    suffix="%"
                    valueStyle={{ color: textColor }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: textColor }}>Total Fee</span>}
                    value={selectedService.unit_price * (1 + (selectedService.tax_rates?.[0]?.rate || 0) / 100)}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ color: textColor }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button onClick={() => setCurrentStep(0)} style={{ color: textColor, borderColor }}>
              Previous
            </Button>
            <Button
              type="primary"
              onClick={onFinish}
              loading={loading}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              Complete Admission
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  )
}

export default ConvertToStudentModal