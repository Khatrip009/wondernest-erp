import { useState, useEffect, useRef } from 'react'
import {
  Card, Form, Input, Button, Row, Col, message, Spin, Typography, Divider, Switch,
  Image, Space,
} from 'antd'
import { SaveOutlined, PictureOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useUpdateOrganization } from '../../hooks/useOrganizationMutations'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../lib/supabase'

const { Title, Text } = Typography
const { TextArea } = Input

// ---------- Mock GST verification ----------
const verifyGSTIN = async (gstin) => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return {
    business_legal_name: 'SHREEVIDHYA ACADEMY PRIVATE LIMITED',
    trade_name: 'ShreeVidhya Academy',
    state_code: '24',
    place_of_supply: '24',
    registration_type: 'Regular',
    address: '123, Business Park, Palanpur Jakatnaka, Surat, Gujarat 395001',
  }
}

// ---------- Image Picker Component ----------
const ImagePicker = ({ value, onChange, label, primaryColor, fontBody }) => {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('Only image files are allowed')
      return
    }
    setUploading(true)
    try {
      const filePath = `organization/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('ShreeVidhya_Academy')
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage
        .from('ShreeVidhya_Academy')
        .getPublicUrl(filePath)
      onChange?.(publicUrlData.publicUrl)
      message.success(`${label} uploaded`)
    } catch (err) {
      message.error(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Space direction="vertical" align="start" style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: 120,
          border: `1px dashed ${primaryColor}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'pointer',
          background: '#fafafa',
          position: 'relative',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Spin />
        ) : value ? (
          <Image
            src={value}
            alt={label}
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            preview={false}
            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZDFkMWQxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGR5PSIuM2VtIiBmaWxsPSIjZmZmIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg=="
          />
        ) : (
          <div style={{ textAlign: 'center', color: primaryColor }}>
            <PictureOutlined style={{ fontSize: 24 }} />
            <div style={{ fontSize: 12, fontFamily: fontBody }}>{label}</div>
          </div>
        )}
      </div>
      <Button
        icon={<UploadOutlined />}
        size="small"
        loading={uploading}
        onClick={() => fileInputRef.current?.click()}
        style={{ fontFamily: fontBody }}
      >
        {value ? 'Replace' : 'Upload'} {label}
      </Button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Space>
  )
}

