import { Card, Form, Input, Select, DatePicker, Button, Row, Col, message, Spin, Typography, Divider } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useUpdateInquiry, useInquiry } from '../../hooks/useInquiries'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input
const { Title } = Typography

const InquiryEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: inquiry, isLoading: inquiryLoading } = useInquiry(id)
  const updateMutation = useUpdateInquiry()
  const [form] = Form.useForm()
  const { theme } = useTheme()

  // Theme values with fallbacks
  const primaryColor = theme?.primary_color || '#0D47A1'
  const accentColor = theme?.accent_color || '#FF1070'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  // Fetch courses – use 'name', rename to 'course_name' for dropdown
  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')   // ✅ column is 'name'
        .eq('status', true)
        .is('deleted_at', null)
      if (error) throw error
      return data?.map(c => ({ ...c, course_name: c.name })) || []
    },
  })

  // Fetch sources (unchanged)
  const { data: sources } = useQuery({
    queryKey: ['inquiry_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiry_sources')
        .select('*')
        .eq('is_active', true)
      if (error) throw error
      return data
    },
  })

  if (inquiryLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!inquiry) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <p style={{ fontFamily: fontBody, color: primaryColor }}>Inquiry not found</p>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/inquiries')}
          style={{ fontFamily: fontBody }}
        >
          Back to Inquiries
        </Button>
      </Card>
    )
  }

  // Split student_name into first/last for the form
  const nameParts = (inquiry.student_name || '').split(' ')
  const initialFirstName = nameParts[0] || ''
  const initialLastName = nameParts.slice(1).join(' ') || ''

  const initialValues = {
    salutation: inquiry.salutation || undefined,
    first_name: initialFirstName,
    last_name: initialLastName,
    suffix: inquiry.suffix || undefined,
    gender: inquiry.student_gender || undefined,
    dob: inquiry.student_dob ? dayjs(inquiry.student_dob) : null,
    mobile: inquiry.mobile,
    whatsapp: inquiry.whatsapp || '',
    alternate_phone: inquiry.alternate_phone || '',
    email: inquiry.email || '',
    address: inquiry.address || '',
    city: inquiry.city || '',
    state: inquiry.state || '',
    pincode: inquiry.pincode || '',
    school_name: inquiry.school_name || '',
    board: inquiry.board || undefined,
    standard: inquiry.standard || '',
    interested_course_id: inquiry.interested_course_id || undefined,
    source_id: inquiry.source_id || undefined,
    parent_name: inquiry.parent_name || '',
    followup_date: inquiry.followup_date ? dayjs(inquiry.followup_date) : null,
    remarks: inquiry.remarks || '',
  }

  const onFinish = async (values) => {
    try {
      const firstName = values.first_name?.trim() || ''
      const lastName = values.last_name?.trim() || ''
      const studentName = `${firstName} ${lastName}`.trim()

      const selectedSource = sources?.find(s => s.id === values.source_id)
      const sourceName = selectedSource?.name || null

      const payload = {
        student_name: studentName,
        salutation: values.salutation || null,
        suffix: values.suffix || null,
        student_gender: values.gender || null,
        student_dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        mobile: values.mobile,
        whatsapp: values.whatsapp || null,
        alternate_phone: values.alternate_phone || null,
        email: values.email || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        pincode: values.pincode || null,
        school_name: values.school_name || null,
        board: values.board || null,
        standard: values.standard || null,
        interested_course_id: values.interested_course_id || null,
        source_id: values.source_id || null,
        source: sourceName,
        parent_name: values.parent_name || null,
        followup_date: values.followup_date ? values.followup_date.format('YYYY-MM-DD') : null,
        remarks: values.remarks || null,
      }
      await updateMutation.mutateAsync({ id: Number(id), ...payload })
      message.success('Inquiry updated')
      navigate(`/inquiries/${id}`)
    } catch (err) {
      message.error(err.message)
    }
  }

  const labelStyle = {
    color: primaryColor,
    fontWeight: 500,
    fontFamily: fontBody,
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        title={
          <Title level={4} style={{ color: primaryColor, fontFamily: fontHeading, margin: 0 }}>
            Edit Inquiry #{inquiry.inquiry_no}
          </Title>
        }
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/inquiries/${id}`)}
            style={{ borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
          >
            Back to Details
          </Button>
        }
        style={{
          maxWidth: 800,
          margin: '0 auto',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderTop: `4px solid ${primaryColor}`,
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={initialValues}
        >
          {/* Name section */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Form.Item name="salutation" label={<span style={labelStyle}>Prefix</span>}>
                <Select
                  placeholder="None"
                  allowClear
                  size="middle"
                  style={{ fontFamily: fontBody }}
                  dropdownStyle={{ fontFamily: fontBody }}
                >
                  <Option value="Mr.">Mr.</Option>
                  <Option value="Ms.">Ms.</Option>
                  <Option value="Mrs.">Mrs.</Option>
                  <Option value="Dr.">Dr.</Option>
                  <Option value="Prof.">Prof.</Option>
                  <Option value="Rev.">Rev.</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item
                name="first_name"
                label={<span style={labelStyle}>First Name</span>}
                rules={[{ required: true }]}
              >
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item name="last_name" label={<span style={labelStyle}>Last Name</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Form.Item name="suffix" label={<span style={labelStyle}>Suffix</span>}>
                <Select
                  placeholder="None"
                  allowClear
                  size="middle"
                  style={{ fontFamily: fontBody }}
                  dropdownStyle={{ fontFamily: fontBody }}
                >
                  <Option value="Jr.">Jr.</Option>
                  <Option value="Sr.">Sr.</Option>
                  <Option value="II">II</Option>
                  <Option value="III">III</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item name="gender" label={<span style={labelStyle}>Gender</span>}>
                <Select
                  placeholder="Select"
                  allowClear
                  size="middle"
                  style={{ fontFamily: fontBody }}
                  dropdownStyle={{ fontFamily: fontBody }}
                >
                  <Option value="M">Male</Option>
                  <Option value="F">Female</Option>
                  <Option value="O">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item name="dob" label={<span style={labelStyle}>Date of Birth</span>}>
                <DatePicker style={{ width: '100%', fontFamily: fontBody }} size="middle" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>
            Contact Details
          </Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="mobile"
                label={<span style={labelStyle}>Mobile</span>}
                rules={[{ required: true }]}
              >
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="whatsapp" label={<span style={labelStyle}>WhatsApp</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="alternate_phone" label={<span style={labelStyle}>Alternate Phone</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label={<span style={labelStyle}>Email</span>}>
                <Input type="email" size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>
            Address
          </Divider>
          <Form.Item name="address" label={<span style={labelStyle}>Address</span>}>
            <TextArea rows={2} size="middle" style={{ fontFamily: fontBody }} />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item name="city" label={<span style={labelStyle}>City</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="state" label={<span style={labelStyle}>State</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="pincode" label={<span style={labelStyle}>Pincode</span>}>
                <Input maxLength={6} size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>
            School Info (optional)
          </Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item name="school_name" label={<span style={labelStyle}>School Name</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="board" label={<span style={labelStyle}>Board</span>}>
                <Select
                  placeholder="Select"
                  allowClear
                  size="middle"
                  style={{ fontFamily: fontBody }}
                  dropdownStyle={{ fontFamily: fontBody }}
                >
                  <Option value="GSEB">GSEB</Option>
                  <Option value="CBSE">CBSE</Option>
                  <Option value="ICSE">ICSE</Option>
                  <Option value="IB">IB</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="standard" label={<span style={labelStyle}>Standard</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>
            Course & Source
          </Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="interested_course_id" label={<span style={labelStyle}>Interested Course</span>}>
                <Select
                  placeholder="Select course"
                  allowClear
                  size="middle"
                  style={{ fontFamily: fontBody }}
                  dropdownStyle={{ fontFamily: fontBody }}
                >
                  {courses?.map(c => <Option key={c.id} value={c.id}>{c.course_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="source_id" label={<span style={labelStyle}>Source</span>}>
                <Select
                  placeholder="Select source"
                  allowClear
                  size="middle"
                  style={{ fontFamily: fontBody }}
                  dropdownStyle={{ fontFamily: fontBody }}
                >
                  {sources?.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>
            Additional Info
          </Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="parent_name" label={<span style={labelStyle}>Parent Name</span>}>
                <Input size="middle" style={{ fontFamily: fontBody }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="followup_date" label={<span style={labelStyle}>Follow-up Date</span>}>
                <DatePicker style={{ width: '100%', fontFamily: fontBody }} size="middle" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remarks" label={<span style={labelStyle}>Remarks</span>}>
            <TextArea rows={3} size="middle" style={{ fontFamily: fontBody }} />
          </Form.Item>

          <Divider style={{ margin: '16px 0' }} />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateMutation.isLoading}
              icon={<SaveOutlined />}
              size="large"
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                fontFamily: fontBody,
                minWidth: 120,
              }}
            >
              Update Inquiry
            </Button>
            <Button
              size="large"
              style={{
                marginLeft: 12,
                borderColor: primaryColor,
                color: primaryColor,
                fontFamily: fontBody,
              }}
              onClick={() => navigate(`/inquiries/${id}`)}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default InquiryEdit