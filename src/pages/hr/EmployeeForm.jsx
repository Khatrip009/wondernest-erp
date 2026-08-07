// src/pages/hr/EmployeeForm.jsx – auto employee code + user creation
import { useState, useEffect } from 'react'
import { Card, Form, Input, Select, DatePicker, Button, Row, Col, message, Spin, Divider, Steps, Typography } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useEmployee, useCreateEmployee, useUpdateEmployee } from '../../hooks/useHR'
import dayjs from 'dayjs'

const { Option } = Select
const { Step } = Steps
const { Title } = Typography

const EmployeeForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()
  const isEdit = !!id

  const { data: employee, isLoading: empLoading } = useEmployee(id)
  const createMutation = useCreateEmployee()
  const updateMutation = useUpdateEmployee()

  // Theme tokens
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const labelStyle = { color: primaryColor, fontWeight: 500, fontFamily: fontBody }

  const [currentStep, setCurrentStep] = useState(0)
  const steps = [{ title: 'Personal' }, { title: 'Salary & Role' }]

  // ---------- Auto-generate employee code ----------
  useEffect(() => {
    const generateCode = async () => {
      if (isEdit || !org?.id) return

      // Get the highest existing employee code for this org
      const { data, error } = await supabase
        .from('teachers')
        .select('employee_code')
        .eq('organization_id', org.id)
        .order('employee_code', { ascending: false })
        .limit(1)

      if (error) {
        console.warn('Could not fetch employee codes:', error)
        return
      }

      let nextNumber = 1
      if (data && data.length > 0) {
        const lastCode = data[0].employee_code
        // Extract the numeric part after the last '-'
        const parts = lastCode.split('-')
        if (parts.length >= 2) {
          const num = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(num)) nextNumber = num + 1
        }
      }

      const newCode = `WLH-EMP-${String(nextNumber).padStart(4, '0')}`
      form.setFieldsValue({ employee_code: newCode })
    }

    generateCode()
  }, [isEdit, org?.id, form])

  // Populate form in edit mode
  useEffect(() => {
    if (employee) {
      form.setFieldsValue({
        ...employee,
        joining_date: employee.joining_date ? dayjs(employee.joining_date) : null,
      })
    }
  }, [employee, form])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const branchId = selectedBranch?.id
      const financialYearId = selectedFinancialYear?.id

      // --- 1. Create / link auth user (REQUIRED) ---
      let authUserId = null
      if (!isEdit && values.email) {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          'create-teacher-user',
          {
            body: {
              email: values.email,
              password: 'teacher123',
              fullName: `${values.first_name} ${values.last_name}`.trim(),
              organization_id: org?.id,
              branch_id: branchId,
              financial_year_id: financialYearId,
            },
          }
        )

        if (fnError) {
          throw new Error(fnError.message || 'Failed to create teacher login')
        }

        if (!result?.success) {
          throw new Error(result?.error || 'Failed to create teacher login')
        }

        authUserId = result.userId
      }

      // --- 2. Build teacher record payload ---
      const payload = {
        employee_code: values.employee_code,      // ✅ auto-generated or manual
        first_name: values.first_name,
        last_name: values.last_name || '',
        mobile: values.mobile,
        email: values.email || null,
        qualification: values.qualification,
        joining_date: values.joining_date ? values.joining_date.format('YYYY-MM-DD') : null,
        salary_type: values.salary_type,
        monthly_salary: values.monthly_salary || 0,
        per_lecture_rate: values.per_lecture_rate || 0,
        tds_percentage: values.tds_percentage || 0,
        department: values.department,
        designation: values.designation,
        status: values.status || 'active',
        branch_id: branchId,
        financial_year_id: financialYearId,
        staff_type: values.staff_type || 'teacher',
        user_id: authUserId || employee?.user_id || null,
        organization_id: org?.id,
      }

      // --- 3. Save the teacher record ---
      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(id), ...payload })
        message.success('Employee updated')
      } else {
        await createMutation.mutateAsync(payload)
        message.success('Employee created')
      }
      navigate('/hr/employees')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isEdit && empLoading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }} />

  return (
    <div style={{ backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8, fontFamily: fontBody }}>
      <Card
        title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>{isEdit ? 'Edit Employee' : 'New Employee'}</span>}
        extra={<Button onClick={() => navigate('/hr/employees')} style={{ color: primaryColor, borderColor: primaryColor }}>Cancel</Button>}
        bordered={false}   // ✅ fixed from variant="borderless"
        style={{
          maxWidth: 800, margin: '0 auto', backgroundColor: cardBg, borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${primaryColor}`
        }}
      >
        <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
          {steps.map(step => <Step key={step.title} title={step.title} />)}
        </Steps>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'active', salary_type: 'fixed', staff_type: 'teacher' }}>
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="employee_code" label={<span style={labelStyle}>Employee Code</span>}>
                  <Input placeholder="WLH-EMP-0001" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="first_name" label={<span style={labelStyle}>First Name</span>} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="last_name" label={<span style={labelStyle}>Last Name</span>}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="mobile" label={<span style={labelStyle}>Mobile</span>} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="email" label={<span style={labelStyle}>Email</span>}>
                  <Input type="email" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="qualification" label={<span style={labelStyle}>Qualification</span>}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="joining_date" label={<span style={labelStyle}>Joining Date</span>}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Divider style={{ color: primaryColor, borderColor }} />
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={() => setCurrentStep(1)} style={{ backgroundColor: primaryColor }}>Next</Button>
            </div>
          </div>

          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="salary_type" label={<span style={labelStyle}>Salary Type</span>}>
                  <Select><Option value="fixed">Fixed</Option><Option value="lecture_based">Lecture Based</Option></Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="monthly_salary" label={<span style={labelStyle}>Monthly Salary</span>}>
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="per_lecture_rate" label={<span style={labelStyle}>Per Lecture Rate</span>}>
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tds_percentage" label={<span style={labelStyle}>TDS %</span>}>
                  <Input type="number" min={0} max={30} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="department" label={<span style={labelStyle}>Department</span>}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="designation" label={<span style={labelStyle}>Designation</span>}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="staff_type" label={<span style={labelStyle}>Staff Type</span>}>
              <Select>
                <Option value="teacher">Teacher</Option>
                <Option value="admin">Admin</Option>
                <Option value="accountant">Accountant</Option>
                <Option value="support">Support</Option>
              </Select>
            </Form.Item>
            <Form.Item name="status" label={<span style={labelStyle}>Status</span>}>
              <Select><Option value="active">Active</Option><Option value="inactive">Inactive</Option></Select>
            </Form.Item>
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(0)}>Previous</Button>
              <Button type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: primaryColor }}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default EmployeeForm