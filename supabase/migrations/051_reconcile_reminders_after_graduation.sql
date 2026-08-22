-- ==============================================================================
-- Migration: 051_reconcile_reminders_after_graduation.sql
-- Description: Idempotent database reconciliation cancelling stale reminder notifications
--              for documents that expire after the student's expected graduation date.
-- Dependencies: 006_notifications.sql, 041_expand_reminders_to_all_documents.sql, 049_v020_phone_numbers_and_reminder_boundary.sql
-- ==============================================================================

DO $$
DECLARE
    cancelled_count INT := 0;
BEGIN
    RAISE NOTICE '[MIGRATION_051] Initiating historical document reminder reconciliation against graduation dates...';

    -- 1. Identify and cancel all queued / pending / sending notifications where document expiry is strictly after student graduation date
    WITH stale_notifications AS (
        SELECT 
            n.id AS notification_id,
            n.student_id,
            n.document_type,
            n.idempotency_key,
            sa.expected_graduation,
            CASE 
                WHEN n.document_type = 'passport' THEN COALESCE(pv.expiry_date, ss.passport_expiry)
                WHEN n.document_type = 'visa' THEN COALESCE(vv.expiry_date, ss.visa_expiry)
                WHEN n.document_type = 'efrro' THEN COALESCE(ev.expiry_date, ss.efrro_expiry)
                ELSE NULL
            END AS effective_expiry
        FROM public.notifications n
        JOIN public.student_academic sa ON sa.student_id = n.student_id
        LEFT JOIN public.student_snapshot ss ON ss.student_id = n.student_id
        LEFT JOIN LATERAL (
            SELECT expiry_date FROM public.passport_versions 
            WHERE student_id = n.student_id AND is_active = true AND deleted_at IS NULL 
            ORDER BY created_at DESC LIMIT 1
        ) pv ON n.document_type = 'passport'
        LEFT JOIN LATERAL (
            SELECT expiry_date FROM public.visa_versions 
            WHERE student_id = n.student_id AND is_active = true AND deleted_at IS NULL 
            ORDER BY created_at DESC LIMIT 1
        ) vv ON n.document_type = 'visa'
        LEFT JOIN LATERAL (
            SELECT expiry_date FROM public.efrro_versions 
            WHERE student_id = n.student_id AND is_active = true AND deleted_at IS NULL 
            ORDER BY created_at DESC LIMIT 1
        ) ev ON n.document_type = 'efrro'
        WHERE n.status IN ('queued', 'sending', 'processing')
          AND sa.expected_graduation IS NOT NULL
          AND CASE 
                WHEN n.document_type = 'passport' THEN COALESCE(pv.expiry_date, ss.passport_expiry)
                WHEN n.document_type = 'visa' THEN COALESCE(vv.expiry_date, ss.visa_expiry)
                WHEN n.document_type = 'efrro' THEN COALESCE(ev.expiry_date, ss.efrro_expiry)
                ELSE NULL
              END IS NOT NULL
          AND (
            CASE 
                WHEN n.document_type = 'passport' THEN COALESCE(pv.expiry_date, ss.passport_expiry)
                WHEN n.document_type = 'visa' THEN COALESCE(vv.expiry_date, ss.visa_expiry)
                WHEN n.document_type = 'efrro' THEN COALESCE(ev.expiry_date, ss.efrro_expiry)
                ELSE NULL
            END
          ) > sa.expected_graduation
    ),
    updated_rows AS (
        UPDATE public.notifications n
        SET 
            status = 'cancelled',
            updated_at = NOW(),
            notification_context = COALESCE(n.notification_context, '{}'::jsonb) || jsonb_build_object(
                'cancellation_reason', 'DOCUMENT_EXPIRES_AFTER_GRADUATION',
                'cancelled_at', NOW()::text,
                'cancelled_by', 'migration_051_reconciliation'
            )
        FROM stale_notifications sn
        WHERE n.id = sn.notification_id
        RETURNING n.id
    )
    SELECT COUNT(*) INTO cancelled_count FROM updated_rows;

    -- 2. Insert audit delivery logs for newly cancelled notifications
    INSERT INTO public.notification_delivery_log (
        notification_id,
        attempt_number,
        status,
        gateway_response,
        error_message,
        created_at
    )
    SELECT 
        n.id,
        COALESCE(n.retry_count, 0) + 1,
        'cancelled',
        jsonb_build_object(
            'reason', 'DOCUMENT_EXPIRES_AFTER_GRADUATION',
            'action', 'RECONCILIATION_MIGRATION'
        ),
        'Cancelled during database reconciliation: Document expiry date is strictly after student expected graduation date.',
        NOW()
    FROM public.notifications n
    WHERE n.status = 'cancelled'
      AND n.notification_context->>'cancelled_by' = 'migration_051_reconciliation'
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_delivery_log ndl 
        WHERE ndl.notification_id = n.id AND ndl.status = 'cancelled'
      );

    RAISE NOTICE '[MIGRATION_051_SUCCESS] Successfully reconciled historical notifications. Stale notifications cancelled: %', cancelled_count;
END $$;
