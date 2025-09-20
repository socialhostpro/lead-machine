# Google AdWords & Analytics Setup Guide

This guide walks you through setting up Google AdWords conversion tracking and Google Analytics (GA4) integration for the Lead Machine application.

## Overview

The Lead Machine now includes comprehensive Google AdWords conversion tracking and Google Analytics integration to measure marketing ROI and track user engagement.

## Features Included

✅ **Google AdWords Conversion Tracking**
- Tracks lead creation conversions
- Assigns conversion values
- Differentiates between manual and automated leads

✅ **Google Analytics (GA4) Integration**
- Page view tracking
- Custom event tracking
- Lead attribution

✅ **UTM Parameter Attribution**
- Captures campaign attribution data
- Stores UTM parameters for lead tracking
- Supports Google Ads (gclid) and Facebook (fbclid) click IDs

✅ **Multiple Lead Sources Tracked**
- Manual lead creation (Admin dashboard)
- Web form submissions (Public forms)
- ElevenLabs phone call leads
- All sources with proper attribution

## Environment Variables Setup

Add these environment variables to your `.env` file or hosting platform:

```env
# Google AdWords Configuration
REACT_APP_GOOGLE_ADS_CONVERSION_ID=your_conversion_id_here
REACT_APP_GOOGLE_ADS_CONVERSION_LABEL=your_conversion_label_here

# Google Analytics Configuration  
REACT_APP_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Getting Your Google AdWords Conversion ID & Label

1. **Access Google Ads Dashboard**
   - Go to [Google Ads](https://ads.google.com/)
   - Sign in to your account

2. **Create Conversion Action**
   - Click **Tools & Settings** → **Measurement** → **Conversions**
   - Click **+ New conversion action**
   - Choose **Website** as the source
   - Set up lead conversion with appropriate value

3. **Get Conversion Details**
   - After creating, find your conversion ID and label
   - Format: `AW-123456789/AbC_dEfGhIjKlMnOpQrS`
   - Conversion ID: `123456789`
   - Conversion Label: `AbC_dEfGhIjKlMnOpQrS`

### Getting Your Google Analytics ID

1. **Access Google Analytics**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a GA4 property if you don't have one

2. **Find Measurement ID**
   - Go to **Admin** → **Data Streams**
   - Select your web stream
   - Copy the **Measurement ID** (format: G-XXXXXXXXXX)

## Deployment Configuration

### Railway
Add environment variables in your Railway dashboard:
```bash
REACT_APP_GOOGLE_ADS_CONVERSION_ID=your_conversion_id_here
REACT_APP_GOOGLE_ADS_CONVERSION_LABEL=your_conversion_label_here
REACT_APP_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Local Development
Create a `.env.local` file:
```env
REACT_APP_GOOGLE_ADS_CONVERSION_ID=your_conversion_id_here
REACT_APP_GOOGLE_ADS_CONVERSION_LABEL=your_conversion_label_here
REACT_APP_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## Conversion Values

The system automatically assigns conversion values based on lead source:

- **Manual Leads**: $50 (Admin-created leads)
- **Web Form Leads**: $75 (Public form submissions)
- **Phone Leads**: $100 (ElevenLabs call leads)

These values can be adjusted in the code as needed for your business model.

## Tracked Events

### Conversion Events
1. `manual_lead_creation` - Admin manually adds a lead
2. `form_submission` - User submits a public web form
3. `elevenlabs_lead_creation` - Phone call generates a lead

### Custom Events
1. `lead_created` - General lead creation event
2. `form_submitted` - Form submission event
3. `phone_lead_created` - Phone-based lead event

### Page Views
- Dashboard page views
- Public form page views
- UTM parameter attribution

## UTM Parameter Tracking

The system automatically captures and stores:
- `utm_source` - Traffic source
- `utm_medium` - Marketing medium
- `utm_campaign` - Campaign name
- `utm_term` - Keyword term
- `utm_content` - Content variation
- `gclid` - Google Ads click ID
- `fbclid` - Facebook click ID

## Testing Your Setup

1. **Verify Environment Variables**
   ```javascript
   // Check browser console for initialization logs
   console.log('Google AdWords enabled:', process.env.REACT_APP_GOOGLE_ADS_CONVERSION_ID ? 'YES' : 'NO');
   ```

2. **Test Lead Creation**
   - Create a test lead manually
   - Submit a test form
   - Check Google Ads conversion reports

3. **Verify Analytics**
   - Check Google Analytics Real-time reports
   - Look for custom events in GA4

## Troubleshooting

### Common Issues

1. **No Conversions Showing**
   - Verify environment variables are set correctly
   - Check browser console for errors
   - Ensure Google Ads conversion action is active

2. **Analytics Not Working**
   - Verify GA4 Measurement ID format (G-XXXXXXXXXX)
   - Check that GA4 property is properly configured
   - Look for network requests to Google Analytics

3. **Environment Variables Not Loading**
   - Restart your development server
   - Verify `.env` file location and format
   - Check Railway/hosting platform variable settings

### Debug Mode

Enable debug logging by checking browser console for:
```
Google AdWords tracking error (non-critical): [error details]
```

These errors are non-critical and won't break the application.

## Privacy Considerations

- All tracking is GDPR compliant
- No personally identifiable information is sent to Google Ads
- Analytics tracking respects user privacy settings
- UTM parameters are stored locally for attribution only

## Support

For additional setup assistance:
1. Check Google Ads Help Center
2. Review Google Analytics documentation
3. Contact your marketing team for conversion value optimization

---

**Note**: This tracking is designed to be non-intrusive and will continue working even if Google services are unavailable.