# Lead Machine Testing Checklist

## Mobile Responsiveness Testing

### Test Devices
- [ ] iPhone SE (375px width)
- [ ] iPhone 12/13/14 (390px width)
- [ ] Samsung Galaxy S20 (360px width)
- [ ] iPad (768px width)
- [ ] Desktop (1024px+ width)

### Components to Test

#### LeadCard.tsx
- [ ] Area code location displays correctly under phone number
- [ ] Call button is prominently sized (min 44px touch target)
- [ ] Text doesn't wrap awkwardly on narrow screens
- [ ] All buttons remain accessible and properly spaced

#### ActivityCallModal.tsx  
- [ ] Modal doesn't overflow viewport on mobile
- [ ] Content is readable without horizontal scrolling
- [ ] Buttons stack properly in portrait orientation
- [ ] Close button is easily accessible
- [ ] Location information displays correctly

#### Dashboard.tsx
- [ ] Default filter shows "New" leads on page load
- [ ] Filter dropdown works on mobile
- [ ] Lead grid adapts to screen size
- [ ] Search functionality works on all devices

#### ReportsModal.tsx
- [ ] Refresh button appears and functions correctly
- [ ] Report content is readable on mobile
- [ ] Loading states display properly
- [ ] PDF export works on mobile devices

## Webhook System Testing

### Authentication Testing
```bash
# Test without company ID (should fail)
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","email":"test@example.com"}'

# Test with invalid company ID (should fail)
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: invalid-uuid" \
  -d '{"firstName":"Test","email":"test@example.com"}'

# Test with valid company ID (should succeed)
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{"firstName":"Test","email":"test@example.com"}'
```

### Field Mapping Testing
```bash
# Test standard field names
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-123-4567",
    "company": "Test Corp",
    "message": "Standard fields test"
  }'

# Test alternative field names
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith", 
    "email_address": "jane@example.com",
    "telephone": "555-987-6543",
    "organization": "Alternative Corp",
    "comments": "Alternative field names test"
  }'

# Test name splitting
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "name": "Bob Johnson",
    "email": "bob@example.com",
    "message": "Name splitting test"
  }'
```

### UTM Parameter Testing
```bash
# Test UTM parameter capture
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "firstName": "UTM",
    "lastName": "Test",
    "email": "utm@example.com",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "spring2024",
    "utm_term": "lead generation",
    "utm_content": "ad1",
    "gclid": "abc123def456"
  }'
```

### Custom Fields Testing
```bash
# Test custom field storage
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "firstName": "Custom",
    "lastName": "Fields",
    "email": "custom@example.com",
    "budget_range": "10k-50k",
    "project_timeline": "Q2 2024",
    "industry": "Technology",
    "employee_count": "51-200"
  }'
```

### Duplicate Detection Testing
```bash
# Send same email twice within 24 hours
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "firstName": "Duplicate",
    "lastName": "Test1",
    "email": "duplicate@example.com",
    "message": "First submission"
  }'

# Wait a few seconds, then send again
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "firstName": "Duplicate", 
    "lastName": "Test2",
    "email": "duplicate@example.com",
    "message": "Second submission - should be detected as duplicate"
  }'
```

### Error Handling Testing
```bash
# Test missing required fields
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{
    "firstName": "Missing",
    "lastName": "Contact"
  }'

# Test malformed JSON
curl -X POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: YOUR_COMPANY_UUID" \
  -d '{"firstName":"Malformed","email":"test@example.com"'

# Test CORS preflight
curl -X OPTIONS https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,x-company-id"
```

## ElevenLabs Integration Testing

### Test Without Agent ID
- [ ] Remove or set invalid ElevenLabs agent ID in settings
- [ ] Verify system still functions normally
- [ ] Check that ElevenLabs features gracefully disable
- [ ] Ensure no errors appear in console
- [ ] Confirm other features remain unaffected

### Test With Valid Agent ID
- [ ] Configure valid ElevenLabs agent ID
- [ ] Test audio playback functionality
- [ ] Verify conversation features work
- [ ] Check error handling for API failures

## Area Code Location Testing

