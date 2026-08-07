import { supabase } from '../lib/supabase';

// ---------- Chart of Accounts ----------
export const fetchAccounts = async ({ type, orgId, branchId, financialYearId } = {}) => {
  let query = supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('is_active', true)
    .eq('organization_id', orgId)   // ✅ filter by org
    .order('account_code');

  if (type) query = query.eq('account_type', type);
  if (branchId) query = query.eq('branch_id', branchId);
  if (financialYearId) query = query.eq('financial_year_id', financialYearId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ---------- Journal Entries ----------
// ---------- Journal Entries ----------
export const fetchJournalEntries = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('journal_entries')
    .select(`
      *,
      journal_entry_lines (
        *,
        chart_of_accounts ( account_name, account_code, account_type )
      )
    `)
    .order('entry_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id);
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id);
  if (filters.search) {
    query = query.or(`reference.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
};

// ---------- Journal Entry Detail ----------
export const fetchJournalEntry = async (id) => {
  const { data, error } = await supabase
    .from('journal_entries')
    .select(
      `
      *,
      journal_entry_lines (
        *,
        chart_of_accounts ( account_name, account_code, account_type )
      )
    `
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

// ---------- Ledger (Account balances) ----------
export const fetchLedger = async ({ orgId, branchId, financialYearId } = {}) => {
  // Get all accounts for the organization
  const { data: accounts, error: acctErr } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('account_code');
  if (acctErr) throw acctErr;

  // Get all journal entry lines for the given period
  let query = supabase
    .from('journal_entry_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, is_posted, branch_id)')
    .eq('journal_entries.is_posted', true);

  // Filter by branch and financial year
  if (branchId) query = query.eq('branch_id', branchId);
  if (financialYearId) query = query.eq('financial_year_id', financialYearId);

  // Use inner join with branches to enforce organization
  if (orgId) {
    query = supabase
      .from('journal_entry_lines')
      .select('account_id, debit, credit, journal_entries!inner(entry_date, is_posted, branch_id, branches!inner(organization_id))')
      .eq('journal_entries.branches.organization_id', orgId)
      .eq('journal_entries.is_posted', true);
    if (branchId) query = query.eq('branch_id', branchId);
    if (financialYearId) query = query.eq('financial_year_id', financialYearId);
  }

  const { data: lines, error: linesErr } = await query;
  if (linesErr) throw linesErr;

  // Aggregate balances per account with correct sign
  const balances = {};
  lines.forEach((line) => {
    if (!balances[line.account_id]) {
      balances[line.account_id] = { debit: 0, credit: 0 };
    }
    balances[line.account_id].debit += Number(line.debit) || 0;
    balances[line.account_id].credit += Number(line.credit) || 0;
  });

  // Combine with account details using correct sign
  const ledger = accounts.map((acct) => {
    const bal = balances[acct.id] || { debit: 0, credit: 0 };
    // ✅ Correct sign: Asset/Expense = debit - credit; Liability/Equity/Income = credit - debit
    const balance =
      acct.account_type === 'asset' || acct.account_type === 'expense'
        ? bal.debit - bal.credit
        : bal.credit - bal.debit;
    return {
      ...acct,
      total_debit: bal.debit,
      total_credit: bal.credit,
      balance,
    };
  });

  return ledger;
};

// ---------- Income & Expense Summary ----------
export const fetchIncomeExpenseSummary = async ({ orgId, branchId, financialYearId } = {}) => {
  // Get income and expense accounts for the organization
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_name, account_code, account_type')
    .in('account_type', ['income', 'expense'])
    .eq('organization_id', orgId)
    .eq('is_active', true);

  const accountIds = accounts.map((a) => a.id);
  if (!accountIds.length) return { income: [], expenses: [], totalIncome: 0, totalExpenses: 0 };

  let query = supabase
    .from('journal_entry_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, is_posted, branch_id, branches!inner(organization_id))')
    .in('account_id', accountIds)
    .eq('journal_entries.is_posted', true)
    .eq('journal_entries.branches.organization_id', orgId);

  if (branchId) query = query.eq('branch_id', branchId);
  if (financialYearId) query = query.eq('financial_year_id', financialYearId);

  const { data: lines, error } = await query;
  if (error) throw error;

  // Aggregate per account
  const incomeMap = {},
    expenseMap = {};
  lines.forEach((line) => {
    const isIncome = accounts.find((a) => a.id === line.account_id)?.account_type === 'income';
    const target = isIncome ? incomeMap : expenseMap;
    if (!target[line.account_id]) target[line.account_id] = { debit: 0, credit: 0 };
    target[line.account_id].debit += Number(line.debit) || 0;
    target[line.account_id].credit += Number(line.credit) || 0;
  });

  const format = (map, accountList, type) => {
    return accountList
      .map((acct) => {
        const bal = map[acct.id] || { debit: 0, credit: 0 };
        const amount = type === 'income' ? bal.credit - bal.debit : bal.debit - bal.credit;
        return { ...acct, amount };
      })
      .filter((a) => a.amount !== 0);
  };

  const income = format(incomeMap, accounts.filter((a) => a.account_type === 'income'), 'income');
  const expenses = format(expenseMap, accounts.filter((a) => a.account_type === 'expense'), 'expense');
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return { income, expenses, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
};

// ---------- Trial Balance ----------
export const fetchTrialBalance = async ({ orgId, branchId, financialYearId } = {}) => {
  const ledger = await fetchLedger({ orgId, branchId, financialYearId });
  return ledger.filter((a) => a.balance !== 0);
};

// ---------- Income Transactions (from income table) ----------
export const fetchIncomeTransactions = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('income')
    .select('*', { count: 'exact' })
    .order('income_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // Organization filtering via branches
  if (filters.orgId) {
    query = supabase
      .from('income')
      .select('*, branches!inner(organization_id)', { count: 'exact' })
      .eq('branches.organization_id', filters.orgId)
      .order('income_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  }

  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id);
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id);
  if (filters.category) query = query.eq('category', filters.category);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
};

// ---------- Expense Transactions ----------
export const fetchExpenseTransactions = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .order('expense_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.orgId) {
    query = supabase
      .from('expenses')
      .select('*, branches!inner(organization_id)', { count: 'exact' })
      .eq('branches.organization_id', filters.orgId)
      .order('expense_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  }

  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id);
  if (filters.financial_year_id) query = query.eq('financial_year_id', filters.financial_year_id);
  if (filters.category) query = query.eq('category', filters.category);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
};

// ---------- Account-wise Ledger ----------
export const fetchAccountLedger = async (
  accountId,
  { orgId, branchId, financialYearId, fromDate, toDate } = {}
) => {
  let query = supabase
    .from('journal_entry_lines')
    .select(
      `
      *,
      journal_entries (
        id,
        entry_date,
        reference,
        description,
        branch_id,
        branches!inner ( organization_id )
      )
    `
    )
    .eq('account_id', accountId)
    .eq('journal_entries.branches.organization_id', orgId)
    .order('journal_entries(entry_date)', { ascending: true });

  if (branchId) query = query.eq('branch_id', branchId);
  if (financialYearId) query = query.eq('financial_year_id', financialYearId);
  if (fromDate) query = query.gte('journal_entries.entry_date', fromDate);
  if (toDate) query = query.lte('journal_entries.entry_date', toDate);

  const { data, error } = await query;
  if (error) throw error;

  // Compute running balance (debit - credit, keeping sign)
  let runningBalance = 0;
  const enriched = data.map((line) => {
    const amount = Number(line.debit || 0) - Number(line.credit || 0);
    runningBalance += amount;
    return {
      ...line,
      running_balance: runningBalance,
      amount,
      type: line.debit > 0 ? 'debit' : 'credit',
    };
  });
  return enriched;
};

// ---------- Student-wise Ledger ----------
export const fetchStudentLedger = async (
  studentId,
  { orgId, branchId, financialYearId, fromDate, toDate } = {}
) => {
  // For simplicity, we keep the frontend logic but add organization filter via branch.
  // Since student_fees and invoices have branch_id, we can join with branches.
  let paymentsQuery = supabase
    .from('fee_payments')
    .select(
      `
      *,
      student_fees ( student_id ),
      invoices ( invoice_number ),
      branches!inner ( organization_id )
    `
    )
    .eq('student_fees.student_id', studentId)
    .eq('branches.organization_id', orgId)
    .order('payment_date', { ascending: true });

  if (branchId) paymentsQuery = paymentsQuery.eq('branch_id', branchId);
  if (financialYearId) paymentsQuery = paymentsQuery.eq('financial_year_id', financialYearId);
  if (fromDate) paymentsQuery = paymentsQuery.gte('payment_date', fromDate);
  if (toDate) paymentsQuery = paymentsQuery.lte('payment_date', toDate);

  const { data: payments, error: pErr } = await paymentsQuery;
  if (pErr) throw pErr;

  let invoicesQuery = supabase
    .from('invoices')
    .select(
      `
      *,
      student_fees ( student_id ),
      branches!inner ( organization_id )
    `
    )
    .eq('student_fees.student_id', studentId)
    .eq('branches.organization_id', orgId)
    .order('invoice_date', { ascending: true });

  if (branchId) invoicesQuery = invoicesQuery.eq('branch_id', branchId);
  if (financialYearId) invoicesQuery = invoicesQuery.eq('financial_year_id', financialYearId);
  if (fromDate) invoicesQuery = invoicesQuery.gte('invoice_date', fromDate);
  if (toDate) invoicesQuery = invoicesQuery.lte('invoice_date', toDate);

  const { data: invoices, error: iErr } = await invoicesQuery;
  if (iErr) throw iErr;

  // Combine and format
  const entries = [];
  invoices.forEach((inv) => {
    entries.push({
      date: inv.invoice_date,
      type: 'invoice',
      reference: inv.invoice_number,
      description: 'Fee charge',
      amount: Number(inv.grand_total || 0),
      balance: 0,
    });
  });
  payments.forEach((pmt) => {
    entries.push({
      date: pmt.payment_date,
      type: 'payment',
      reference: pmt.receipt_number || pmt.transaction_no || 'Payment',
      description: `Payment (${pmt.payment_mode})`,
      amount: -Number(pmt.amount || 0),
      balance: 0,
    });
  });

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;
  entries.forEach((e) => {
    runningBalance += e.amount;
    e.balance = runningBalance;
  });
  return entries;
};

// ---------- GST Summary (using the `gst_summary` view) ----------
export const fetchGSTSummary = async ({ orgId, branchId, financialYearId, fromDate, toDate } = {}) => {
  let query = supabase
    .from('gst_summary')
    .select('*')
    .eq('organization_id', orgId);

  if (branchId) query = query.eq('branch_id', branchId);
  if (financialYearId) query = query.eq('financial_year_id', financialYearId);
  if (fromDate) query = query.gte('month', fromDate);
  if (toDate) query = query.lte('month', toDate);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchGeneralLedger = async ({ orgId, startDate, endDate, branchId, financialYearId, accountId } = {}) => {
  const { data, error } = await supabase
    .rpc('get_general_ledger', {
      p_org_id: orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_branch_id: branchId || null,
      p_financial_year_id: financialYearId || null,
      p_account_id: accountId || null,
    });
  if (error) throw error;
  return data;
};

export const fetchGSTLedger = async ({ orgId, startDate, endDate, branchId } = {}) => {
  const { data, error } = await supabase
    .rpc('get_gst_ledger', {
      p_org_id: orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_branch_id: branchId || null,
    });
  if (error) throw error;
  return data;
};