-- ==============================================================================
-- N-LINK 360 Enterprise ERP: Migration 011
-- Server-Side Google Sheets Synchronization via Supabase Database Webhooks & Triggers
-- Target Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
-- ==============================================================================

-- 1. Create a log table for all outbound Google Sheet replication events
CREATE TABLE IF NOT EXISTS google_sheets_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, SYNCED, FAILED
    spreadsheet_id VARCHAR(150) DEFAULT '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gs_sync_status ON google_sheets_sync_logs(status, created_at DESC);

-- 2. Trigger Function to queue confirmed transactions
CREATE OR REPLACE FUNCTION queue_transaction_for_google_sheets()
RETURNS TRIGGER AS $$
BEGIN
    -- Only mirror confirmed or approved state transitions
    IF (TG_TABLE_NAME = 'sales_orders' AND NEW.status IN ('CONFIRMED', 'BOOKED', 'APPROVED', 'DISPATCHED', 'DELIVERED')) OR
       (TG_TABLE_NAME = 'recoveries' AND NEW.status IN ('COLLECTED', 'VERIFIED', 'DEPOSITED')) OR
       (TG_TABLE_NAME = 'customers' AND NEW.is_active = TRUE) THEN
       
        INSERT INTO google_sheets_sync_logs (
            event_type,
            entity_type,
            entity_id,
            payload,
            status
        ) VALUES (
            TG_OP,
            TG_TABLE_NAME,
            NEW.id::text,
            to_jsonb(NEW),
            'QUEUED'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Database Triggers to Key Entity Tables
DROP TRIGGER IF EXISTS trg_gs_sync_orders ON sales_orders;
CREATE TRIGGER trg_gs_sync_orders
    AFTER INSERT OR UPDATE OF status ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION queue_transaction_for_google_sheets();

DROP TRIGGER IF EXISTS trg_gs_sync_recoveries ON recoveries;
CREATE TRIGGER trg_gs_sync_recoveries
    AFTER INSERT OR UPDATE OF status ON recoveries
    FOR EACH ROW
    EXECUTE FUNCTION queue_transaction_for_google_sheets();

DROP TRIGGER IF EXISTS trg_gs_sync_customers ON customers;
CREATE TRIGGER trg_gs_sync_customers
    AFTER INSERT OR UPDATE OF is_active ON customers
    FOR EACH ROW
    EXECUTE FUNCTION queue_transaction_for_google_sheets();
