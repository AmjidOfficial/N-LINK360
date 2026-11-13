-- ==============================================================================
-- N-LINK 360 Enterprise ERP: Migration 012
-- Automatic Ledger Entry Creation Engine via PostgreSQL Database Triggers
-- Automatically generates immutable Debit/Credit ledger entries when:
-- 1. An Invoice status transitions to 'POSTED' or 'APPROVED' (Debit Entry)
-- 2. A Recovery payment status transitions to 'APPROVED' or 'VERIFIED' (Credit Entry)
-- ==============================================================================

-- 1. Database Trigger Function for Automatic Invoice Ledger Entry
CREATE OR REPLACE FUNCTION public.trg_fn_auto_create_invoice_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_running numeric(18,2);
    v_employee uuid;
    v_ledger_code text;
BEGIN
    -- Only trigger when invoice transitions to POSTED or APPROVED status
    IF (NEW.status IN ('POSTED', 'APPROVED')) THEN
        -- Prevent duplicate ledger creation if entry already exists for this invoice
        IF NOT EXISTS (
            SELECT 1 FROM public.ledger_entries 
            WHERE reference_type = 'INVOICE' AND reference_id = NEW.id
        ) THEN
            -- Calculate current customer balance
            v_running := public.nlink_customer_balance(NEW.customer_id) + NEW.invoice_amount;
            v_employee := COALESCE(NEW.posted_by, public.nlink_current_employee_id());
            v_ledger_code := 'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0');

            INSERT INTO public.ledger_entries (
                ledger_code,
                customer_id,
                entry_date,
                reference_type,
                reference_id,
                debit,
                credit,
                running_balance,
                posted_by,
                remarks
            ) VALUES (
                v_ledger_code,
                NEW.customer_id,
                NOW(),
                'INVOICE',
                NEW.id,
                NEW.invoice_amount,
                0,
                v_running,
                v_employee,
                'Auto-generated ledger debit upon invoice approval/posting (' || NEW.invoice_code || ')'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Database Trigger Function for Automatic Recovery Payment Ledger Entry
CREATE OR REPLACE FUNCTION public.trg_fn_auto_create_recovery_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_running numeric(18,2);
    v_employee uuid;
    v_ledger_code text;
BEGIN
    -- Only trigger when recovery payment transitions to APPROVED or VERIFIED status
    IF (NEW.status IN ('APPROVED', 'VERIFIED')) THEN
        -- Prevent duplicate ledger creation if entry already exists for this recovery
        IF NOT EXISTS (
            SELECT 1 FROM public.ledger_entries 
            WHERE reference_type = 'RECOVERY' AND reference_id = NEW.id
        ) THEN
            -- Calculate new customer balance after credit adjustment
            v_running := public.nlink_customer_balance(NEW.customer_id) - NEW.amount;
            v_employee := COALESCE(NEW.verified_by, NEW.employee_id, public.nlink_current_employee_id());
            v_ledger_code := 'LED-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('nlink_ledger_seq')::text, 6, '0');

            INSERT INTO public.ledger_entries (
                ledger_code,
                customer_id,
                entry_date,
                reference_type,
                reference_id,
                debit,
                credit,
                running_balance,
                posted_by,
                remarks
            ) VALUES (
                v_ledger_code,
                NEW.customer_id,
                NOW(),
                'RECOVERY',
                NEW.id,
                0,
                NEW.amount,
                v_running,
                v_employee,
                'Auto-generated ledger credit upon recovery verification/approval (' || COALESCE(NEW.recovery_code, NEW.id::text) || ')'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Attach Database Triggers to Invoices and Recoveries Tables
DROP TRIGGER IF EXISTS trg_auto_ledger_invoice ON public.invoices;
CREATE TRIGGER trg_auto_ledger_invoice
    AFTER INSERT OR UPDATE OF status ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_auto_create_invoice_ledger();

DROP TRIGGER IF EXISTS trg_auto_ledger_recovery ON public.recoveries;
CREATE TRIGGER trg_auto_ledger_recovery
    AFTER INSERT OR UPDATE OF status ON public.recoveries
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_auto_create_recovery_ledger();
