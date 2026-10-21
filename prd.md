# SheetApp — Product Requirements Document

## 1. Product

**Name:** SheetApp

**Tagline:**
Turn the spreadsheet your business depends on into a real internal app.

## 2. Problem

SMBs often run important operations from Excel/CSV files.

Common problems:

* Accidental edits
* Broken formulas
* Duplicate records
* No permissions
* Poor search/filtering
* Multiple spreadsheet versions
* Difficult data management

## 3. Solution

SheetApp lets a user upload a spreadsheet and automatically converts it into a functional internal business application.

### Core flow

```text
Upload Spreadsheet
        ↓
Analyze Data
        ↓
AI Understands Structure
        ↓
Review Schema
        ↓
Generate App
        ↓
Use Dashboard
```

## 4. Target Users

Primary:

* Small businesses
* Agencies
* Distributors
* Operations teams
* Service businesses

Typical users are non-technical and already depend heavily on spreadsheets.

## 5. MVP Features

### Authentication

* Sign up
* Login
* Logout
* Protected dashboard

### Spreadsheet Upload

* XLSX
* XLS
* CSV
* File validation
* File size limit

### Spreadsheet Analysis

Detect:

* Sheets
* Columns
* Data types
* IDs
* Dates
* Currency
* Statuses
* Potential relationships
* Duplicate records
* Missing values

### AI Schema Generation

Convert spreadsheet structure into:

* Tables
* Fields
* Relationships
* Field types

### Schema Review

User can:

* Rename fields
* Change field types
* Add/remove fields
* Confirm relationships

### App Generation

Generate:

* Dashboard
* Tables
* Forms
* Record pages
* Search
* Filters
* CRUD operations

### Basic Permissions

Roles:

* Admin
* Manager
* Member
* Viewer

### Data Management

Users can:

* Create records
* Edit records
* Delete records
* Search
* Filter
* Sort
* Export CSV

## 6. MVP Success Metric

The primary activation event is:

> **User uploads a spreadsheet and successfully generates a usable internal app.**

Track:

* Signups
* Uploads
* Successful analyses
* Generated apps
* Records created
* Returning users

## 7. Future Features

Not part of MVP:

* Google Sheets integration
* Advanced workflows
* Automations
* AI agents
* Advanced analytics
* Custom branding
* Public apps
* Advanced billing

## 8. Pricing Direction

Starter — $29/month
Business — $79/month
Pro — $149/month

Pricing can initially remain in mock/development mode.

## 9. Product Principle

Do not build a generic AI app builder.

The product should remain focused on:

> **Spreadsheet → Internal Business App**
