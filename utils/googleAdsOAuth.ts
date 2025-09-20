/**
 * Google OAuth2 integration for Google Ads authentication
 * Handles authentication flow and token management for multi-tenant Google Ads access
 */

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  canManageClients: boolean;
}

export class GoogleAdsOAuthService {
  private config: GoogleOAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_SECRET || '',
      redirectUri: process.env.REACT_APP_GOOGLE_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/adwords',
        'https://www.googleapis.com/auth/analytics.readonly'
      ]
    };
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state })
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        code
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OAuth token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Get user's Google Ads accounts
   */
  async getGoogleAdsAccounts(accessToken: string): Promise<GoogleAdsAccount[]> {
    // Note: This requires a server-side implementation due to CORS restrictions
    // For now, return mock data or use your backend API
    try {
      const response = await fetch('/api/google-ads/accounts', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Google Ads accounts');
      }

      return response.json();
    } catch (error) {
      console.warn('Google Ads accounts fetch not implemented server-side:', error);
      return [];
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke token (logout)
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Handle OAuth callback (extract code from URL)
   */
  handleCallback(): { code: string; state?: string; error?: string } | null {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      return { error, code: '', state: state || undefined };
    }

    if (code) {
      return { code, state: state || undefined };
    }

    return null;
  }
}

// Export singleton instance
export const googleAdsOAuthService = new GoogleAdsOAuthService();