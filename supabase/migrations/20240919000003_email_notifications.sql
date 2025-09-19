-- Create email_notifications table to track sent notifications
CREATE TABLE email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type TEXT NOT NULL,
    recipient_emails TEXT[] NOT NULL,
    subject TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sendgrid_response INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on email_notifications table
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for email_notifications (admin only)
CREATE POLICY "email_notifications_policy" ON email_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create function to send notification for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    lead_record RECORD;
    company_record RECORD;
    admin_emails TEXT[];
BEGIN
    -- Get lead information
    SELECT * INTO lead_record FROM leads WHERE id = NEW.lead_id;
    
    -- Get company information
    SELECT * INTO company_record FROM companies WHERE id = lead_record.company_id;
    
    -- Get admin emails for this company
    SELECT ARRAY_AGG(users.email) INTO admin_emails
    FROM users 
    WHERE users.company_id = lead_record.company_id 
    AND users.role IN ('admin', 'manager');
    
    -- Only send notification if we have admin emails
    IF array_length(admin_emails, 1) > 0 THEN
        -- Call the sendgrid-notifications edge function
        PERFORM
            net.http_post(
                url := 'https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/sendgrid-notifications',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.sendgrid_key', true)
                ),
                body := jsonb_build_object(
                    'type', 'new_message',
                    'messageData', jsonb_build_object(
                        'leadName', lead_record.first_name || ' ' || lead_record.last_name,
                        'leadEmail', lead_record.email,
                        'message', NEW.content,
                        'timestamp', NEW.created_at,
                        'companyName', company_record.name
                    ),
                    'recipientEmails', admin_emails
                )
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON notes;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON notes
    FOR EACH ROW
    WHEN (NEW.type = 'message')
    EXECUTE FUNCTION notify_new_message();

-- Create function to handle multiple new messages (batch notifications)
CREATE OR REPLACE FUNCTION notify_multiple_messages()
RETURNS void AS $$
DECLARE
    company_rec RECORD;
    message_count INTEGER;
    recent_messages RECORD;
    admin_emails TEXT[];
BEGIN
    -- Process each company separately
    FOR company_rec IN 
        SELECT DISTINCT c.id, c.name 
        FROM companies c
    LOOP
        -- Count new messages in last 5 minutes for this company
        SELECT COUNT(*) INTO message_count
        FROM notes n
        JOIN leads l ON n.lead_id = l.id
        WHERE l.company_id = company_rec.id
        AND n.type = 'message'
        AND n.created_at > NOW() - INTERVAL '5 minutes'
        AND NOT EXISTS (
            SELECT 1 FROM email_notifications en
            WHERE en.created_at > NOW() - INTERVAL '5 minutes'
            AND en.notification_type = 'multiple_messages'
        );
        
        -- If we have multiple messages, send batch notification
        IF message_count > 1 THEN
            -- Get admin emails for this company
            SELECT ARRAY_AGG(users.email) INTO admin_emails
            FROM users 
            WHERE users.company_id = company_rec.id 
            AND users.role IN ('admin', 'manager');
            
            IF array_length(admin_emails, 1) > 0 THEN
                -- Get recent message details
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'name', l.first_name || ' ' || l.last_name,
                        'email', l.email,
                        'message', n.content
                    )
                ) INTO recent_messages
                FROM notes n
                JOIN leads l ON n.lead_id = l.id
                WHERE l.company_id = company_rec.id
                AND n.type = 'message'
                AND n.created_at > NOW() - INTERVAL '5 minutes'
                LIMIT 5;
                
                -- Send batch notification
                PERFORM
                    net.http_post(
                        url := 'https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/sendgrid-notifications',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || current_setting('app.sendgrid_key', true)
                        ),
                        body := jsonb_build_object(
                            'type', 'multiple_messages',
                            'messageData', jsonb_build_object(
                                'count', message_count,
                                'leads', recent_messages,
                                'companyName', company_rec.name
                            ),
                            'recipientEmails', admin_emails
                        )
                    );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;