### Test Various Area Codes
- [ ] 212 (New York, NY) - should show "New York, NY"
- [ ] 310 (Los Angeles, CA) - should show "Los Angeles, CA"
- [ ] 416 (Toronto, ON) - should show "Toronto, ON"
- [ ] 555 (Fictional) - should handle gracefully
- [ ] International numbers - should handle gracefully

### Verify Display
- [ ] Location appears under phone number in LeadCard
- [ ] Location appears in ActivityCallModal
- [ ] Text formatting is consistent
- [ ] No layout breaks with long location names

## Browser Compatibility Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Feature-Specific Tests
- [ ] Modal overlays work correctly
- [ ] Touch targets are appropriately sized
- [ ] Scrolling behavior is smooth
- [ ] Form submissions work properly

## Performance Testing

### Load Time Testing
- [ ] Initial page load under 3 seconds
- [ ] Modal opening is responsive
- [ ] Button interactions feel immediate
- [ ] Large datasets load efficiently

### Memory Usage
- [ ] No memory leaks in long sessions
- [ ] Efficient rendering of large lead lists
- [ ] Proper cleanup of event listeners

## Accessibility Testing

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Modal traps focus appropriately

### Screen Reader Testing
- [ ] Content is properly announced
- [ ] Form fields have appropriate labels
- [ ] Status messages are communicated
- [ ] Error messages are clear

### Color Contrast
- [ ] All text meets WCAG AA standards
- [ ] Interactive elements have sufficient contrast
- [ ] Status indicators are distinguishable

## Data Validation Testing

### Lead Creation
- [ ] Webhook leads appear in dashboard
- [ ] All fields are correctly populated
- [ ] Custom fields are stored properly
- [ ] UTM data is captured accurately

### Duplicate Prevention
- [ ] Same email within 24 hours is detected
- [ ] Same phone within 24 hours is detected
- [ ] Existing lead ID is returned for duplicates
- [ ] No new record created for duplicates

### Error Reporting
- [ ] Invalid data is rejected gracefully
- [ ] Error messages are informative
- [ ] System remains stable after errors
- [ ] Logs contain sufficient detail for debugging

## Integration Testing

### Form Builders
- [ ] Test with Typeform
- [ ] Test with Google Forms
- [ ] Test with Wufoo
- [ ] Test with JotForm

### CMS Platforms
- [ ] WordPress Contact Form 7
- [ ] Drupal Webform
- [ ] Joomla forms
- [ ] Custom HTML forms

### Automation Platforms
- [ ] Zapier integration
- [ ] Make.com integration
- [ ] Direct API calls
- [ ] Webhook forwarding services

## Security Testing

### Input Sanitization
- [ ] XSS attempts are blocked
- [ ] SQL injection attempts are prevented
- [ ] Large payloads are handled safely
- [ ] Special characters are properly escaped

### Authentication
- [ ] Invalid company IDs are rejected
- [ ] Missing authentication is handled
- [ ] Rate limiting prevents abuse
- [ ] CORS policies are enforced

## Post-Deployment Checklist

### Monitor Logs
- [ ] Check Supabase function logs for errors
- [ ] Monitor webhook success/failure rates
- [ ] Watch for unusual traffic patterns
- [ ] Track response times

### User Feedback
- [ ] Collect feedback on mobile experience
- [ ] Monitor support tickets for issues
- [ ] Track user adoption of new features
- [ ] Measure webhook integration success

### Performance Metrics
- [ ] Page load times
- [ ] Mobile responsiveness scores
- [ ] Webhook processing speed
- [ ] Error rates

## Success Criteria

### Mobile Experience
- ✅ All modals display properly on mobile devices
- ✅ Touch targets meet 44px minimum size requirement
- ✅ Content is readable without zooming
- ✅ No horizontal scrolling required

### Webhook System
- ✅ Successfully processes various form formats
- ✅ Handles authentication properly
- ✅ Prevents duplicate leads effectively
- ✅ Captures marketing attribution data

### System Reliability
- ✅ Functions without ElevenLabs dependency
- ✅ Graceful error handling throughout
- ✅ No breaking changes to existing features
- ✅ Improved user experience overall