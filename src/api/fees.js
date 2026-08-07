// src/api/fees.js
import { supabase } from '../lib/supabase'

// ---------- Process Payment (RPC collect_fee) ----------
export const processPayment = async (payload) => {
  const { data, error } = await supabase.rpc('collect_fee', {
    p_student_id: payload.studentId,
    p_items: payload.items,
    p_payment_amount: payload.amount,
    p_payment_mode: payload.paymentMode,
    p_branch_id: payload.branchId,
    p_financial_year_id: payload.financialYearId,
    p_payment_date: payload.paymentDate || null,
    p_remarks: payload.remarks || null,
    p_place_of_supply: payload.placeOfSupply || null,
    p_organization_id: payload.organizationId || null,
  })
  if (error) throw error
  return data
}

// ---------- Fee Statistics ----------
export const fetchFeeStats = async ({ orgId, branchId, financialYearId } = {}) => {
  if (!orgId) return { total: 0, paid: 0, pending: 0, partial: 0, overdue: 0, totalCollected: 0, totalPending: 0, recent: [] }

  let query = supabase
    .from('student_fees')
    .select('status, total_fee, paid_amount, final_fee, due_date, student_id, created_at, updated_at')
    .eq('organization_id', orgId)

  if (branchId) query = query.eq('branch_id', branchId)
  if (financialYearId) query = query.eq('financial_year_id', financialYearId)

  const { data, error } = await query
  if (error) throw error

  const total = data?.length || 0
  const paid = data?.filter(f => f.status === 'Paid').length || 0
  const pending = data?.filter(f => f.status === 'Pending' || f.status === 'Unpaid').length || 0
  const partial = data?.filter(f => f.status === 'Partially Paid').length || 0
  const overdue = data?.filter(f => f.due_date && new Date(f.due_date) < new Date() && f.status !== 'Paid').length || 0

  const totalCollected = data?.reduce((sum, f) => sum + (f.paid_amount || 0), 0) || 0
  const totalPending = data?.reduce((sum, f) => {
    if (f.status !== 'Paid') return sum + (f.final_fee - (f.paid_amount || 0))
    return sum
  }, 0) || 0

  // Build recent list – get last 5 by updated_at or created_at
  const recentItems = data
    ?.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5) || []

  // Fetch student names for these recent items
  const studentIds = [...new Set(recentItems.map(f => f.student_id).filter(Boolean))]
  let studentMap = {}
  if (studentIds.length > 0) {
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name_formatted')
      .in('id', studentIds)
    if (students) {
      students.forEach(s => { studentMap[s.id] = s.full_name_formatted })
    }
  }

  // Attach student info to recent items
  const recent = recentItems.map(f => ({
    student_id: f.student_id,
    status: f.status,
    final_fee: f.final_fee,
    paid_amount: f.paid_amount,
    due_date: f.due_date,
    students: { full_name_formatted: studentMap[f.student_id] || null },
  }))

  return {
    total,
    paid,
    pending,
    partial,
    overdue,
    totalCollected,
    totalPending,
    recent,
  }
}

// ---------- Fees ----------
export const fetchFees = async ({ page = 1, pageSize = 10, filters = {}, orgId } = {}) => {
  if (!orgId) return { data: [], count: 0 }

  let query = supabase
    .from('student_fees')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('id', { ascending: false })

  if (filters.student_id) query = query.eq('student_id', filters.student_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.service_id) query = query.eq('service_id', filters.service_id)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  // Enrich with student and service details
  const enriched = []
  for (const fee of data) {
    const item = { ...fee }
    if (fee.student_id) {
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('full_name_formatted, admission_no, mobile')
        .eq('id', fee.student_id)
        .maybeSingle()
      if (!sErr && student) item.students = student
    }
    if (fee.service_id) {
      const { data: service, error: svcErr } = await supabase
        .from('inventory_items')
        .select('item_name, unit_price')
        .eq('id', fee.service_id)
        .maybeSingle()
      if (!svcErr && service) item.inventory_items = service
    }
    enriched.push(item)
  }

  return { data: enriched, count }
}

// ---------- Single Fee ----------
export const fetchFee = async (id, { orgId, branchId, financialYearId } = {}) => {
  if (!orgId) return null

  let query = supabase
    .from('student_fees')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)

  if (branchId) query = query.eq('branch_id', branchId)
  if (financialYearId) query = query.eq('financial_year_id', financialYearId)

  const { data: fee, error: feeError } = await query.maybeSingle()
  if (feeError) throw feeError
  if (!fee) return null

  // Enrich
  if (fee.student_id) {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('full_name_formatted, admission_no, mobile, email, address')
      .eq('id', fee.student_id)
      .maybeSingle()
    if (!sErr && student) fee.students = student
  }

  if (fee.service_id) {
    const { data: service, error: svcErr } = await supabase
      .from('inventory_items')
      .select('item_name, unit_price, description, tax_rates(rate)')
      .eq('id', fee.service_id)
      .maybeSingle()
    if (!svcErr && service) fee.inventory_items = service
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('student_fee_id', id)
    .order('payment_date', { ascending: false })
  if (!paymentsError) fee.fee_payments = payments

  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*')
    .eq('student_fee_id', id)
  if (!invoicesError) fee.invoices = invoices

  return fee
}