// ---------- Main Component ----------
const OrganizationEdit = () => {
  const { org, loading, refetchOrg } = useOrganization()
  const updateMutation = useUpdateOrganization()
  const [form] = Form.useForm()
  const { theme } = useTheme()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontHeading = theme?.font_heading || 'Righteous'
  const fontBody = theme?.font_body || 'Montserrat'

  const [previewData, setPreviewData] = useState({})
  const [gstLoading, setGstLoading] = useState(false)

  useEffect(() => {
    if (org) setPreviewData(org)
  }, [org])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spin size="large" /></div>
  }
  if (!org) return <p style={{ fontFamily: fontBody, color: primaryColor }}>Organization not found</p>

  const initialValues = { ...org }

  const onValuesChange = (changedValues, allValues) => {
    setPreviewData(allValues)
  }

  const onFinish = async (values) => {
    try {
      const { id, created_at, updated_at, ...payload } = values
      let result = await updateMutation.mutateAsync({ id: org.id, ...payload })

      let updatedOrg
      if (Array.isArray(result)) {
        if (result.length === 0) {
          await refetchOrg()
          updatedOrg = { ...org, ...payload }
        } else {
          updatedOrg = result[0]
        }
      } else if (typeof result === 'object' && result !== null) {
        updatedOrg = result
      } else {
        await refetchOrg()
        updatedOrg = { ...org, ...payload }
      }

      form.setFieldsValue(updatedOrg)
      setPreviewData(updatedOrg)
      message.success('Organization updated')
    } catch (err) {
      console.error('Update error:', err)
      if (err.message && err.message.includes('single JSON object')) {
        try {
          await refetchOrg()
          message.success('Organization updated (refreshed data)')
        } catch (refetchErr) {
          message.error('Updated but failed to refresh data. Please reload.')
        }
      } else {
        message.error(err.message || 'Update failed. Check console for details.')
      }
    }
  }

  const handleGstLookup = async () => {
    const gstin = form.getFieldValue('gstin')
    if (!gstin || gstin.length !== 15) {
      message.warning('Please enter a valid 15-digit GSTIN')
      return
    }
    setGstLoading(true)
    try {
      const details = await verifyGSTIN(gstin)
      form.setFieldsValue({
        business_legal_name: details.business_legal_name,
        trade_name: details.trade_name,
        state_code: details.state_code,
        place_of_supply: details.place_of_supply,
        registration_type: details.registration_type,
        address: details.address,
      })
      setPreviewData((prev) => ({ ...prev, ...details }))
      message.success('GST details fetched')
    } catch (err) {
      message.error('Failed to fetch GST details')
    } finally {
      setGstLoading(false)
    }
  }

  const labelStyle = {
    color: primaryColor,
    fontWeight: 500,
    fontFamily: fontBody,
  }

  return (
    <div style={{ fontFamily: fontBody }}>
      <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading }}>
        Organization Settings
      </Title>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${primaryColor}`,
            }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={initialValues}
              onFinish={onFinish}
              onValuesChange={onValuesChange}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="company_name" label={<span style={labelStyle}>Company Name</span>} rules={[{ required: true }]}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="tagline" label={<span style={labelStyle}>Tagline</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>Contact Details</Divider>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name="phone" label={<span style={labelStyle}>Phone</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="email" label={<span style={labelStyle}>Email</span>}>
                    <Input type="email" style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="website" label={<span style={labelStyle}>Website</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="address" label={<span style={labelStyle}>Address</span>}>
                <TextArea rows={3} style={{ fontFamily: fontBody }} />
              </Form.Item>

              <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>Branding (Images)</Divider>
              <Row gutter={[24, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="logo_light_url" label={<span style={labelStyle}>Logo (Light)</span>}>
                    <ImagePicker label="Light Logo" primaryColor={primaryColor} fontBody={fontBody} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="logo_dark_url" label={<span style={labelStyle}>Logo (Dark)</span>}>
                    <ImagePicker label="Dark Logo" primaryColor={primaryColor} fontBody={fontBody} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="letterhead_url" label={<span style={labelStyle}>Letterhead</span>}>
                    <ImagePicker label="Letterhead" primaryColor={primaryColor} fontBody={fontBody} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="header_url" label={<span style={labelStyle}>Header Image</span>}>
                    <ImagePicker label="Header" primaryColor={primaryColor} fontBody={fontBody} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="footer_url" label={<span style={labelStyle}>Footer Image</span>}>
                    <ImagePicker label="Footer" primaryColor={primaryColor} fontBody={fontBody} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="watermark_url" label={<span style={labelStyle}>Watermark</span>}>
                    <ImagePicker label="Watermark" primaryColor={primaryColor} fontBody={fontBody} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>Bank Details</Divider>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="bank_name" label={<span style={labelStyle}>Bank Name</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="branch_name" label={<span style={labelStyle}>Branch</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name="account_number" label={<span style={labelStyle}>Account Number</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="ifsc_code" label={<span style={labelStyle}>IFSC Code</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="upi_id" label={<span style={labelStyle}>UPI ID</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ color: primaryColor, fontFamily: fontHeading }}>GST & Legal</Divider>
              <Row gutter={[16, 16]} align="bottom">
                <Col xs={24} sm={12}>
                  <Form.Item name="gstin" label={<span style={labelStyle}>GSTIN</span>}>
                    <Input placeholder="Enter 15-digit GSTIN" maxLength={15} style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Button
                    icon={<SearchOutlined />}
                    loading={gstLoading}
                    onClick={handleGstLookup}
                    style={{ marginBottom: 24, borderColor: primaryColor, color: primaryColor, fontFamily: fontBody }}
                  >
                    Verify & Auto-fill
                  </Button>
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="gst_registered" label={<span style={labelStyle}>GST Registered</span>} valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="registration_type" label={<span style={labelStyle}>Registration Type</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="business_legal_name" label={<span style={labelStyle}>Legal Business Name</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="trade_name" label={<span style={labelStyle}>Trade Name</span>}>
                    <Input style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={6}>
                  <Form.Item name="state_code" label={<span style={labelStyle}>State Code</span>}>
                    <Input maxLength={2} style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={6}>
                  <Form.Item name="place_of_supply" label={<span style={labelStyle}>Place of Supply</span>}>
                    <Input maxLength={2} style={{ fontFamily: fontBody }} />
                  </Form.Item>
                </Col>
              </Row>

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
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <div style={{ position: 'sticky', top: 16 }}>
            <Card
              title={<Text strong style={{ color: primaryColor, fontFamily: fontHeading }}>Company Profile Preview</Text>}
              bordered={false}
              style={{
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderTop: `4px solid ${primaryColor}`,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {previewData.logo_dark_url || previewData.logo_light_url ? (
                  <Image
                    src={previewData.logo_dark_url || previewData.logo_light_url}
                    alt="Logo"
                    style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }}
                    preview={false}
                  />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <Text type="secondary" style={{ fontFamily: fontBody }}>No logo</Text>
                  </div>
                )}
              </div>

              <Title level={4} style={{ textAlign: 'center', marginBottom: 4, color: primaryColor, fontFamily: fontHeading }}>
                {previewData.company_name || 'Company Name'}
              </Title>
              {previewData.tagline && (
                <Text
                  type="secondary"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    marginBottom: 16,
                    fontStyle: 'italic',
                    fontFamily: fontBody,
                    color: primaryColor,
                  }}
                >
                  “{previewData.tagline}”
                </Text>
              )}

              <Divider style={{ margin: '12px 0' }} />

              <div style={{ fontSize: 13, fontFamily: fontBody, color: primaryColor }}>
                {previewData.phone && <div style={{ marginBottom: 4 }}>📞 {previewData.phone}</div>}
                {previewData.email && <div style={{ marginBottom: 4 }}>✉️ {previewData.email}</div>}
                {previewData.website && <div style={{ marginBottom: 4 }}>🌐 {previewData.website}</div>}
                {previewData.address && <div style={{ whiteSpace: 'pre-wrap' }}>📍 {previewData.address}</div>}
              </div>

              {(previewData.bank_name || previewData.branch_name || previewData.account_number || previewData.ifsc_code || previewData.upi_id) && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ fontSize: 12, fontFamily: fontBody, color: primaryColor }}>
                    <Text strong style={{ color: primaryColor }}>Bank Details</Text>
                    {previewData.bank_name && <div>Bank: {previewData.bank_name}</div>}
                    {previewData.branch_name && <div>Branch: {previewData.branch_name}</div>}
                    {previewData.account_number && <div>A/c: {previewData.account_number}</div>}
                    {previewData.ifsc_code && <div>IFSC: {previewData.ifsc_code}</div>}
                    {previewData.upi_id && <div>UPI: {previewData.upi_id}</div>}
                  </div>
                </>
              )}

              {previewData.gstin && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ fontSize: 12, fontFamily: fontBody, color: primaryColor }}>
                    <Text strong style={{ color: primaryColor }}>GSTIN:</Text> {previewData.gstin}
                    {previewData.gst_registered ? ' (Registered)' : ' (Unregistered)'}
                  </div>
                </>
              )}
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default OrganizationEdit