import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Card, Row, Col, Form, Input, Select, Button, Table, Space, Statistic, Divider,
  message, InputNumber, DatePicker, Modal, Typography, Tag, Alert
} from 'antd'
import { SearchOutlined, DeleteOutlined, DollarOutlined, ShoppingOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../contexts/ThemeContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

const FeeCollection = () => {
  const { theme } = useTheme()
  const { org } = useOrganization()
  const outletContext = useOutletContext()
  const { selectedBranch, selectedFinancialYear } = outletContext || {}
  const queryClient = useQueryClient()

  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'
  const fontHeading = theme?.font_heading || 'Righteous'

  // ---- State ----
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [items, setItems] = useState([])
  const [discountType, setDiscountType] = useState('fixed')
  const [discountValue, setDiscountValue] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paymentDate, setPaymentDate] = useState(dayjs())
  const [remarks, setRemarks] = useState('')
  const [inventorySearchVisible, setInventorySearchVisible] = useState(false)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const [serviceModalVisible, setServiceModalVisible] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [manualFeeAmount, setManualFeeAmount] = useState(0)
  const [manualTaxRate, setManualTaxRate] = useState(18)
  const [selectedHsn, setSelectedHsn] = useState('')
  const [isPaymentManuallySet, setIsPaymentManuallySet] = useState(false)

  const branchId = selectedBranch?.id || 1
  const financialYearId = selectedFinancialYear?.id || 1
  const orgId = org?.id || selectedBranch?.organization_id

  const getPositiveOutstanding = (balance) => balance && balance > 0 ? balance : 0

  // ---- Queries ----
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-search', searchTerm, orgId],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return []
      let query = supabase
        .from('students')
        .select('id, admission_no, full_name_formatted, mobile, email, address, city, state, pincode, gstin')
        .or(`full_name_formatted.ilike.%${searchTerm}%,admission_no.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%`)
        .limit(20)
      if (orgId) query = query.eq('organization_id', orgId)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: searchTerm.length > 1 && !!orgId,
  })

  // Student fee summary – includes original tax rate
  const {
    data: studentFee,
    refetch: refetchStudentFee,
    isLoading: feeLoading,
    error: feeError,
  } = useQuery({
    queryKey: ['student-fee-summary', selectedStudent?.id, branchId, financialYearId],
    queryFn: async () => {
      if (!selectedStudent) return null

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('course_id, level_id')
        .eq('id', selectedStudent.id)
        .maybeSingle()
      if (studentError) throw studentError

      let courseName = null
      let levelName = null
      if (studentData?.course_id) {
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('name')
          .eq('id', studentData.course_id)
          .maybeSingle()
        if (!courseError && course) courseName = course.name
      }
      if (studentData?.level_id) {
        const { data: level, error: levelError } = await supabase
          .from('courses')
          .select('name')
          .eq('id', studentData.level_id)
          .maybeSingle()
        if (!levelError && level) levelName = level.name
      }

      const { data: fees, error: feeError } = await supabase
        .from('student_fees')
        .select(`
          id,
          base_fee,
          tax_rate,
          tax_amount,
          total_fee,
          discount,
          final_fee,
          status,
          due_date,
          paid_amount
        `)
        .eq('student_id', selectedStudent.id)
        .eq('branch_id', branchId)
        .eq('financial_year_id', financialYearId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (feeError) throw feeError
      if (!fees || fees.length === 0) {
        return {
          fee_id: null,
          total_base: 0,
          total_tax: 0,
          discount: 0,
          total_due: 0,
          paid_base: 0,
          paid_tax: 0,
          paid_amount: 0,
          outstanding_base: 0,
          outstanding_tax: 0,
          balance_due: 0,
          course_name: courseName,
          current_level_name: levelName,
          fee_status: 'Pending',
          original_tax_rate: 0,
        }
      }

      const fee = fees[0]
      const feeId = fee.id

      const { data: payments, error: payError } = await supabase
        .from('fee_payments')
        .select('base_amount, tax_amount, amount')
        .eq('student_fee_id', feeId)
      if (payError) throw payError

      const totalPaidBase = payments?.reduce((sum, p) => sum + (p.base_amount || 0), 0) || 0
      const totalPaidTax = payments?.reduce((sum, p) => sum + (p.tax_amount || 0), 0) || 0
      const totalPaidAmount = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      const baseFee = fee.base_fee || 0
      const taxAmount = fee.tax_amount || 0
      const discount = fee.discount || 0
      const finalFee = fee.final_fee || 0

      const outstandingBase = Math.max(baseFee - totalPaidBase, 0)
      const outstandingTax = Math.max(taxAmount - totalPaidTax, 0)
      const outstandingTotal = finalFee - totalPaidAmount

      let feeStatus = fee.status
      if (outstandingTotal <= 0) feeStatus = 'Paid'
      else if (totalPaidAmount > 0) feeStatus = 'Partially Paid'
      else feeStatus = 'Pending'

      return {
        fee_id: feeId,
        total_base: baseFee,
        total_tax: taxAmount,
        discount: discount,
        total_due: finalFee,
        paid_base: totalPaidBase,
        paid_tax: totalPaidTax,
        paid_amount: totalPaidAmount,
        outstanding_base: outstandingBase,
        outstanding_tax: outstandingTax,
        balance_due: outstandingTotal,
        course_name: courseName,
        current_level_name: levelName,
        fee_status: feeStatus,
        original_tax_rate: fee.tax_rate || 0,
      }
    },
    enabled: !!selectedStudent && !!branchId && !!financialYearId,
  })

  const { data: services } = useQuery({
    queryKey: ['inventory-services', branchId, financialYearId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`id, item_name, description, unit_price, hsn_sac_code, tax_rate_id, tax_rates ( rate )`)
        .eq('item_type', 'service')
        .eq('is_active', true)
        .eq('branch_id', branchId)
        .eq('financial_year_id', financialYearId)
      if (error) throw error
      return data
    },
    enabled: !!branchId && !!financialYearId,
  })

  const { data: products } = useQuery({
    queryKey: ['inventory-products', inventorySearchTerm, branchId, financialYearId],
    queryFn: async () => {
      if (!inventorySearchTerm || inventorySearchTerm.length < 2) return []
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`id, item_name, description, unit_price, current_stock, reorder_level, unit, hsn_sac_code, tax_rate_id, tax_rates ( rate )`)
        .eq('item_type', 'product')
        .eq('branch_id', branchId)
        .eq('financial_year_id', financialYearId)
        .ilike('item_name', `%${inventorySearchTerm}%`)
        .limit(20)
      if (error) throw error
      return data
    },
    enabled: inventorySearchTerm.length > 1 && !!branchId && !!financialYearId,
  })

  // ---- Computed ----
  const outstanding = getPositiveOutstanding(studentFee?.balance_due)
  const isFullyPaid = studentFee?.balance_due <= 0

  // ---- Update cart when payment amount changes ----
  useEffect(() => {
    if (!selectedStudent || !studentFee || paymentAmount <= 0) {
      // Remove fee item if no student or payment amount is 0
      const feeItemIndex = items.findIndex(i => i.is_fee_item === true)
      if (feeItemIndex !== -1) {
        const newItems = [...items]
        newItems.splice(feeItemIndex, 1)
        setItems(newItems)
      }
      return
    }

    const outstandingBase = studentFee.outstanding_base || 0
    const outstandingTax = studentFee.outstanding_tax || 0
    const totalOutstanding = outstandingBase + outstandingTax

    if (totalOutstanding === 0) {
      const feeItemIndex = items.findIndex(i => i.is_fee_item === true)
      if (feeItemIndex !== -1) {
        const newItems = [...items]
        newItems.splice(feeItemIndex, 1)
        setItems(newItems)
      }
      return
    }

    // Calculate proportional tax for the payment amount
    const paymentTax = (paymentAmount * outstandingTax) / totalOutstanding
    const paymentBase = paymentAmount - paymentTax

    const originalTaxRate = studentFee.original_tax_rate || 0

    const feeItem = {
      id: 'fee-' + Date.now(),
      item_type: 'service',
      description: studentFee.course_name || 'Course Fee',
      quantity: 1,
      unit_price: paymentAmount,
      taxable_amount: paymentBase,
      tax_amount: paymentTax,   // ✅ include tax_amount
      total_amount: paymentAmount,
      tax_rate: originalTaxRate,
      hsn_code: '9992',
      is_fee_item: true,
    }

    const feeItemIndex = items.findIndex(i => i.is_fee_item === true)
    if (feeItemIndex !== -1) {
      const newItems = [...items]
      newItems[feeItemIndex] = feeItem
      setItems(newItems)
    } else {
      setItems([...items, feeItem])
    }
  }, [paymentAmount, studentFee, selectedStudent])

  // ---- Reset when student changes ----
  useEffect(() => {
    setItems([])
    setDiscountValue(0)
    setPaymentAmount(0)
    setIsPaymentManuallySet(false)
    setRemarks('')
  }, [selectedStudent])

  // ---- Handlers ----
  const addFullOutstanding = () => {
    if (!selectedStudent) {
      message.warning('Please select a student first')
      return
    }
    if (outstanding <= 0) {
      message.warning('No outstanding balance to add')
      return
    }
    setPaymentAmount(outstanding)
    setIsPaymentManuallySet(true)
    message.success('Full outstanding fee added to cart')
  }

  const addServiceToCart = () => {
    if (!selectedServiceId) { message.warning('Please select a service'); return }
    const service = services?.find(s => s.id === selectedServiceId)
    if (!service) return
    const taxRate = service.tax_rates?.rate || 0
    const feeItem = {
      id: 'service-' + Date.now(),
      item_type: 'service',
      description: service.item_name,
      quantity: 1,
      unit_price: manualFeeAmount || service.unit_price,
      taxable_amount: manualFeeAmount || service.unit_price,
      tax_amount: (manualFeeAmount || service.unit_price) * taxRate / 100,
      total_amount: (manualFeeAmount || service.unit_price) * (1 + taxRate / 100),
      tax_rate: taxRate,
      hsn_code: service.hsn_sac_code || '9992',
    }
    setItems([...items, feeItem])
    setIsPaymentManuallySet(false)
    setServiceModalVisible(false)
    setSelectedServiceId(null)
    setManualFeeAmount(0)
    setManualTaxRate(18)
    setSelectedHsn('')
    message.success('Service added to cart')
  }

  const addInventoryItem = (item) => {
    if (item.current_stock <= 0) { message.error('Item out of stock'); return }
    const existing = items.find(i => i.inventory_item_id === item.id)
    if (existing) {
      const newItems = items.map(i => {
        if (i.inventory_item_id === item.id) {
          const newQty = i.quantity + 1
          if (newQty > item.current_stock) { message.error('Not enough stock'); return i }
          return {
            ...i,
            quantity: newQty,
            taxable_amount: newQty * i.unit_price,
            tax_amount: newQty * i.unit_price * i.tax_rate / 100,
            total_amount: newQty * i.unit_price * (1 + i.tax_rate / 100),
          }
        }
        return i
      })
      setItems(newItems)
    } else {
      const taxRate = item.tax_rates?.rate || 0
      const newItem = {
        id: 'inv-' + Date.now(),
        item_type: 'product',
        inventory_item_id: item.id,
        description: item.item_name,
        quantity: 1,
        unit_price: item.unit_price,
        taxable_amount: item.unit_price,
        tax_amount: item.unit_price * taxRate / 100,
        total_amount: item.unit_price * (1 + taxRate / 100),
        tax_rate: taxRate,
        hsn_code: item.hsn_sac_code || '',
      }
      setItems([...items, newItem])
    }
    setInventorySearchVisible(false)
    setInventorySearchTerm('')
    setIsPaymentManuallySet(false)
  }

  const updateCartItem = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    const qty = newItems[index].quantity || 1
    const price = newItems[index].unit_price || 0
    const rate = newItems[index].tax_rate || 0
    newItems[index].taxable_amount = qty * price
    newItems[index].tax_amount = qty * price * rate / 100
    newItems[index].total_amount = qty * price * (1 + rate / 100)
    setItems(newItems)
    setIsPaymentManuallySet(false)
  }

  const removeCartItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    if (items[index]?.is_fee_item) {
      setPaymentAmount(0)
      setIsPaymentManuallySet(false)
    }
  }

  const collectFeeMutation = useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.rpc('collect_fee', payload)
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (data) => {
      message.success(`Invoice ${data.invoice_no} generated successfully!`)
      setItems([])
      setDiscountValue(0)
      setPaymentAmount(0)
      setIsPaymentManuallySet(false)
      setSelectedStudent(null)
      setSearchTerm('')
      queryClient.invalidateQueries(['student-fee-summary'])
    },
    onError: (err) => {
      message.error(err.message || 'Failed to generate invoice')
    },
  })

  const handleGenerateInvoice = async () => {
    if (!selectedStudent) { message.warning('Please select a student'); return }
    if (items.length === 0) { message.warning('Please add at least one item'); return }
    if (paymentAmount <= 0) { message.warning('Please enter a payment amount'); return }

    const payload = {
      p_student_id: selectedStudent.id,
      p_items: items.map(item => ({
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        tax_rate: item.tax_rate || 0,
        taxable_amount: item.taxable_amount || 0,
        tax_amount: item.tax_amount || 0,   // ✅ include tax_amount
        total_amount: item.total_amount || 0,
        inventory_item_id: item.inventory_item_id || null,
        hsn_sac_code: item.hsn_code || null,
        is_fee_item: item.is_fee_item || false,
      })),
      p_payment_amount: paymentAmount,
      p_payment_mode: paymentMode,
      p_payment_date: paymentDate.format('YYYY-MM-DD'),
      p_remarks: remarks || '',
      p_branch_id: branchId,
      p_financial_year_id: financialYearId,
      p_organization_id: orgId,
    }
    collectFeeMutation.mutate(payload)
  }

  const cartColumns = [
    { title: 'Item', dataIndex: 'description' },
    {
      title: 'Qty',
      render: (_, record, index) => (
        <InputNumber min={1} value={record.quantity} onChange={(v) => updateCartItem(index, 'quantity', v)} style={{ width: 70 }} />
      ),
    },
    {
      title: 'Unit Price',
      render: (_, record, index) => (
        <InputNumber min={0} value={record.unit_price} onChange={(v) => updateCartItem(index, 'unit_price', v)} style={{ width: 100 }} />
      ),
    },
    {
      title: 'Tax Rate',
      render: (_, record, index) => (
        <Select value={record.tax_rate} onChange={(v) => updateCartItem(index, 'tax_rate', v)} style={{ width: 80 }}>
          <Option value={0}>0%</Option><Option value={5}>5%</Option><Option value={12}>12%</Option>
          <Option value={18}>18%</Option><Option value={28}>28%</Option>
        </Select>
      ),
    },
    { title: 'Taxable', render: (_, record) => `₹${(record.taxable_amount || 0).toFixed(2)}` },
    { title: 'Total', render: (_, record) => `₹${(record.total_amount || 0).toFixed(2)}` },
    {
      title: '',
      render: (_, record, index) => <Button icon={<DeleteOutlined />} danger size="small" onClick={() => removeCartItem(index)} />,
    },
  ]

  // Compute cart totals
  const cartTotals = items.reduce((acc, item) => {
    acc.taxable += item.taxable_amount || 0
    acc.tax += item.tax_amount || 0
    acc.total += item.total_amount || 0
    return acc
  }, { taxable: 0, tax: 0, total: 0 })

  let discountAmount = 0
  if (discountType === 'fixed') discountAmount = Math.min(discountValue, cartTotals.total)
  else discountAmount = (discountValue / 100) * cartTotals.total
  const finalTotal = cartTotals.total - discountAmount

  useEffect(() => {
    if (!isPaymentManuallySet) setPaymentAmount(finalTotal)
  }, [finalTotal, isPaymentManuallySet])

  // ---- Error handling ----
  if (feeError) {
    return (
      <Card bordered={false}>
        <Alert
          message="Error loading fee data"
          description={feeError.message || 'Please try again'}
          type="error"
          showIcon
        />
      </Card>
    )
  }

  return (
    <div style={{ fontFamily: fontBody, padding: 16 }}>
      <Title level={3} style={{ color: primaryColor, fontFamily: fontHeading, marginBottom: 24 }}>Fee Collection & Billing</Title>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Student Lookup</span>} bordered={false}
            style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Select
              showSearch placeholder="Search student by name, admission no, or mobile"
              filterOption={false} onSearch={setSearchTerm}
              onChange={(value) => setSelectedStudent(students?.find(s => s.id === value) || null)}
              options={students?.map(s => ({ label: `${s.full_name_formatted} (${s.admission_no}) - ${s.mobile}`, value: s.id }))}
              style={{ width: '100%' }} loading={studentsLoading} allowClear onClear={() => setSelectedStudent(null)}
            />
            {selectedStudent && (
              <>
                <div style={{ marginTop: 16 }}>
                  <Row gutter={16}>
                    <Col span={12}><Text strong>Name:</Text> {selectedStudent.full_name_formatted}</Col>
                    <Col span={12}><Text strong>Admission:</Text> {selectedStudent.admission_no}</Col>
                    <Col span={12}><Text strong>Mobile:</Text> {selectedStudent.mobile}</Col>
                    <Col span={12}><Text strong>Email:</Text> {selectedStudent.email || '-'}</Col>
                    <Col span={24}><Text strong>Address:</Text> {selectedStudent.address}, {selectedStudent.city}, {selectedStudent.state} - {selectedStudent.pincode}</Col>
                  </Row>
                </div>

                {studentFee && (
                  <Card size="small" style={{ marginTop: 16, background: '#fafafa', border: `1px solid ${primaryColor}` }}>
                    <Row gutter={[16, 8]}>
                      <Col span={24}><Text strong style={{ color: primaryColor }}>Fee Summary</Text></Col>
                      <Col span={8}><Text strong>Course:</Text> {studentFee.course_name || 'N/A'}</Col>
                      <Col span={8}><Text strong>Level:</Text> {studentFee.current_level_name || 'N/A'}</Col>
                      <Col span={8}><Text strong>Total Base:</Text> ₹{studentFee.total_base?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Tax Amount:</Text> ₹{studentFee.total_tax?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Discount:</Text> ₹{studentFee.discount?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Total Due:</Text> ₹{studentFee.total_due?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Paid Base:</Text> ₹{studentFee.paid_base?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Paid Tax:</Text> ₹{studentFee.paid_tax?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Total Paid:</Text> ₹{studentFee.paid_amount?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Outstanding Base:</Text> ₹{studentFee.outstanding_base?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}><Text strong>Outstanding Tax:</Text> ₹{studentFee.outstanding_tax?.toFixed(2) || '0.00'}</Col>
                      <Col span={8}>
                        <Text strong>Balance Due:</Text>
                        <Text style={{ color: outstanding > 0 ? '#cf1322' : '#3f8600', fontWeight: 'bold' }}>
                          ₹{outstanding.toFixed(2)}
                        </Text>
                      </Col>
                      <Col span={8}>
                        <Text strong>Status:</Text>
                        <Tag color={isFullyPaid ? 'green' : 'orange'}>{studentFee.fee_status || (isFullyPaid ? 'Paid' : 'Pending')}</Tag>
                      </Col>
                      <Col span={24}><Button size="small" icon={<ReloadOutlined />} onClick={() => refetchStudentFee()}>Refresh</Button></Col>
                    </Row>
                  </Card>
                )}
              </>
            )}
          </Card>

          <Card title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Add Items</span>} bordered={false}
            style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Space>
              <Button type="primary" icon={<DollarOutlined />} onClick={addFullOutstanding} disabled={!selectedStudent || outstanding <= 0}>Add Outstanding Fee</Button>
              <Button icon={<DollarOutlined />} onClick={() => setServiceModalVisible(true)} disabled={!selectedStudent}>Add Service Fee</Button>
              <Button icon={<ShoppingOutlined />} onClick={() => setInventorySearchVisible(true)} disabled={!selectedStudent}>Add Inventory Item</Button>
            </Space>
          </Card>

          <Card title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Cart</span>} bordered={false}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Table
              dataSource={items}
              columns={cartColumns}
              rowKey="id"
              pagination={false}
              size="small"
              footer={() => (
                <div>
                  <Row gutter={16} align="middle" justify="end">
                    <Col><Text strong>Taxable: ₹{cartTotals.taxable.toFixed(2)}</Text></Col>
                    <Col><Text strong>Tax: ₹{cartTotals.tax.toFixed(2)}</Text></Col>
                    <Col><Text strong style={{ fontSize: 16, color: primaryColor }}>Total: ₹{cartTotals.total.toFixed(2)}</Text></Col>
                  </Row>

                  {paymentAmount > 0 && cartTotals.total > 0 && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <Row gutter={16} align="middle" justify="end">
                        <Col span={12}><Text strong style={{ color: primaryColor }}>Payment Allocation</Text></Col>
                      </Row>
                      <Row gutter={16} align="middle" justify="end">
                        <Col span={6}><Text>Taxable</Text></Col>
                        <Col span={6}><Text>Tax</Text></Col>
                        <Col span={6}><Text>Total</Text></Col>
                      </Row>
                      <Row gutter={16} align="middle" justify="end">
                        <Col span={6}>
                          <Text strong>₹{((paymentAmount * cartTotals.taxable) / cartTotals.total).toFixed(2)}</Text>
                        </Col>
                        <Col span={6}>
                          <Text strong>₹{(paymentAmount - ((paymentAmount * cartTotals.taxable) / cartTotals.total)).toFixed(2)}</Text>
                        </Col>
                        <Col span={6}>
                          <Text strong style={{ color: primaryColor }}>₹{paymentAmount.toFixed(2)}</Text>
                        </Col>
                      </Row>
                    </>
                  )}

                  {paymentAmount > 0 && cartTotals.total > 0 && (
                    <div style={{ marginTop: 8, padding: 8, background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Text type="secondary">Invoice Total</Text>
                          <br />
                          <Text strong>₹{cartTotals.total.toFixed(2)}</Text>
                        </Col>
                        <Col span={8}>
                          <Text type="secondary">Payment Now</Text>
                          <br />
                          <Text strong style={{ color: primaryColor }}>₹{paymentAmount.toFixed(2)}</Text>
                        </Col>
                        <Col span={8}>
                          <Text type="secondary">Balance Due</Text>
                          <br />
                          <Text strong style={{ color: paymentAmount >= cartTotals.total ? '#3f8600' : '#cf1322' }}>
                            ₹{(cartTotals.total - paymentAmount).toFixed(2)}
                          </Text>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '4px 0' }} />
                      <Row>
                        <Col span={24}>
                          <Text type="secondary">Payment will be applied as:</Text>
                          <br />
                          <Text>Taxable: ₹{((paymentAmount * cartTotals.taxable) / cartTotals.total).toFixed(2)}</Text>
                          <Text style={{ marginLeft: 16 }}>Tax: ₹{(paymentAmount - ((paymentAmount * cartTotals.taxable) / cartTotals.total)).toFixed(2)}</Text>
                        </Col>
                      </Row>
                    </div>
                  )}
                </div>
              )}
            />
            <Divider />
            <Row gutter={16} align="middle">
              <Col xs={24} sm={6}><Text strong>Discount</Text></Col>
              <Col xs={12} sm={3}><Select value={discountType} onChange={setDiscountType} style={{ width: '100%' }}><Option value="fixed">Fixed</Option><Option value="percentage">%</Option></Select></Col>
              <Col xs={12} sm={5}><InputNumber min={0} value={discountValue} onChange={setDiscountValue} style={{ width: '100%' }} /></Col>
              <Col xs={24} sm={10}><Text strong>Final Total: ₹{finalTotal.toFixed(2)}</Text></Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Payment</span>} bordered={false}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}><Text type="secondary">Total Payable: <strong>₹{finalTotal.toFixed(2)}</strong></Text></div>
            <Form layout="vertical">
              <Form.Item label="Payment Amount">
                <InputNumber
                  min={0} value={paymentAmount}
                  onChange={(val) => { setPaymentAmount(val || 0); setIsPaymentManuallySet(true) }}
                  style={{ width: '100%' }} precision={2}
                  formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/₹\s?|(,*)/g, '')}
                />
              </Form.Item>

              {paymentAmount > 0 && cartTotals.total > 0 && (
                <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text type="secondary">Taxable Amount</Text>
                      <br />
                      <Text strong>₹{((paymentAmount * cartTotals.taxable) / cartTotals.total).toFixed(2)}</Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Tax Amount</Text>
                      <br />
                      <Text strong>₹{(paymentAmount - ((paymentAmount * cartTotals.taxable) / cartTotals.total)).toFixed(2)}</Text>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '4px 0' }} />
                  <Row>
                    <Col span={24}>
                      <Text type="secondary">Total Payment</Text>
                      <br />
                      <Text strong style={{ fontSize: 16, color: primaryColor }}>₹{paymentAmount.toFixed(2)}</Text>
                    </Col>
                  </Row>
                </div>
              )}

              <Form.Item label="Mode">
                <Select value={paymentMode} onChange={setPaymentMode}>
                  <Option value="Cash">Cash</Option><Option value="UPI">UPI</Option>
                  <Option value="Bank Transfer">Bank Transfer</Option><Option value="Card">Card</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Date">
                <DatePicker value={paymentDate} onChange={setPaymentDate} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Remarks">
                <Input.TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
              </Form.Item>
            </Form>
            <Button type="primary" size="large" block onClick={handleGenerateInvoice} loading={collectFeeMutation.isLoading}
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
              Generate Invoice & Pay
            </Button>
          </Card>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic title="Total Items" value={items.length} />
            <Statistic title="Grand Total" value={finalTotal} precision={2} prefix="₹" />
          </Card>
        </Col>
      </Row>

      <Modal title="Add Service Fee" open={serviceModalVisible} onCancel={() => {
        setServiceModalVisible(false); setSelectedServiceId(null); setManualFeeAmount(0); setManualTaxRate(18); setSelectedHsn('');
      }} onOk={addServiceToCart} okText="Add to Cart" width={500}>
        <Form layout="vertical">
          <Form.Item label="Select Service" required>
            <Select placeholder="Select a service" style={{ width: '100%' }} value={selectedServiceId}
              onChange={(val) => {
                const service = services?.find(s => s.id === val)
                if (service) {
                  setSelectedServiceId(val)
                  setManualFeeAmount(service.unit_price || 0)
                  setManualTaxRate(service.tax_rates?.rate || 0)
                  setSelectedHsn(service.hsn_sac_code || '')
                }
              }}>
              {services?.map(s => <Option key={s.id} value={s.id}>{s.item_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Amount (₹)" required>
            <InputNumber min={0} value={manualFeeAmount} onChange={(val) => setManualFeeAmount(val || 0)} style={{ width: '100%' }} precision={2} />
          </Form.Item>
          <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
            <Text type="secondary">Tax Rate: {manualTaxRate}%</Text>
            {selectedHsn && <Text type="secondary" style={{ marginLeft: 12 }}>HSN: {selectedHsn}</Text>}
          </div>
        </Form>
      </Modal>

      <Modal title="Add Inventory Item" open={inventorySearchVisible} onCancel={() => { setInventorySearchVisible(false); setInventorySearchTerm('') }} footer={null} width={700}>
        <Input placeholder="Search inventory items..." prefix={<SearchOutlined />} value={inventorySearchTerm}
          onChange={(e) => setInventorySearchTerm(e.target.value)} style={{ marginBottom: 16 }} />
        <Table dataSource={products} columns={[
          { title: 'Item', dataIndex: 'item_name' },
          { title: 'Price', dataIndex: 'unit_price', render: v => `₹${v.toFixed(2)}` },
          { title: 'Stock', dataIndex: 'current_stock' },
          { title: 'Unit', dataIndex: 'unit' },
          { title: 'Action', render: (_, record) => <Button type="primary" size="small" onClick={() => addInventoryItem(record)} disabled={record.current_stock <= 0}>Add</Button> },
        ]} rowKey="id" pagination={false} size="small" />
      </Modal>
    </div>
  )
}

export default FeeCollection