# Website Form Webhook Integration Guide

## Overview
The Lead Machine webhook system allows you to automatically capture leads from any website form and sync them directly to your lead database. This enables seamless integration with your existing websites, landing pages, and third-party form builders.

## Webhook Endpoint
```
POST https://your-supabase-url.supabase.co/functions/v1/website-form-webhook
```

## Authentication
The webhook supports two authentication methods:

### 1. Company ID (Required)
Include your company ID in the request headers:
```
x-company-id: your-company-uuid
```

### 2. API Key (Optional but Recommended)
For additional security, set up an API key in your company settings and include it:
```
x-api-key: your-webhook-api-key
```

## Request Format

### Headers
```
Content-Type: application/json
x-company-id: your-company-uuid
x-api-key: your-webhook-api-key (optional)
```

### Body
Send form data as JSON. The webhook automatically maps common field names:

```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "phone": "+1-555-123-4567",
  "company": "Example Corp",
  "message": "I'm interested in your services",
  "utm_source": "google",
  "utm_campaign": "spring2024"
}
```

## Field Mapping
The webhook intelligently maps various field names to standard lead fields:

| Lead Field | Accepted Form Field Names |
|------------|---------------------------|
| firstName | firstName, first_name, fname, firstname, name |
| lastName | lastName, last_name, lname, lastname, surname |
| email | email, email_address, emailAddress, e_mail |
| phone | phone, telephone, mobile, cell, phoneNumber, phone_number |
| company | company, organization, business, companyName, company_name |
| message | message, comments, inquiry, description, details, notes |

### Automatic Name Splitting
If only a single "name" field is provided, it will be automatically split into firstName and lastName.

### UTM Parameter Support
The following UTM parameters are automatically captured if present:
- utm_source
- utm_medium  
- utm_campaign
- utm_term
- utm_content
- gclid (Google Click ID)

### Custom Fields
Any fields not matching standard mappings are stored as custom metadata and can be accessed in the lead details.

## Response Format

### Success Response (201 Created)
```json
{
  "success": true,
  "leadId": "uuid-of-created-lead",
  "message": "Lead created successfully"
}
```

### Duplicate Detection (200 OK)
```json
{
  "message": "Duplicate lead detected (same email/phone within 24 hours)",
  "leadId": "uuid-of-existing-lead"
}
```

### Error Response (400/401/500)
```json
{
  "error": "Error description",
  "details": "Additional error details"
}
```

## Integration Examples

### HTML Form with JavaScript
```html
<form id="leadForm">
  <input type="text" name="firstName" placeholder="First Name" required>
  <input type="text" name="lastName" placeholder="Last Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <input type="tel" name="phone" placeholder="Phone">
  <input type="text" name="company" placeholder="Company">
  <textarea name="message" placeholder="How can we help?"></textarea>
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById('leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  // Add UTM parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(param => {
    if (urlParams.get(param)) {
      data[param] = urlParams.get(param);
    }
  });
  
  try {
    const response = await fetch('https://your-supabase-url.supabase.co/functions/v1/website-form-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': 'your-company-uuid'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Thank you! We will contact you soon.');
      e.target.reset();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    alert('Network error. Please try again.');
  }
});
</script>
```

### WordPress Contact Form 7
Add this to your theme's functions.php:
```php
add_action('wpcf7_mail_sent', 'send_to_leadmachine_webhook');

function send_to_leadmachine_webhook($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    $posted_data = $submission->get_posted_data();
    
    $webhook_data = array(
        'firstName' => $posted_data['first-name'] ?? '',
        'lastName' => $posted_data['last-name'] ?? '',
        'email' => $posted_data['email'] ?? '',
        'phone' => $posted_data['phone'] ?? '',
        'company' => $posted_data['company'] ?? '',
        'message' => $posted_data['message'] ?? '',
        'utm_source' => $_GET['utm_source'] ?? '',
        'utm_campaign' => $_GET['utm_campaign'] ?? ''
    );
    
    wp_remote_post('https://your-supabase-url.supabase.co/functions/v1/website-form-webhook', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-company-id' => 'your-company-uuid'
        ),
        'body' => json_encode($webhook_data)
    ));
}
```

### Zapier Integration
1. Create a new Zap
2. Choose your form platform as the trigger
3. Add a Webhook action
4. Configure the webhook:
   - URL: `https://your-supabase-url.supabase.co/functions/v1/website-form-webhook`
   - Method: POST
   - Headers: 
     - `Content-Type: application/json`
     - `x-company-id: your-company-uuid`
   - Body: Map form fields to JSON payload

### Make.com (Integromat) Integration
1. Create a new scenario
2. Add your form platform as the trigger module
3. Add HTTP module with these settings:
   - URL: `https://your-supabase-url.supabase.co/functions/v1/website-form-webhook`
   - Method: POST
   - Headers: 
     ```json
     {
       "Content-Type": "application/json",
       "x-company-id": "your-company-uuid"
     }
     ```
   - Body: Map trigger outputs to webhook fields

## Testing Your Webhook

### Using cURL
```bash
curl -X POST \
  https://your-supabase-url.supabase.co/functions/v1/website-form-webhook \
  -H "Content-Type: application/json" \
  -H "x-company-id: your-company-uuid" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "555-123-4567",
    "message": "This is a test submission"
  }'
```

### Using Postman
1. Create a new POST request
2. Set URL to your webhook endpoint
3. Add headers:
   - `Content-Type: application/json`
   - `x-company-id: your-company-uuid`
4. Set body to raw JSON with test data
5. Send request and verify lead appears in your dashboard

## Security Features

### Duplicate Prevention
- Automatically detects duplicate leads based on email or phone
- Prevents spam submissions (24-hour window)
- Returns success response for duplicates to prevent form errors

### Input Validation
- Requires either email or phone number
- Sanitizes and validates all input data
- Handles malformed requests gracefully

### Rate Limiting
Consider implementing rate limiting at your load balancer or CDN level to prevent abuse.

## Troubleshooting

### Common Issues

#### 401 Unauthorized
- Check that your company ID is correct
- Verify API key if you have one set
- Ensure company exists in the system

#### 400 Bad Request
- Verify JSON format is valid
- Ensure either email or phone is provided
- Check that required headers are included

#### 500 Internal Server Error
- Check Supabase logs for detailed error information
- Verify database connectivity
- Ensure all required environment variables are set

### Debugging Tips

#### Enable Logging
Monitor your webhook calls in the Supabase dashboard under Functions logs.

#### Test with Simple Data
Start with minimal required fields and gradually add complexity.

#### Verify Company Setup
Ensure your company record exists and has the correct configuration.

## Advanced Configuration

### Custom Field Handling
Any form fields not matching standard mappings are stored as custom metadata:
```json
{
  "budget_range": "10k-50k",
  "project_timeline": "Q2 2024",
  "preferred_contact": "email"
}
```

These appear in the lead details as custom fields.

### Notification Settings
Configure email notifications in your Lead Machine settings to receive alerts for new webhook leads.

### Webhook Security
For production use, consider:
- Setting up API keys for authentication
- Using HTTPS only
- Implementing request signing for enhanced security
- Rate limiting at the infrastructure level

## Support
For technical support or questions about webhook integration, contact your Lead Machine administrator or check the system logs for detailed error information.