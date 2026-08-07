-- Example: P&L for a given financial year and branch (or all branches)
WITH period_balance AS (
  SELECT 
    a.account_type,
    a.account_name,
    a.parent_id,
    SUM(jl.debit - jl.credit) AS balance  -- Income accounts normally have credit balance; we adjust sign
  FROM journal_entry_lines jl
  JOIN journal_entries je ON je.id = jl.journal_entry_id
  JOIN chart_of_accounts a ON a.id = jl.account_id
  WHERE je.entry_date BETWEEN '2025-04-01' AND '2026-03-31'  -- financial year
    AND je.branch_id = COALESCE(:branch_id, je.branch_id)    -- filter by branch
    AND je.organization_id = :org_id
  GROUP BY a.account_type, a.account_name, a.parent_id
)
SELECT 
  account_name,
  CASE 
    WHEN account_type = 'Income' THEN balance   -- positive revenue
    WHEN account_type = 'Expense' THEN -balance -- expenses as positive amounts
  END AS amount
FROM period_balance
WHERE account_type IN ('Income', 'Expense')
ORDER BY account_type, account_name;

SELECT 
  a.account_type,
  a.account_name,
  SUM(jl.debit - jl.credit) AS balance
FROM journal_entry_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
JOIN chart_of_accounts a ON a.id = jl.account_id
WHERE je.entry_date <= '2026-03-31'   -- up to reporting date
  AND je.organization_id = :org_id
  AND je.branch_id = COALESCE(:branch_id, je.branch_id)
GROUP BY a.account_type, a.account_name
HAVING a.account_type IN ('Asset', 'Liability', 'Equity')
ORDER BY a.account_type, a.account_name;

CREATE OR REPLACE FUNCTION get_pnl(
  p_org_id INT,
  p_fy_id BIGINT,
  p_branch_id BIGINT DEFAULT NULL
) RETURNS TABLE(
  category TEXT,
  account_name TEXT,
  amount NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  -- ...
END;
$$;

WITH income_expense AS (
  SELECT 
    a.account_name,
    a.account_type,
    a.parent_id,
    SUM(CASE WHEN a.account_type = 'Income' THEN jl.credit - jl.debit ELSE jl.debit - jl.credit END) AS balance
  FROM journal_entry_lines jl
  JOIN journal_entries je ON je.id = jl.journal_entry_id
  JOIN chart_of_accounts a ON a.id = jl.account_id
  WHERE je.entry_date BETWEEN :start_date AND :end_date
    AND je.organization_id = :org_id
    AND (je.branch_id = :branch_id OR :branch_id IS NULL)
  GROUP BY a.id
)
SELECT 
  CASE 
    WHEN account_type = 'Income' THEN 'Revenue'
    ELSE 'Expense'
  END AS section,
  account_name,
  balance
FROM income_expense
WHERE balance <> 0
ORDER BY section, balance DESC;