// ---------- Update Fee ----------
export const updateFee = async (id, updates) => {
  const { data, error } = await supabase
    .from('student_fees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- Direct Insert (manual payments) ----------
export const addPayment = async (payload) => {
  const { data, error } = await supabase
    .from('fee_payments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- Invoices ----------
export const fetchInvoices = async ({ page = 1, pageSize = 10, filters = {}, orgId } = {}) => {
  if (!orgId) return { data: [], count: 0 }

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('invoice_date', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id)
  if (filters.student_id) query = query.eq('student_id', filters.student_id)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  const enriched = []
  for (const invoice of data) {
    const item = { ...invoice }
    if (invoice.student_id) {
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('full_name_formatted, admission_no')
        .eq('id', invoice.student_id)
        .maybeSingle()
      if (!sErr && student) item.students = student
    }
    if (invoice.student_fee_id) {
      const { data: fee, error: fErr } = await supabase
        .from('student_fees')
        .select('service_id')
        .eq('id', invoice.student_fee_id)
        .maybeSingle()
      if (!fErr && fee) {
        item.student_fees = fee
        if (fee.service_id) {
          const { data: service, error: svcErr } = await supabase
            .from('inventory_items')
            .select('item_name')
            .eq('id', fee.service_id)
            .maybeSingle()
          if (!svcErr && service) {
            item.service_name = service.item_name
          }
        }
      }
    }
    enriched.push(item)
  }

  return { data: enriched, count }
}

// ---------- Single Invoice ----------
// ---------- Single Invoice ----------
export const fetchInvoice = async (id, { orgId, branchId, financialYearId } = {}) => {
  if (!orgId) return null

  let query = supabase
    .from('invoices')
    .select(`
      *,
      students (
        full_name_formatted,
        admission_no,
        mobile,
        email,
        address,
        city,
        state,
        pincode,
        gst_details ( gstin )
      ),
      fee_payments (
        id,
        payment_date,
        amount,
        payment_mode,
        receipt_number,
        transaction_no,
        remarks,
        base_amount,
        tax_amount
      ),
      receipts ( receipt_no, receipt_date, id ),
      invoice_items ( * )
    `)
    .eq('id', id)
    .eq('organization_id', orgId)

  if (branchId) query = query.eq('branch_id', branchId)
  if (financialYearId) query = query.eq('financial_year_id', financialYearId)

  const { data: invoice, error: invoiceError } = await query.maybeSingle()
  if (invoiceError) throw invoiceError
  if (!invoice) return null

  return invoice
}

// ---------- Receipts ----------
export const fetchReceipts = async ({ page = 1, pageSize = 10, filters = {}, orgId } = {}) => {
  if (!orgId) return { data: [], count: 0 }

  // receipts has no organization_id, so join branches
  let query = supabase
    .from('receipts')
    .select(`
      *,
      branches!inner ( organization_id )
    `, { count: 'exact' })
    .eq('branches.organization_id', orgId)
    .order('receipt_date', { ascending: false })

  if (filters.student_id) query = query.eq('student_id', filters.student_id)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  const enriched = []
  for (const receipt of data) {
    const item = { ...receipt }
    if (receipt.student_id) {
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('full_name_formatted, admission_no')
        .eq('id', receipt.student_id)
        .maybeSingle()
      if (!sErr && student) item.students = student
    }
    if (receipt.payment_id) {
      const { data: payment, error: pErr } = await supabase
        .from('fee_payments')
        .select('payment_mode')
        .eq('id', receipt.payment_id)
        .maybeSingle()
      if (!pErr && payment) {
        item.fee_payments = payment
      }
    }
    enriched.push(item)
  }

  return { data: enriched, count }
}

// ---------- Single Receipt ----------
export const fetchReceipt = async (id, { orgId, branchId, financialYearId } = {}) => {
  if (!orgId) return null

  let query = supabase
    .from('receipts')
    .select(`
      *,
      fee_payments ( * ),
      students ( * ),
      branches!inner ( organization_id )
    `)
    .eq('id', id)
    .eq('branches.organization_id', orgId)

  if (branchId) query = query.eq('branch_id', branchId)
  if (financialYearId) query = query.eq('financial_year_id', financialYearId)

  const { data: receipt, error } = await query.maybeSingle()
  if (error) throw error
  if (!receipt) return null

  const payment = receipt?.fee_payments?.[0]
  if (payment?.invoice_id) {
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items ( * )
      `)
      .eq('id', payment.invoice_id)
      .maybeSingle()
    if (!invError && invoice) {
      receipt.invoices = invoice
      receipt.invoice_number = invoice.invoice_number
    }
  }

  return receipt
}