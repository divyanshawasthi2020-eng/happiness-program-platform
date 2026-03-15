# API Reference

Base URL: `http://localhost:3001/api`

All protected endpoints require: `Authorization: Bearer <token>`

---

## Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/login` | `{name, code}` | Login or auto-register on first use |
| POST | `/auth/logout` | — | Revoke current session token |
| GET | `/auth/me` | — | Get current teacher profile |

**Login response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "teacher": {
    "id": "uuid",
    "name": "Meera Sharma",
    "code": "MEERA2024",
    "email": "meera@email.com",
    "city": "Mumbai",
    "waNumber": "919876543210",
    "orgLink": "https://...",
    "role": "TEACHER"
  }
}
```

---

## Leads

| Method | Endpoint | Description |
|---|---|---|
| GET | `/leads` | List leads (paginated, filterable) |
| GET | `/leads/stats` | Funnel + source + interest aggregate counts |
| POST | `/leads` | Create single lead |
| PUT | `/leads/:id` | Update lead |
| DELETE | `/leads/:id` | Delete lead |
| POST | `/leads/bulk-import` | Import array of leads (deduplication by phone) |
| POST | `/leads/bulk-delete` | Delete by ID array |

**GET /leads query params:**
```
page=1, limit=50, status=NEW, interest=HOT, source=INSTAGRAM,
courseId=uuid, search=priya, sortBy=createdAt, sortOrder=desc
```

**Lead object:**
```json
{
  "id": "uuid",
  "teacherId": "uuid",
  "courseId": "uuid | null",
  "name": "Priya Sharma",
  "phone": "9876543210",
  "email": "priya@email.com",
  "city": "Mumbai",
  "source": "INSTAGRAM",
  "interest": "HOT",
  "status": "REGISTERED",
  "notes": "Referred by Rahul",
  "importedAt": "2026-04-01T00:00:00Z",
  "createdAt": "2026-04-01T10:00:00Z"
}
```

**Source enum:** `INSTAGRAM | WHATSAPP | GOOGLE_FORM | REFERRAL | OFFLINE | IMPORT | WEBSITE`
**Interest enum:** `HOT | WARM | COLD`
**Status enum:** `NEW | CONTACTED | REGISTERED | COMPLETED | DROPPED`

---

## Courses

| Method | Endpoint | Description |
|---|---|---|
| GET | `/courses` | List teacher's courses |
| POST | `/courses` | Create course (`{city, courseDate, seats?, venue?}`) |
| PUT | `/courses/:id` | Update course |
| DELETE | `/courses/:id` | Archive course |

---

## Campaigns

| Method | Endpoint | Description |
|---|---|---|
| GET | `/campaigns` | List campaigns with template/course info |
| POST | `/campaigns` | Create campaign |
| POST | `/campaigns/:id/start` | Start — returns WA links or starts email |
| POST | `/campaigns/:id/log-sent` | Log WA message sent for a lead |
| POST | `/campaigns/:id/pause` | Pause running campaign |
| DELETE | `/campaigns/:id` | Delete campaign |

**POST /campaigns body:**
```json
{
  "name": "Mumbai April — Final reminder",
  "templateId": "uuid",
  "courseId": "uuid",
  "channel": "WHATSAPP",
  "filterStatus": "CONTACTED",
  "filterInterest": "HOT",
  "delayMs": 4000,
  "scheduledAt": "2026-04-10T09:00:00Z"
}
```

**POST /campaigns/:id/start response (WhatsApp):**
```json
{
  "type": "whatsapp_links",
  "campaignId": "uuid",
  "delayMs": 4000,
  "links": [
    {
      "leadId": "uuid",
      "name": "Priya Sharma",
      "phone": "919876543210",
      "url": "https://wa.me/919876543210?text=Namaste%20Priya...",
      "msg": "Namaste Priya! ..."
    }
  ]
}
```

---

## Templates

| Method | Endpoint | Description |
|---|---|---|
| GET | `/templates` | List (own + shared + global) |
| POST | `/templates` | Create template |
| PUT | `/templates/:id` | Update (own templates only) |
| DELETE | `/templates/:id` | Soft-delete (own only) |
| POST | `/templates/:id/preview` | Preview with sample data |

**Template variables:** `{Name}` `{City}` `{CourseDate}` `{TeacherName}` `{OrgLink}`

**Channel enum:** `WHATSAPP | EMAIL | BOTH`
**Category enum:** `NURTURE | REMINDER | POST_COURSE | TESTIMONIAL | ANNOUNCEMENT`

---

## Upload

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload/leads` | Parse CSV/Excel → return rows preview (no DB write) |
| GET | `/upload/template` | Download blank Excel template |

Form-data: `file` field with `.csv`, `.xlsx`, or `.xls`

**Response:**
```json
{
  "rows": [...],
  "count": 47,
  "preview": [first 5 rows]
}
```

Then call `POST /leads/bulk-import` with the full `rows` array.

---

## Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/overview` | Full stats: totals, conversion, by-status/source/interest, campaign summary |
| GET | `/analytics/leads-over-time` | 12-week lead growth time series |
| GET | `/analytics/course/:id` | Per-course breakdown |
| GET | `/analytics/campaigns` | Campaign performance table |

---

## Export

| Method | Endpoint | Description |
|---|---|---|
| GET | `/export/leads.xlsx` | Export leads as Excel |
| GET | `/export/leads.csv` | Export leads as CSV |
| GET | `/export/leads.json` | Export leads as JSON |
| GET | `/export/campaigns.xlsx` | Export campaigns as Excel |
| GET | `/export/campaigns.csv` | Export campaigns as CSV |
| GET | `/export/full-backup.json` | Full data backup (all models) |

**Query params for leads export:** `courseId=uuid`, `status=REGISTERED`, `interest=HOT`, `source=INSTAGRAM`

---

## Teachers (profile)

| Method | Endpoint | Description |
|---|---|---|
| PUT | `/teachers/me` | Update name, email, city, phone, waNumber, orgLink |
| PUT | `/teachers/me/smtp` | Save + verify SMTP config |
| POST | `/teachers/me/smtp/test` | Send test email (`{to: "email"}`) |

---

## Posters

| Method | Endpoint | Description |
|---|---|---|
| GET | `/posters/templates` | List built-in poster templates |
| GET | `/posters` | List teacher's posters |
| POST | `/posters` | Create poster record |
| PUT | `/posters/:id` | Update poster fields |
| DELETE | `/posters/:id` | Delete poster |
| GET | `/posters/canva-auth-url` | Get Canva OAuth URL |
| POST | `/posters/:id/open-in-canva` | Get Canva deep-link for this poster |

---

## Reminders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reminders` | List reminders |
| POST | `/reminders` | Create reminder (`{time, frequency, text}`) |
| PUT | `/reminders/:id` | Update / toggle active |
| DELETE | `/reminders/:id` | Delete |

**Frequency enum:** `DAILY | WEEKLY | ONCE`

---

## WhatsApp / WA-JS

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/wa/qr` | None | Get QR code string + ready status for WA-JS |

---

## Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server status, version, WA-JS state |

---

## Error responses

All errors return:
```json
{
  "error": "Human-readable message"
}
```

Validation errors return:
```json
{
  "errors": [
    { "field": "name", "msg": "Name is required" }
  ]
}
```

**HTTP status codes:**
- `200` Success
- `201` Created
- `400` Bad request / validation error
- `401` Unauthenticated (missing or expired token)
- `403` Forbidden (teacher trying to access another teacher's data)
- `404` Not found
- `429` Rate limited
- `500` Server error
