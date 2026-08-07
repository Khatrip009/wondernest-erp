CREATE OR REPLACE FUNCTION generate_invoice_number(branch_id INT, financial_year_id INT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    year INT;
    counter INT;
    prefix TEXT;
BEGIN
    -- Use the invoice_counters table (already exists)
    year := EXTRACT(YEAR FROM CURRENT_DATE);
    prefix := 'INV-' || year || '-';

    -- Get next counter for this year
    INSERT INTO invoice_counters (year, counter)
    VALUES (year, 1)
    ON CONFLICT (year) DO UPDATE SET counter = invoice_counters.counter + 1
    RETURNING counter INTO counter;

    RETURN prefix || LPAD(counter::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_receipt_number(branch_id INT, financial_year_id INT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    next_id INT;
    prefix TEXT;
BEGIN
    -- Use a separate sequence for receipts
    SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM receipts;
    prefix := 'RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
    RETURN prefix || LPAD(next_id::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_invoice_for_fee(p_fee_id INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    fee_rec RECORD;
    inv_id INT;
    item_rec RECORD;
    tax_rate NUMERIC;
    cgst_rate NUMERIC;
    sgst_rate NUMERIC;
    igst_rate NUMERIC;
    place_of_supply TEXT;
    org_state TEXT;
    student_state TEXT;
    is_intra_state BOOLEAN;
    journal_id INT;
BEGIN
    -- Fetch fee, student, service, tax rate, and place of supply
    SELECT
        sf.id, sf.student_id, sf.service_id, sf.base_fee, sf.tax_rate,
        sf.tax_amount, sf.final_fee, sf.discount, sf.branch_id, sf.financial_year_id,
        s.state AS student_state,
        o.state_code AS org_state,
        inv.item_name, inv.description, inv.hsn_sac_code,
        tr.rate AS tax_rate_percentage
    INTO fee_rec
    FROM student_fees sf
    JOIN students s ON s.id = sf.student_id
    JOIN branches b ON b.id = sf.branch_id
    JOIN organization o ON o.id = b.organization_id
    JOIN inventory_items inv ON inv.id = sf.service_id
    LEFT JOIN tax_rates tr ON tr.id = inv.tax_rate_id
    WHERE sf.id = p_fee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student fee with id % not found', p_fee_id;
    END IF;

    -- Determine tax split
    student_state := fee_rec.student_state;
    org_state := fee_rec.org_state;
    is_intra_state := (student_state = org_state);

    tax_rate := COALESCE(fee_rec.tax_rate_percentage, 0);
    cgst_rate := 0;
    sgst_rate := 0;
    igst_rate := 0;

    IF tax_rate > 0 THEN
        IF is_intra_state THEN
            cgst_rate := tax_rate / 2;
            sgst_rate := tax_rate / 2;
        ELSE
            igst_rate := tax_rate;
        END IF;
    END IF;

    -- Generate invoice number
    -- We'll insert invoice and get id
    INSERT INTO invoices (
        invoice_number,
        invoice_date,
        student_id,
        due_date,
        gst_applicable,
        place_of_supply,
        total_taxable_amount,
        total_gst_amount,
        total_cess,
        grand_total,
        status,
        student_fee_id,
        branch_id,
        financial_year_id,
        organization_id,
        paid_amount,
        balance_due,
        total_cgst,
        total_sgst,
        total_igst,
        created_at,
        updated_at
    ) VALUES (
        generate_invoice_number(fee_rec.branch_id, fee_rec.financial_year_id),
        CURRENT_DATE,
        fee_rec.student_id,
        CURRENT_DATE + INTERVAL '30 days',  -- default due date
        (tax_rate > 0),
        student_state,  -- place of supply from student's state
        fee_rec.base_fee,
        fee_rec.tax_amount,
        0,
        fee_rec.final_fee,
        'Final',  -- set as Final immediately to recognise revenue
        p_fee_id,
        fee_rec.branch_id,
        fee_rec.financial_year_id,
        (SELECT organization_id FROM branches WHERE id = fee_rec.branch_id),
        0,  -- paid_amount initially
        fee_rec.final_fee,  -- balance_due
        (CASE WHEN is_intra_state THEN fee_rec.tax_amount * 0.5 ELSE 0 END),
        (CASE WHEN is_intra_state THEN fee_rec.tax_amount * 0.5 ELSE 0 END),
        (CASE WHEN NOT is_intra_state THEN fee_rec.tax_amount ELSE 0 END),
        NOW(),
        NOW()
    ) RETURNING id INTO inv_id;

    -- Insert invoice item (one item for the service)
    INSERT INTO invoice_items (
        invoice_id,
        item_type,
        description,
        hsn_sac_code,
        quantity,
        unit_price,
        taxable_amount,
        tax_rate_id,
        cgst_amount,
        sgst_amount,
        igst_amount,
        cess_amount,
        total_amount,
        branch_id,
        financial_year_id,
        organization_id
    ) VALUES (
        inv_id,
        'service',
        fee_rec.item_name || COALESCE(' - ' || fee_rec.description, ''),
        fee_rec.hsn_sac_code,
        1,
        fee_rec.base_fee,  -- unit price = base fee per unit (quantity 1)
        fee_rec.base_fee,
        (SELECT id FROM tax_rates WHERE rate = tax_rate LIMIT 1), -- tax_rate_id
        (CASE WHEN is_intra_state THEN fee_rec.tax_amount * 0.5 ELSE 0 END),
        (CASE WHEN is_intra_state THEN fee_rec.tax_amount * 0.5 ELSE 0 END),
        (CASE WHEN NOT is_intra_state THEN fee_rec.tax_amount ELSE 0 END),
        0,
        fee_rec.final_fee,
        fee_rec.branch_id,
        fee_rec.financial_year_id,
        (SELECT organization_id FROM branches WHERE id = fee_rec.branch_id)
    );

    -- 3. Create Journal Entry for Revenue Recognition (accrual)
    -- Debit Accounts Receivable, Credit Fee Income and Tax Payable
    INSERT INTO journal_entries (
        entry_date,
        reference,
        description,
        is_posted,
        branch_id,
        financial_year_id
    ) VALUES (
        CURRENT_DATE,
        'Invoice ' || (SELECT invoice_number FROM invoices WHERE id = inv_id),
        'Fee revenue for student fee #' || p_fee_id,
        TRUE,
        fee_rec.branch_id,
        fee_rec.financial_year_id
    ) RETURNING id INTO journal_id;

    -- Debit Accounts Receivable (asset)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        branch_id,
        financial_year_id
    ) VALUES (
        journal_id,
        (SELECT id FROM chart_of_accounts WHERE account_code = '1003' AND branch_id = fee_rec.branch_id AND financial_year_id = fee_rec.financial_year_id LIMIT 1),
        fee_rec.final_fee,
        0,
        'Accounts Receivable',
        fee_rec.branch_id,
        fee_rec.financial_year_id
    );

    -- Credit Fee Income
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        branch_id,
        financial_year_id
    ) VALUES (
        journal_id,
        (SELECT id FROM chart_of_accounts WHERE account_code = '4001' AND branch_id = fee_rec.branch_id AND financial_year_id = fee_rec.financial_year_id LIMIT 1),
        0,
        fee_rec.base_fee,
        'Fee Income',
        fee_rec.branch_id,
        fee_rec.financial_year_id
    );

    -- Credit Tax Payable (split into CGST/SGST/IGST Payable accounts)
    IF is_intra_state THEN
        -- Credit CGST Payable
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit,
            credit,
            description,
            branch_id,
            financial_year_id
        ) VALUES (
            journal_id,
            (SELECT id FROM chart_of_accounts WHERE account_code = '2504' AND branch_id = fee_rec.branch_id AND financial_year_id = fee_rec.financial_year_id LIMIT 1),
            0,
            fee_rec.tax_amount * 0.5,
            'CGST Payable',
            fee_rec.branch_id,
            fee_rec.financial_year_id
        );
        -- Credit SGST Payable
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit,
            credit,
            description,
            branch_id,
            financial_year_id
        ) VALUES (
            journal_id,
            (SELECT id FROM chart_of_accounts WHERE account_code = '2503' AND branch_id = fee_rec.branch_id AND financial_year_id = fee_rec.financial_year_id LIMIT 1),
            0,
            fee_rec.tax_amount * 0.5,
            'SGST Payable',
            fee_rec.branch_id,
            fee_rec.financial_year_id
        );
    ELSE
        -- Credit IGST Payable
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit,
            credit,
            description,
            branch_id,
            financial_year_id
        ) VALUES (
            journal_id,
            (SELECT id FROM chart_of_accounts WHERE account_code = '2505' AND branch_id = fee_rec.branch_id AND financial_year_id = fee_rec.financial_year_id LIMIT 1),
            0,
            fee_rec.tax_amount,
            'IGST Payable',
            fee_rec.branch_id,
            fee_rec.financial_year_id
        );
    END IF;

    -- Update invoice with journal_entry_id
    UPDATE invoices SET journal_entry_id = journal_id WHERE id = inv_id;

    RETURN inv_id;
