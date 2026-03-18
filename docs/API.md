# API Documentation

> **Project:** U.S. Ski & Snowboard — Athlete Connection Platform  
> **Last Updated:** 2026-03-18  
> **Base URL:** All Edge Functions are deployed under the Supabase project URL:  
> `https://<SUPABASE_PROJECT_ID>.supabase.co/functions/v1/`

---

## Authentication

Most endpoints require a **Bearer JWT** obtained from Supabase Auth:

```
Authorization: Bearer <supabase_access_token>
```

Public endpoints (marked below) do not require authentication.  
Admin-only endpoints additionally verify that the caller holds the `admin` role in the `user_roles` table.

---

## Endpoints

---

### POST `/submit-waitlist-application`

**Auth:** None (public)  
**Description:** Accepts a new waitlist application from a prospective athlete or partner.

#### Request body

```json
{
  "email": "string (required)",
  "full_name": "string (required)",
  "user_type": "athlete | employer (required)",
  "profile_data": "object (optional) — role-specific form data"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Application submitted successfully |
| `400` | Missing required fields or invalid `user_type` |
| `409` | Duplicate email — already pending or already approved |
| `500` | Internal server error |

#### Success response

```json
{ "success": true, "id": "<uuid>" }
```

---

### POST `/handle-waitlist-decision`

**Auth:** Admin JWT required  
**Description:** Approve or decline a waitlist applicant. On approval, creates the user account in Supabase Auth, sets up profile rows, and sends an invite email with a password-reset link.

#### Request body

```json
{
  "applicantId": "string (required) — waitlist_applicants.id",
  "action": "approve | decline (required)"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Decision processed successfully |
| `400` | Missing or invalid fields |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `404` | Applicant not found |
| `500` | Internal error (user creation, email send, etc.) |

#### Success response

```json
{ "success": true }
```

---

### POST `/invite-user`

**Auth:** Admin JWT required  
**Description:** Directly creates a user account and sends an invitation email. If the user already exists, updates their metadata and role.

#### Request body

```json
{
  "email": "string (required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "role": "athlete | employer (required)"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | User invited successfully |
| `400` | Missing required fields |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `500` | Internal error |

#### Success response

```json
{ "success": true, "userId": "<uuid>", "message": "Invitation sent" }
```

---

### POST `/delete-user`

**Auth:** Admin JWT required  
**Description:** Permanently deletes a user from Supabase Auth. All associated data (profiles, connections, documents, etc.) is removed via cascade.

#### Request body

```json
{
  "userId": "string (required) — UUID of the user to delete"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | User deleted successfully |
| `400` | Missing `userId`, invalid UUID format, or admin attempting self-deletion |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `500` | Auth deletion failed |

#### Success response

```json
{ "success": true, "message": "User and all associated data deleted successfully" }
```

---

### POST `/resend-confirmation`

**Auth:** Admin JWT required  
**Description:** Generates a new email confirmation (or magic link for already-registered users) and sends it to the specified email address.

#### Request body

```json
{
  "email": "string (required)"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Confirmation email sent |
| `400` | Missing email |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `500` | Link generation or email delivery failed |

#### Success response

```json
{ "success": true }
```

---

### POST `/send-temp-password`

**Auth:** Admin JWT required  
**Description:** Generates a random 12-character temporary password for the specified user, updates their account, and sends it via email.

#### Request body

```json
{
  "userId": "string (required) — UUID of the target user"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Temporary password sent |
| `400` | Missing `userId` |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `500` | Password update or email delivery failed |

#### Success response

```json
{ "success": true, "message": "Temporary password sent successfully" }
```

---

### POST `/send-role-notification`

**Auth:** Admin JWT required  
**Description:** Sends an email to a user informing them that a role has been granted or revoked.

#### Request body

```json
{
  "user_email": "string (required)",
  "new_role": "athlete | employer | admin (required)",
  "action": "grant | revoke (required)"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Notification email sent |
| `400` | Missing fields or invalid role value |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `500` | Email delivery failed |

#### Success response

```json
{ "success": true }
```

---

### POST `/scrape-news`

**Auth:** Admin JWT required  
**Description:** Scrapes the US Ski & Snowboard news page via the Firecrawl API and upserts extracted articles into the `news_articles` table.

#### Request body

```json
{}
```
*(No body required — the target URL is hardcoded to `https://www.usskiandsnowboard.org/news`)*

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Scrape completed; returns count of upserted articles |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `500` | Firecrawl error or DB upsert failure |

#### Success response

```json
{ "success": true, "count": 12 }
```

---

### POST `/ai-populate-profile`

**Auth:** User JWT required  
**Description:** Scrapes a provided URL via Firecrawl and passes the content to a Lovable AI model (Gemini/GPT) to extract structured profile data for an athlete or employer profile.

#### Request body

```json
{
  "role": "athlete | employer (required)",
  "url": "string (required) — URL to scrape",
  "name": "string (optional) — name hint for the AI"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Profile data extracted successfully |
| `400` | Missing `role` or `url` |
| `401` | Missing or invalid authorization |
| `500` | Scrape or AI extraction failed |

#### Success response (athlete example)

```json
{
  "bio": "...",
  "sport_discipline": "Alpine Skiing",
  "skills": ["leadership", "teamwork"],
  "career_interests": ["finance", "coaching"],
  "home_mountain": "Park City",
  "instagram_url": "https://instagram.com/...",
  "professional_highlights": "..."
}
```

---

### POST `/send-connection-notification`

**Auth:** Internal (called by other Edge Functions or trusted server-side code)  
**Description:** Sends email and/or SMS notifications to athletes and employers when a connection request is created, accepted, or declined. Also triggers admin notifications.

#### Request body

```json
{
  "notification_type": "new_request | request_accepted | request_declined (required)",
  "request_id": "string (required) — connection_requests.id"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Notifications dispatched |
| `400` | Missing fields |
| `500` | Notification delivery failed |

---

### POST `/send-admin-notification`

**Auth:** Internal  
**Description:** Notifies admins (based on their `notification_preferences`) of platform events: new user accounts, new connection requests, accepted connections, declined connections.

#### Request body

```json
{
  "type": "new_account | new_connection_request | connection_accepted | connection_declined (required)",
  "userId": "string (optional) — for new_account events",
  "requestId": "string (optional) — for connection events"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Admin notifications sent |
| `500` | Delivery error |

---

### POST `/send-admin-summary`

**Auth:** Admin JWT required  
**Description:** Sends a daily or weekly analytics digest email to admin users who have opted in. Includes signup trends, connection stats, and top profiles.

#### Request body

```json
{
  "frequency": "daily | weekly (optional, defaults to daily)"
}
```

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Summary emails sent |
| `401` | Missing or invalid authorization |
| `403` | Caller is not an admin |
| `500` | Data fetch or email delivery failed |

#### Success response

```json
{ "success": true, "sent": 3 }
```

---

### POST `/send-confirmation-email`

**Auth:** Supabase webhook signature (verified via `standardwebhooks`)  
**Description:** Called automatically by a Supabase Auth webhook when a new user signs up. Sends a branded HTML confirmation email with the verification link.

#### Request body

*Supabase webhook payload — handled internally; not called directly by the application.*

#### Responses

| Status | Meaning |
|--------|---------|
| `200` | Confirmation email sent |
| `400` | Not a POST request |
| `500` | Webhook verification or email delivery failed |

---

## Error response format

All endpoints return errors in the following shape:

```json
{ "error": "Human-readable error message" }
```

---

## CORS

All endpoints include the following CORS headers to support browser-originated requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

`OPTIONS` preflight requests are handled by all functions and return `200` immediately.
