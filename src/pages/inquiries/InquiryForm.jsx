// src/pages/inquiries/InquiryForm.jsx
import { Card, Form, Input, Select, DatePicker, Button, Row, Col, message, Divider, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useCreateInquiry } from '../../hooks/useInquiries'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useScope } from '../../contexts/ScopeContext'
import { useOrganization } from '../../contexts/OrganizationContext'

const { Option } = Select
const { TextArea } = Input
const { Title } = Typography

const InquiryForm = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const createMutation = useCreateInquiry()
  const { theme, darkMode } = useTheme()
  const { selectedBranch, selectedFinancialYear } = useScope()
  const { org } = useOrganization()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'
  const cardBg = darkMode ? '#1f1f1f' : '#ffffff'
  const textColor = darkMode ? '#d9d9d9' : '#333'
  const borderColor = darkMode ? '#444' : '#e0e0e0'
  const labelColor = primaryColor

  // Fetch courses for the current organization
  const { data: courses = [] } = useQuery({
    queryKey: ['courses', org?.id],
    queryFn: async () => {
      if (!org?.id) return []
      const { data } = await supabase
        .from('courses')
        .select('id, name')
        .eq('status', true)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .order('name')
      return data || []
    },
    enabled: !!org?.id,
  })

  const { data: sources = [] } = useQuery({
    queryKey: ['inquiry_sources'],
    queryFn: async () => {
      const { data } = await supabase.from('inquiry_sources').select('*').eq('is_active', true)
      return data || []
    },
  })

  const onFinish = async (values) => {
    try {
      const firstName = values.first_name?.trim() || ''
      const lastName = values.last_name?.trim() || ''
      const studentName = `${firstName} ${lastName}`.trim()

      const branchId = selectedBranch?.id || null
      const financialYearId = selectedFinancialYear?.id || null

      const selectedSource = sources.find(s => s.id === values.source_id)
      const sourceName = selectedSource?.name || null

      await createMutation.mutateAsync({
        student_name: studentName,
        salutation: values.salutation || null,
        suffix: values.suffix || null,
        student_gender: values.gender || null,
        student_dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        mobile: values.mobile,
        whatsapp: values.whatsapp || null,
        alternate_phone: values.alternate_phone || null,
        email: values.email || null,
        interested_course_id: values.interested_course_id || null,
        source_id: values.source_id || null,
        source: sourceName,
        parent_name: values.parent_name || null,
        followup_date: values.followup_date ? values.followup_date.format('YYYY-MM-DD') : null,
        remarks: values.remarks || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        pincode: values.pincode || null,
        school_name: values.school_name || null,
        board: values.board || null,
        standard: values.standard || null,
        branch_id: branchId,
        financial_year_id: financialYearId,
      })
      message.success('Inquiry created')
      navigate('/inquiries')
    } catch (err) {
      message.error(err.message)
    }
  }

  const labelStyle = {
    color: labelColor,
    fontWeight: 500,
    fontFamily: fontBody,
  }

  const inputStyle = {
    fontFamily: fontBody,
  }

  return (
    <div style={{ fontFamily: fontBody, backgroundColor: darkMode ? '#141414' : '#f5f5f5', padding: 8 }}>
      <Card
        title={
          <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
            New Inquiry
          </Title>
        }
        style={{
          maxWidth: 800,
          margin: '0 auto',
          backgroundColor: cardBg,
          borderRadius: 8,
          boxShadow: darkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ backgroundColor: cardBg }}>
          {/* Personal Info – updated salutation & suffix */}
          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="salutation" label={<span style={labelStyle}>Prefix</span>}>
                <Select placeholder="None" allowClear style={inputStyle} dropdownStyle={{ fontFamily: fontBody }}>
                  <Option value="Mr.">Mr.</Option>
                  <Option value="Ms.">Ms.</Option>
                  <Option value="Miss">Miss</Option>
                  <Option value="Jr">Jr.</Option>
                  <Option value="Sr">Sr.</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item name="first_name" label={<span style={labelStyle}>First Name</span>} rules={[{ required: true }]}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item name="last_name" label={<span style={labelStyle}>Last Name</span>}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="suffix" label={<span style={labelStyle}>Suffix</span>}>
                <Select placeholder="None" allowClear style={inputStyle} dropdownStyle={{ fontFamily: fontBody }}>
                  <Option value="Jr.">Jr.</Option>
                  <Option value="Sr.">Sr.</Option>
                  <Option value="Master">Master</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item name="gender" label={<span style={labelStyle}>Gender</span>}>
                <Select placeholder="Select" allowClear style={inputStyle} dropdownStyle={{ fontFamily: fontBody }}>
                  <Option value="M">Male</Option>
                  <Option value="F">Female</Option>
                  <Option value="O">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item name="dob" label={<span style={labelStyle}>Date of Birth</span>}>
                <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Contact Details */}
          <Divider style={{ color: primaryColor, borderColor, fontFamily: fontHeading }}>Contact Details</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="mobile" label={<span style={labelStyle}>Mobile</span>} rules={[{ required: true }]}>
                <Input maxLength={15} style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="whatsapp" label={<span style={labelStyle}>WhatsApp</span>}>
                <Input maxLength={15} style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="alternate_phone" label={<span style={labelStyle}>Alternate Phone</span>}>
                <Input maxLength={15} style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label={<span style={labelStyle}>Email</span>}>
                <Input type="email" style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>

          {/* Address */}
          <Divider style={{ color: primaryColor, borderColor, fontFamily: fontHeading }}>Address</Divider>
          <Form.Item name="address" label={<span style={labelStyle}>Address</span>}>
            <TextArea rows={2} style={inputStyle} />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="city" label={<span style={labelStyle}>City</span>}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="state" label={<span style={labelStyle}>State</span>}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="pincode" label={<span style={labelStyle}>Pincode</span>}>
                <Input maxLength={6} style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>

          {/* School Info */}
          <Divider style={{ color: primaryColor, borderColor, fontFamily: fontHeading }}>School Info (optional)</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="school_name" label={<span style={labelStyle}>School Name</span>}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="board" label={<span style={labelStyle}>Board</span>}>
                <Select placeholder="Select" allowClear style={inputStyle} dropdownStyle={{ fontFamily: fontBody }}>
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
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>

          {/* Course & Source */}
          <Divider style={{ color: primaryColor, borderColor, fontFamily: fontHeading }}>Course & Source</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="interested_course_id" label={<span style={labelStyle}>Interested Course</span>}>
                <Select placeholder="Select course" allowClear style={inputStyle} dropdownStyle={{ fontFamily: fontBody }}>
                  {courses.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="source_id" label={<span style={labelStyle}>Source</span>}>
                <Select placeholder="Select source" allowClear style={inputStyle} dropdownStyle={{ fontFamily: fontBody }}>
                  {sources.map(s => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Additional Info */}
          <Divider style={{ color: primaryColor, borderColor, fontFamily: fontHeading }}>Additional Info</Divider>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="parent_name" label={<span style={labelStyle}>Parent Name</span>}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="followup_date" label={<span style={labelStyle}>Follow-up Date</span>}>
                <DatePicker style={{ width: '100%', fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label={<span style={labelStyle}>Remarks</span>}>
            <TextArea rows={3} style={inputStyle} />
          </Form.Item>

          <Divider style={{ margin: '16px 0', borderColor }} />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isLoading}
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                fontFamily: fontBody,
                minWidth: 120,
              }}
            >
              Create Inquiry
            </Button>
            <Button
              style={{
                marginLeft: 12,
                borderColor: primaryColor,
                color: primaryColor,
                fontFamily: fontBody,
              }}
              onClick={() => navigate('/inquiries')}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default InquiryForm