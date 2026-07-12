# Zoom Local Test Setup

This document explains how to set up and test the Zoom integration for MindWorks in a local development environment.

## 1. Create a Zoom General App
1. Log in to the [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Select **Develop** -> **Build App**.
3. Choose **General App** and click **Create**.
4. Select **User-managed OAuth** as the authentication method.

## 2. Configure OAuth
1. In the **App Credentials** section, note your `Client ID` and `Client Secret`.
2. In the **Redirect URL for OAuth** field, enter your development redirect URL:
   - Example: `http://localhost:3000/api/zoom/callback`
3. Add the same URL to the **OAuth Allow List**.

## 3. Select Scopes
Add the following minimum required scopes:
- `user:read`: To identify the authorized user and their email.
- `meeting:read`: To read upcoming scheduled meetings.

*Note: These scopes are read-only and do not allow creating or deleting meetings.*

## 4. Environment Variables
Set the following server-side environment variables in your local environment (e.g., `.env.local` or your serverless provider's dashboard):

```env
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_REDIRECT_URI=http://localhost:3000/api/zoom/callback
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 5. Add App via Local Test
1. Go to the **Local Test** tab in your Zoom App settings.
2. Click **Add App** to authorize the app on your own Zoom account.

## 6. Testing the Integration
1. Start the local application: `npm run dev`.
2. Open the application and click the **Settings** (⚙️) icon in the top bar.
3. Navigate to **Calendar & Video**.
4. Click **Connect Zoom** (Note: This button is disabled in Phase 1 until the backend is fully implemented).
5. Once Phase 2 is complete, the "Connect Zoom" button will initiate the OAuth flow.
6. After authorization, upcoming meetings should appear in **Today’s Schedule**.

## Troubleshooting
- **Redirect Mismatch**: Ensure the `ZOOM_REDIRECT_URI` exactly matches the URL in your Zoom App settings.
- **Invalid State**: Ensure the `state` parameter is being correctly generated and validated server-side.
- **Expired Token**: The backend will automatically handle token refresh using the stored `refresh_token`.
- **Missing Scopes**: If meetings don't appear, verify that `meeting:read` was correctly requested and granted.
