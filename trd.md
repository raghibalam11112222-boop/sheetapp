# SheetApp — Technical Requirements Document

## 1. Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Responsive UI

### Backend

* Next.js server actions/API routes
* PostgreSQL
* Prisma

### Authentication

Use a secure authentication provider or implementation.

All dashboard routes must be protected.

### File Processing

Support:

* `.xlsx`
* `.xls`
* `.csv`

Use a reliable spreadsheet parsing library.

## 2. Architecture

```text
Frontend
   ↓
Next.js API / Server Actions
   ↓
Authentication
   ↓
Business Logic
   ↓
PostgreSQL
   ↓
Prisma
```

Spreadsheet flow:

```text
Upload
  ↓
File Validation
  ↓
Spreadsheet Parser
  ↓
Deterministic Analysis
  ↓
AI Schema Analysis
  ↓
Schema Validation
  ↓
Database Generation
  ↓
Data Import
  ↓
Generated App
```

## 3. Database

Core models:

```text
User
Organization
Membership
Application
DataSource
GeneratedTable
GeneratedField
Record
Relationship
Invitation
AuditLog
```

Every organization-owned resource must contain an organization/workspace relationship.

## 4. Multi-Tenancy

Every database query must be scoped to the authenticated organization.

Never trust an organization ID supplied directly by the client.

Authorization must be performed server-side.

## 5. Spreadsheet Analysis

Extract:

* Sheet names
* Headers
* Row count
* Column types
* Sample values
* Empty fields
* Duplicate rows
* Potential identifiers
* Relationships
* Formulas

Never execute spreadsheet formulas as code.

## 6. AI Layer

Create an abstraction:

```text
AIProvider
├── analyzeSchema()
├── suggestRelationships()
└── generateMetadata()
```

AI responses must use structured JSON.

Validate AI output before using it.

AI must not directly modify the production database without validation.

## 7. Generated Schema

Example:

```text
Customer
- id
- name
- company
- email
- phone
- status
- revenue

Order
- id
- customerId
- amount
- status
- createdAt
```

## 8. Generated UI

The frontend should be metadata-driven.

Example:

```text
Database Schema
      ↓
UI Configuration
      ↓
Reusable Components
      ↓
Generated Application
```

Do not generate separate hardcoded React applications for every spreadsheet.

## 9. CRUD

Every generated table must support:

* Create
* Read
* Update
* Delete

Use server-side validation.

## 10. Search

Support:

* Search
* Filtering
* Sorting
* Pagination

Use server-side queries for large datasets.

## 11. Security

Required:

* Authentication
* Authorization
* Input validation
* File validation
* Rate limiting
* Secure cookies/session handling
* SQL injection protection
* XSS protection
* CSRF protection where applicable
* No frontend secrets
* Organization-level isolation

## 12. API Requirements

Core endpoints/actions:

```text
POST   /api/upload
POST   /api/analyze
POST   /api/schema
POST   /api/app/generate

GET    /api/apps
GET    /api/apps/:id

GET    /api/tables/:id/records
POST   /api/tables/:id/records
PATCH  /api/records/:id
DELETE /api/records/:id

GET    /api/team
POST   /api/team/invite
PATCH  /api/team/:id
DELETE /api/team/:id
```

Use server actions where appropriate instead of unnecessary REST endpoints.

## 13. Performance

* Lazy-load large datasets
* Paginate records
* Avoid sending complete spreadsheets to the browser
* Cache appropriate metadata
* Keep AI requests small
* Use background processing architecture for future large files

## 14. Environment Variables

Keep secrets server-side.

Provide:

```text
DATABASE_URL=
AUTH_SECRET=
AI_API_KEY=
```

in `.env.example`.

Never commit `.env`.

## 15. Testing

Test:

1. Authentication
2. File upload
3. Spreadsheet parsing
4. AI schema generation
5. Database creation
6. Data import
7. CRUD
8. Search
9. Permissions
10. Multi-tenant isolation

The critical test is:

```text
XLSX
 ↓
Analyze
 ↓
Schema
 ↓
Database
 ↓
Imported records
 ↓
Working dashboard
```

## 16. Production Requirement

The MVP must be functional rather than a visual prototype.

Run:

```bash
npm run lint
npm run build
```

before completion and fix all errors.