END;
$$;

CREATE OR REPLACE FUNCTION process_fee_payment(p_data JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    p_fee_id INT;
    p_amount NUMERIC;
    p_payment_date DATE;
    p_payment_mode TEXT;
    p_transaction_no TEXT;
    p_remarks TEXT;
    p_generated_by UUID;
    p_branch_id INT;
    p_financial_year_id INT;

    fee_rec RECORD;
    inv_rec RECORD;
    pay_id INT;
    receipt_no TEXT;
    journal_id INT;
    new_paid_amount NUMERIC;
    new_balance_due NUMERIC;
    fee_status TEXT;
BEGIN
    -- Extract parameters
    p_fee_id := (p_data->>'student_fee_id')::INT;
    p_amount := (p_data->>'amount')::NUMERIC;
    p_payment_date := COALESCE((p_data->>'payment_date')::DATE, CURRENT_DATE);
    p_payment_mode := p_data->>'payment_mode';
    p_transaction_no := p_data->>'transaction_no';
    p_remarks := p_data->>'remarks';
    p_generated_by := (p_data->>'generated_by')::UUID;
    p_branch_id := (p_data->>'branch_id')::INT;
    p_financial_year_id := (p_data->>'financial_year_id')::INT;

    -- Ensure all required fields
    IF p_fee_id IS NULL OR p_amount IS NULL OR p_payment_mode IS NULL THEN
        RAISE EXCEPTION 'Missing required parameters: student_fee_id, amount, payment_mode';
    END IF;

    -- Fetch student_fee and related invoice
    SELECT * INTO fee_rec FROM student_fees WHERE id = p_fee_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student fee with id % not found', p_fee_id;
    END IF;

    -- If no invoice exists, generate one (should already exist)
    SELECT * INTO inv_rec FROM invoices WHERE student_fee_id = p_fee_id AND status IN ('Final', 'Partially Paid', 'Paid') ORDER BY id LIMIT 1;
    IF NOT FOUND THEN
        -- Generate invoice
        PERFORM generate_invoice_for_fee(p_fee_id);
        SELECT * INTO inv_rec FROM invoices WHERE student_fee_id = p_fee_id AND status = 'Final' ORDER BY id LIMIT 1;
    END IF;

    -- Insert payment
    INSERT INTO fee_payments (
        student_fee_id,
        payment_date,
        amount,
        payment_mode,
        transaction_no,
        remarks,
        branch_id,
        financial_year_id,
        generated_by,
        base_amount,
        tax_amount
    ) VALUES (
        p_fee_id,
        p_payment_date,
        p_amount,
        p_payment_mode,
        p_transaction_no,
        p_remarks,
        p_branch_id,
        p_financial_year_id,
        p_generated_by,
        -- base_amount and tax_amount are calculated based on the proportion of payment to total final fee
        (p_amount / fee_rec.final_fee) * fee_rec.base_fee,
        (p_amount / fee_rec.final_fee) * fee_rec.tax_amount
    ) RETURNING id INTO pay_id;

    -- Update student_fees paid_amount and balance
    new_paid_amount := fee_rec.paid_amount + p_amount;
    new_balance_due := fee_rec.final_fee - new_paid_amount;
    IF new_balance_due <= 0 THEN
        fee_status := 'Paid';
    ELSE
        fee_status := 'Partially Paid';
    END IF;

    UPDATE student_fees SET
        paid_amount = new_paid_amount,
        status = fee_status,
        updated_at = NOW()
    WHERE id = p_fee_id;

    -- Update invoice paid_amount and balance_due
    UPDATE invoices SET
        paid_amount = inv_rec.paid_amount + p_amount,
        balance_due = inv_rec.grand_total - (inv_rec.paid_amount + p_amount),
        status = CASE WHEN inv_rec.grand_total - (inv_rec.paid_amount + p_amount) <= 0 THEN 'Paid' ELSE 'Partially Paid' END,
        updated_at = NOW()
    WHERE id = inv_rec.id;

    -- Generate receipt number
    receipt_no := generate_receipt_number(p_branch_id, p_financial_year_id);

    -- Insert receipt
    INSERT INTO receipts (
        payment_id,
        receipt_no,
        receipt_date,
        student_id,
        amount,
        branch_id,
        financial_year_id
    ) VALUES (
        pay_id,
        receipt_no,
        p_payment_date,
        fee_rec.student_id,
        p_amount,
        p_branch_id,
        p_financial_year_id
    );

    -- Update fee_payments with receipt_number
    UPDATE fee_payments SET receipt_number = receipt_no WHERE id = pay_id;

    -- Link receipt to invoice (if needed)
    UPDATE invoices SET receipt_id = (SELECT id FROM receipts WHERE payment_id = pay_id) WHERE id = inv_rec.id;

    -- Create Journal Entry for Cash Receipt
    INSERT INTO journal_entries (
        entry_date,
        reference,
        description,
        is_posted,
        branch_id,
        financial_year_id
    ) VALUES (
        p_payment_date,
        'Receipt ' || receipt_no,
        'Payment received for fee #' || p_fee_id,
        TRUE,
        p_branch_id,
        p_financial_year_id
    ) RETURNING id INTO journal_id;

    -- Debit Cash/Bank (asset) – choose account based on payment_mode? For simplicity, use Cash (1001)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        branch_id,
        financial_year_id
    ) VALUES (
        journal_id,
        (SELECT id FROM chart_of_accounts WHERE account_code = '1001' AND branch_id = p_branch_id AND financial_year_id = p_financial_year_id LIMIT 1),
        p_amount,
        0,
        'Cash received',
        p_branch_id,
        p_financial_year_id
    );

    -- Credit Accounts Receivable
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description,
        branch_id,
        financial_year_id
    ) VALUES (
        journal_id,
        (SELECT id FROM chart_of_accounts WHERE account_code = '1003' AND branch_id = p_branch_id AND financial_year_id = p_financial_year_id LIMIT 1),
        0,
        p_amount,
        'Accounts Receivable',
        p_branch_id,
        p_financial_year_id
    );

    -- Return payment details
    RETURN jsonb_build_object(
        'payment_id', pay_id,
        'receipt_no', receipt_no,
        'invoice_id', inv_rec.id,
        'invoice_number', inv_rec.invoice_number,
        'student_fee_id', p_fee_id,
        'new_balance', new_balance_due,
        'status', fee_status
    );
END;
$$;

CREATE OR REPLACE FUNCTION trg_student_fee_after_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Automatically generate invoice for new fee
    PERFORM generate_invoice_for_fee(NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER student_fee_after_insert
AFTER INSERT ON student_fees
FOR EACH ROW EXECUTE FUNCTION trg_student_fee_after_insert();

