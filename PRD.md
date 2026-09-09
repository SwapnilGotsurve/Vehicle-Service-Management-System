# VEHICLE SERVICE MANAGEMENT SYSTEM

## Complete Product Requirements & Development Specification

**Project Name:** Vehicle Service Management System
**Short Name:** VSMS
**Application Type:** Full-Stack Web Application
**Primary Stack:** MERN
**Frontend:** React.js + Tailwind CSS
**Backend:** Node.js + Express.js
**Database:** MongoDB + Mongoose
**Authentication:** JWT + bcrypt
**API Style:** REST API
**Version:** 1.0
**Development Goal:** Production-quality academic/project application

---

# 1. PROJECT OVERVIEW

Build a complete, modern, responsive **Vehicle Service Management System (VSMS)** for an automobile service center.

The system must digitize the complete vehicle servicing workflow:

Customer Registration → Vehicle Registration → Service Selection → Service Booking → Booking Confirmation → Mechanic Assignment → Vehicle Inspection → Service Processing → Parts Usage → Service Completion → Invoice Generation → Payment → Service History.

The application must have separate interfaces and permissions for:

1. Customer
2. Admin
3. Service Advisor/Staff
4. Mechanic

The application must be fully functional rather than a static UI.

All frontend features must communicate with the backend through REST APIs and all important data must be stored in MongoDB.

---

# 2. MAIN OBJECTIVES

The system should:

* Reduce manual service-center paperwork.
* Maintain customer records.
* Maintain vehicle records.
* Allow customers to book services online.
* Prevent booking conflicts.
* Allow staff to manage appointments.
* Allow staff to assign mechanics.
* Allow mechanics to update service progress.
* Track spare parts used during service.
* Automatically maintain vehicle service history.
* Generate professional invoices.
* Track payment status.
* Provide dashboards and reports.
* Provide role-based access control.
* Provide a clean and responsive user interface.

---

# 3. USER ROLES

## 3.1 Customer

Customers can:

* Register
* Login
* Logout
* Reset password
* Manage profile
* Add vehicles
* Edit vehicles
* Delete vehicles
* View vehicles
* Browse services
* Book a service
* View bookings
* Cancel eligible bookings
* Reschedule eligible bookings
* Track service status
* View service history
* View invoices
* View payment status
* Receive notifications

Customers must never be able to access admin, staff, or mechanic functionality.

---

# 3.2 Admin

Admin has complete access.

Admin can:

* View dashboard
* Manage customers
* Manage vehicles
* Manage services
* Manage bookings
* Manage mechanics
* Manage staff
* Assign mechanics
* Manage spare parts
* Manage inventory
* View service records
* Generate/view invoices
* Manage payments
* View notifications
* Generate reports
* Manage system settings

---

# 3.3 Service Advisor / Staff

Staff can:

* Login
* View dashboard
* View customers
* View vehicles
* Manage bookings
* Confirm bookings
* Reschedule bookings
* Cancel bookings
* Assign mechanics
* Update booking status
* Create service records
* Add inspection details
* Add additional services
* Add parts used
* Generate invoice
* Update payment status

Staff must not be able to perform sensitive admin operations such as deleting the admin account or changing system-level settings.

---

# 3.4 Mechanic

Mechanics can:

* Login
* View assigned jobs
* View customer information
* View vehicle information
* View service request
* Start service
* Update service status
* Add inspection notes
* Add work performed
* Add parts used
* Add mechanic remarks
* Mark service as completed

Mechanics cannot access customer-management administration or financial administration.

---

# 4. CORE MODULES

The system must contain the following modules:

1. Authentication
2. User Management
3. Customer Management
4. Vehicle Management
5. Service Management
6. Service Booking
7. Mechanic Management
8. Service Processing
9. Spare Parts Management
10. Inventory Management
11. Service History
12. Billing & Invoice
13. Payment Management
14. Notification Management
15. Dashboard
16. Reports
17. Profile Management
18. System Settings

---

# 5. AUTHENTICATION MODULE

## Features

Implement:

* Registration
* Login
* Logout
* JWT authentication
* Password hashing using bcrypt
* Forgot password
* Reset password
* Protected routes
* Role-based authorization
* Token expiration handling

## Registration Fields

```text
Full Name
Email
Phone
Password
Confirm Password
Address
```

## Login Fields

```text
Email
Password
```

## Password Requirements

* Minimum 8 characters
* At least one uppercase letter
* At least one lowercase letter
* At least one number

Passwords must never be stored as plain text.

---

# 6. USER MODEL

Create a `User` collection.

Suggested fields:

```javascript
{
  name: String,
  email: String,
  phone: String,
  password: String,
  role: {
    type: String,
    enum: ["customer", "admin", "staff", "mechanic"]
  },
  address: String,
  profileImage: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Email must be unique.

---

# 7. CUSTOMER MANAGEMENT

Admin dashboard must provide:

* Customer list
* Search customers
* Filter customers
* View customer
* Add customer
* Edit customer
* Delete/deactivate customer
* View customer's vehicles
* View customer's bookings
* View customer's service history
* View customer's invoices

Customer detail page should display:

```text
Customer Information
Registered Vehicles
Upcoming Bookings
Previous Services
Invoices
Payment Status
```

---

# 8. VEHICLE MANAGEMENT

A customer can register multiple vehicles.

## Vehicle Fields

```text
Registration Number
Brand
Model
Vehicle Type
Manufacturing Year
Fuel Type
Color
Current Mileage
VIN/Chassis Number
Engine Number
Vehicle Image
```

## Vehicle Types

```text
Car
Bike
SUV
Truck
Van
Other
```

## Fuel Types

```text
Petrol
Diesel
CNG
Electric
Hybrid
Other
```

## Vehicle Features

Customer:

* Add vehicle
* Edit vehicle
* Delete vehicle
* View vehicle
* View service history

Admin/staff:

* View all vehicles
* Search by registration number
* Search by customer
* View service history

Registration number must be unique.

---

# 9. SERVICE MANAGEMENT

Admin can create available services.

## Service Fields

```text
Service Name
Description
Category
Price
Estimated Duration
Image/Icon
Status
```

## Example Services

```text
General Service
Oil Change
Brake Service
Engine Service
AC Service
Battery Service
Wheel Alignment
Wheel Balancing
Tyre Replacement
Car Washing
Full Inspection
```

Services can be:

```text
Active
Inactive
```

Inactive services must not appear in new customer bookings.

---

# 10. SERVICE BOOKING MODULE

This is one of the most important modules.

## Customer Booking Flow

```text
Select Vehicle
      ↓
Select Service
      ↓
Select Date
      ↓
Select Time Slot
      ↓
Describe Problem
      ↓
Confirm Booking
```

## Booking Fields

```text
Booking ID
Customer ID
Vehicle ID
Service ID
Booking Date
Time Slot
Problem Description
Customer Notes
Estimated Cost
Assigned Mechanic
Assigned Staff
Status
Created At
Updated At
```

## Booking Status

Use:

```text
Pending
Confirmed
Assigned
Inspection
In Progress
Waiting for Parts
Completed
Cancelled
Rejected
```

---

# 11. BOOKING RULES

Implement these business rules:

### Rule 1

Customer must have a registered vehicle before booking.

### Rule 2

Customer must select an active service.

### Rule 3

Past dates cannot be selected.

### Rule 4

Prevent conflicting appointments for the same service slot.

### Rule 5

Customer can cancel only before a configurable cancellation deadline.

### Rule 6

Staff/admin can reschedule bookings.

### Rule 7

Only authorized staff/admin can assign mechanics.

### Rule 8

Only assigned mechanics can update mechanic-level service information.

### Rule 9

Completed bookings cannot be cancelled.

### Rule 10

A completed booking must generate/update a service history record.

---

# 12. SERVICE CENTER WORKFLOW

Implement this complete workflow:

```text
BOOKED
  ↓
PENDING
  ↓
CONFIRMED
  ↓
MECHANIC ASSIGNED
  ↓
VEHICLE RECEIVED
  ↓
INSPECTION
  ↓
SERVICE IN PROGRESS
  ↓
PARTS / ADDITIONAL SERVICE
  ↓
SERVICE COMPLETED
  ↓
INVOICE GENERATED
  ↓
PAYMENT
  ↓
CLOSED
```

The system should store timestamps for important status changes.

---

# 13. MECHANIC MANAGEMENT

Admin can:

* Add mechanic
* Edit mechanic
* View mechanic
* Activate/deactivate mechanic
* Delete mechanic
* View assigned services
* View completed services
* View current workload

## Mechanic Fields

```text
Name
Email
Phone
Specialization
Experience
Availability
Status
Profile Image
```

## Specializations

```text
Engine
Brakes
Electrical
AC
Transmission
Tyres
General Service
EV
Other
```

---

# 14. MECHANIC DASHBOARD

Mechanic dashboard should show:

```text
Today's Jobs
Pending Jobs
In Progress
Completed Jobs
```

Each job card should display:

```text
Vehicle Number
Vehicle Model
Customer Name
Service
Appointment Time
Status
```

Mechanic can open the job and update:

```text
Inspection Notes
Problems Found
Work Performed
Mechanic Remarks
Parts Used
Additional Recommendations
```

---

# 15. VEHICLE INSPECTION

Before starting service, staff/mechanic should be able to record:

```text
Current Mileage
Fuel Level
Exterior Condition
Tyre Condition
Brake Condition
Engine Condition
Battery Condition
AC Condition
Other Issues
Inspection Notes
```

Optional:

```text
Before-Service Images
```

---

# 16. SERVICE RECORD

Create a `ServiceRecord` collection.

Suggested structure:

```javascript
{
  bookingId,
  vehicleId,
  customerId,
  mechanicId,
  inspectionDetails: {},
  workPerformed: [],
  partsUsed: [],
  additionalServices: [],
  mechanicNotes,
  recommendations,
  serviceStartTime,
  serviceEndTime,
  completedAt
}
```

---

# 17. SPARE PARTS MANAGEMENT

Admin/staff can manage spare parts.

## Part Fields

```text
Part Name
Part Number
Category
Description
Supplier
Purchase Price
Selling Price
Quantity
Minimum Stock Level
Location
Status
```

## Features

* Add part
* Edit part
* Delete part
* Search part
* Filter parts
* Update quantity
* Track parts used
* Low-stock alerts

---

# 18. INVENTORY RULES

When a mechanic uses a part:

```text
Available Stock - Used Quantity
```

Example:

```text
Brake Pad Stock = 20

Used = 2

Remaining = 18
```

The system must prevent users from consuming more parts than available stock.

If stock reaches the minimum stock level, display a low-stock warning.

---

# 19. ADDITIONAL SERVICES

During inspection, the mechanic/staff may identify additional required services.

Example:

Customer booked:

```text
General Service
```

Inspection finds:

```text
Brake Pad Replacement
```

The staff can add the additional service.

The system must update the estimated/final invoice.

Customer should be able to see additional services before final billing.

---

# 20. BILLING MODULE

Generate a professional invoice after service completion.

## Invoice Structure

```text
Invoice Number
Invoice Date

Customer Information
Vehicle Information

Service Items
Parts
Additional Services

Subtotal
Discount
Tax
Grand Total

Payment Status
Payment Method
```

## Calculation

```text
Service Cost
+
Parts Cost
+
Additional Service Cost
-
Discount
+
Tax
=
Final Total
```

Use server-side calculation for final totals.

Never trust totals submitted by the frontend.

---

# 21. PAYMENT MODULE

For version 1:

Support payment status tracking:

```text
Pending
Paid
Partially Paid
Refunded
```

Payment methods:

```text
Cash
Card
UPI
Online
Other
```

Actual online payment gateway can be added as a future enhancement.

Do not store card numbers or CVV.

---

# 22. INVOICE FEATURES

Customer can:

* View invoice
* Print invoice
* Download invoice

Admin/staff can:

* Create invoice
* Edit invoice before finalization
* View invoice
* Mark payment
* Print invoice

Invoice number must be unique.

Example:

```text
INV-2026-00001
INV-2026-00002
```

---

# 23. SERVICE HISTORY

Every completed service must automatically become part of the vehicle's service history.

Customer should see:

```text
Vehicle
  ↓
Service History
  ↓
Date
Service
Mechanic
Parts Used
Amount
Remarks
```

Allow filtering by:

```text
Date
Service Type
Vehicle
```

---

# 24. NOTIFICATION MODULE

Implement in-app notifications.

Notification examples:

```text
Your service booking has been confirmed.

Mechanic has been assigned to your vehicle.

Your vehicle service is now in progress.

Your vehicle service has been completed.

Your invoice has been generated.

Payment received successfully.
```

Notification fields:

```text
userId
title
message
type
isRead
createdAt
```

Add:

```text
Mark as Read
Mark All as Read
```

---

# 25. CUSTOMER DASHBOARD

Customer dashboard must contain:

```text
Welcome, Customer

Total Vehicles
Upcoming Bookings
Active Services
Completed Services
Pending Payments
```

Also show:

```text
Upcoming Appointment
Recent Service History
Recent Notifications
```

Primary CTA:

```text
Book a Service
```

---

# 26. ADMIN DASHBOARD

Admin dashboard should show:

```text
Total Customers
Total Vehicles
Today's Bookings
Pending Bookings
Active Services
Completed Services
Total Mechanics
Total Revenue
Pending Payments
Low Stock Parts
```

Add charts:

### Booking Analytics

```text
Daily / Weekly / Monthly
```

### Revenue Analytics

```text
Daily / Monthly / Yearly
```

### Service Analytics

```text
Most Popular Services
```

Use a React charting library such as Recharts if appropriate.

---

# 27. STAFF DASHBOARD

Display:

```text
Today's Appointments
Pending Bookings
Confirmed Bookings
Vehicles Awaiting Service
Services In Progress
Completed Today
```

---

# 28. REPORTING MODULE

Admin can view:

### Customer Reports

* Total customers
* New customers
* Active customers

### Vehicle Reports

* Total vehicles
* Vehicles serviced
* Vehicle types

### Booking Reports

* Total bookings
* Completed
* Cancelled
* Pending

### Revenue Reports

* Daily revenue
* Monthly revenue
* Yearly revenue

### Service Reports

* Popular services
* Service frequency
* Service revenue

### Inventory Reports

* Current stock
* Low stock
* Parts consumed

Reports should support:

```text
Date Filter
Export CSV
Print
```

PDF export may be added if practical.

---

# 29. SEARCH AND FILTERING

Implement search on major tables.

Examples:

Customer:

```text
Name
Email
Phone
```

Vehicle:

```text
Registration Number
Brand
Model
```

Booking:

```text
Customer
Vehicle
Booking ID
Status
Date
```

Parts:

```text
Part Name
Part Number
Category
```

Use pagination for large lists.

---

# 30. FRONTEND PAGES

## Public Pages

```text
/
 /about
 /services
 /contact
 /login
 /register
 /forgot-password
 /reset-password
```

## Customer Pages

```text
/customer/dashboard
/customer/profile
/customer/vehicles
/customer/vehicles/add
/customer/vehicles/:id
/customer/services
/customer/book-service
/customer/bookings
/customer/bookings/:id
/customer/service-history
/customer/invoices
/customer/invoices/:id
/customer/notifications
```

## Admin Pages

```text
/admin/dashboard
/admin/customers
/admin/customers/:id
/admin/vehicles
/admin/services
/admin/bookings
/admin/mechanics
/admin/staff
/admin/service-records
/admin/parts
/admin/inventory
/admin/invoices
/admin/payments
/admin/reports
/admin/settings
```

## Staff Pages

```text
/staff/dashboard
/staff/bookings
/staff/bookings/:id
/staff/customers
/staff/vehicles
/staff/service-records
/staff/invoices
```

## Mechanic Pages

```text
/mechanic/dashboard
/mechanic/jobs
/mechanic/jobs/:id
/mechanic/profile
```

---

# 31. UI/UX REQUIREMENTS

Build a modern professional automobile-service dashboard.

## Design Style

Use:

* Clean layout
* Modern cards
* Rounded corners
* Consistent spacing
* Professional typography
* Responsive tables
* Status badges
* Modal dialogs
* Toast notifications
* Loading skeletons
* Empty states
* Confirmation dialogs

Do not make the UI unnecessarily complicated.

---

# 32. RESPONSIVE DESIGN

The application must work on:

```text
Desktop
Laptop
Tablet
Mobile
```

Use Tailwind CSS responsive utilities.

The sidebar should become a mobile navigation drawer on small screens.

Tables should be responsive.

---

# 33. COLOR/DESIGN SYSTEM

Use a professional automotive-inspired design.

Suggested:

```text
Primary: Blue / Indigo
Success: Green
Warning: Amber
Danger: Red
Background: Light Gray
Text: Dark Gray
```

Do not overuse colors.

Status colors should be consistent throughout the application.

---

# 34. COMPONENT STRUCTURE

Create reusable components.

Example:

```text
Button
Input
Select
Textarea
Modal
ConfirmDialog
Table
Pagination
Badge
Card
Dropdown
Navbar
Sidebar
Breadcrumb
Loader
Skeleton
EmptyState
Toast
DatePicker
SearchBar
FilterPanel
StatCard
ChartCard
Invoice
```

Do not duplicate UI code unnecessarily.

---

# 35. FRONTEND FOLDER STRUCTURE

Use:

```text
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   └── tables/
│   ├── pages/
│   │   ├── auth/
│   │   ├── customer/
│   │   ├── admin/
│   │   ├── staff/
│   │   └── mechanic/
│   ├── layouts/
│   ├── routes/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── constants/
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── .env
```

---

# 36. BACKEND FOLDER STRUCTURE

Use:

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── constants/
│   ├── app.js
│   └── server.js
├── uploads/
├── package.json
└── .env
```

---

# 37. DATABASE COLLECTIONS

Create these MongoDB collections:

```text
users
vehicles
services
bookings
serviceRecords
parts
invoices
payments
notifications
```

Optional:

```text
auditLogs
settings
```

---

# 38. DATABASE RELATIONSHIP

Logical relationship:

```text
User
 │
 ├── Vehicles
 │       │
 │       ├── Bookings
 │       │       │
 │       │       ├── Service
 │       │       ├── Mechanic
 │       │       └── Service Record
 │       │
 │       └── Service History
 │
 └── Notifications

Booking
   ↓
Service Record
   ↓
Invoice
   ↓
Payment
```

Use MongoDB ObjectId references.

---

# 39. VEHICLE MODEL

```javascript
{
  owner: ObjectId,
  registrationNumber: String,
  brand: String,
  model: String,
  vehicleType: String,
  manufacturingYear: Number,
  fuelType: String,
  color: String,
  mileage: Number,
  vin: String,
  engineNumber: String,
  image: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

# 40. SERVICE MODEL

```javascript
{
  name: String,
  description: String,
  category: String,
  price: Number,
  estimatedDuration: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

# 41. BOOKING MODEL

```javascript
{
  customer: ObjectId,
  vehicle: ObjectId,
  service: ObjectId,
  bookingDate: Date,
  timeSlot: String,
  problemDescription: String,
  customerNotes: String,
  estimatedCost: Number,
  assignedMechanic: ObjectId,
  assignedStaff: ObjectId,
  status: String,
  statusHistory: [
    {
      status: String,
      changedBy: ObjectId,
      timestamp: Date,
      note: String
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

# 42. PART MODEL

```javascript
{
  name: String,
  partNumber: String,
  category: String,
  description: String,
  supplier: String,
  purchasePrice: Number,
  sellingPrice: Number,
  quantity: Number,
  minimumStock: Number,
  location: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

# 43. INVOICE MODEL

```javascript
{
  invoiceNumber: String,
  booking: ObjectId,
  customer: ObjectId,
  vehicle: ObjectId,
  items: [
    {
      type: String,
      name: String,
      quantity: Number,
      price: Number,
      total: Number
    }
  ],
  subtotal: Number,
  discount: Number,
  tax: Number,
  grandTotal: Number,
  paymentStatus: String,
  paymentMethod: String,
  issuedAt: Date
}
```

---

# 44. NOTIFICATION MODEL

```javascript
{
  user: ObjectId,
  title: String,
  message: String,
  type: String,
  isRead: Boolean,
  createdAt: Date
}
```

---

# 45. REST API STRUCTURE

Base URL:

```text
/api
```

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
```

## Users

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

## Vehicles

```text
GET    /api/vehicles
GET    /api/vehicles/:id
POST   /api/vehicles
PUT    /api/vehicles/:id
DELETE /api/vehicles/:id
```

## Services

```text
GET    /api/services
GET    /api/services/:id
POST   /api/services
PUT    /api/services/:id
DELETE /api/services/:id
```

## Bookings

```text
GET    /api/bookings
GET    /api/bookings/:id
POST   /api/bookings
PUT    /api/bookings/:id
PATCH  /api/bookings/:id/status
PATCH  /api/bookings/:id/assign-mechanic
DELETE /api/bookings/:id
```

## Mechanics

```text
GET    /api/mechanics
GET    /api/mechanics/:id
POST   /api/mechanics
PUT    /api/mechanics/:id
DELETE /api/mechanics/:id
```

## Service Records

```text
GET    /api/service-records
GET    /api/service-records/:id
POST   /api/service-records
PUT    /api/service-records/:id
```

## Parts

```text
GET    /api/parts
GET    /api/parts/:id
POST   /api/parts
PUT    /api/parts/:id
DELETE /api/parts/:id
PATCH  /api/parts/:id/stock
```

## Invoices

```text
GET    /api/invoices
GET    /api/invoices/:id
POST   /api/invoices
PUT    /api/invoices/:id
```

## Payments

```text
GET   /api/payments
POST  /api/payments
PATCH /api/payments/:id/status
```

## Notifications

```text
GET   /api/notifications
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
```

## Dashboard

```text
GET /api/dashboard/admin
GET /api/dashboard/customer
GET /api/dashboard/staff
GET /api/dashboard/mechanic
```

---

# 46. API SECURITY

Implement:

* JWT authentication middleware
* Role authorization middleware
* bcrypt password hashing
* Input validation
* MongoDB query protection
* Rate limiting for authentication APIs
* CORS configuration
* Helmet
* Secure HTTP headers
* Environment variables
* Proper error handling

Never expose:

```text
JWT secret
MongoDB password
Email password
API keys
```

in source code.

---

# 47. ENVIRONMENT VARIABLES

Backend `.env`:

```text
PORT=5000
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

If email functionality is implemented:

```text
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
```

Frontend `.env`:

```text
VITE_API_URL=http://localhost:5000/api
```

Provide `.env.example`.

Never commit `.env` to GitHub.

---

# 48. VALIDATION

Use a validation library such as Zod/Joi/express-validator.

Validate:

* Email
* Password
* Phone
* Registration number
* Vehicle year
* Mileage
* Booking date
* Time slot
* Service price
* Part quantity
* Invoice values

Frontend validation improves UX.

Backend validation is mandatory for security.

---

# 49. ERROR HANDLING

Create centralized backend error handling.

API response format should be consistent.

Success:

```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Vehicle registration number already exists"
}
```

Handle:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

---

# 50. LOADING & EMPTY STATES

Every API-driven page must handle:

```text
Loading
Success
Empty
Error
```

Example:

If there are no vehicles:

```text
No vehicles registered yet.

[Add Your First Vehicle]
```

Do not show blank pages.

---

# 51. CONFIRMATION DIALOGS

For destructive operations:

```text
Delete Vehicle?
Are you sure you want to delete this vehicle?
[Cancel] [Delete]
```

Use confirmation dialogs for:

* Delete customer
* Delete vehicle
* Delete service
* Delete mechanic
* Delete part
* Cancel booking

---

# 52. TOAST NOTIFICATIONS

Show toast messages for:

```text
Login successful
Vehicle added
Vehicle updated
Booking created
Booking cancelled
Mechanic assigned
Service completed
Invoice generated
Payment updated
```

Also show useful error messages.

---

# 53. BOOKING CALENDAR

Admin/staff should have a calendar view.

Display:

```text
Today's appointments
Upcoming appointments
Completed appointments
Cancelled appointments
```

Calendar should allow:

```text
Day
Week
Month
```

If implementation complexity becomes too high, provide a date-filtered booking table as the MVP.

---

# 54. DASHBOARD CHARTS

Admin dashboard should contain:

### Booking Chart

Show:

```text
Pending
Confirmed
In Progress
Completed
Cancelled
```

### Revenue Chart

Show revenue over:

```text
Last 7 days
Last 30 days
Current month
```

### Service Popularity

Show most-booked services.

Charts must use real database data.

Do not hardcode dashboard statistics.

---

# 55. AUDIT LOGS

For important administrative operations, optionally maintain an audit log.

Example:

```javascript
{
  user: ObjectId,
  action: String,
  entity: String,
  entityId: ObjectId,
  description: String,
  timestamp: Date
}
```

Track:

```text
Booking status changes
Mechanic assignment
Invoice modification
Payment status change
Inventory changes
```

---

# 56. SEED DATA

Create a database seed script.

Seed:

### Admin

```text
Email: admin@example.com
Password: Admin@123
Role: admin
```

### Staff

```text
Email: staff@example.com
Password: Staff@123
Role: staff
```

### Mechanic

```text
Email: mechanic@example.com
Password: Mechanic@123
Role: mechanic
```

### Services

Create at least:

```text
General Service
Oil Change
Brake Service
AC Service
Engine Service
Wheel Alignment
Battery Service
Full Inspection
```

Passwords must be hashed.

Clearly document that these are development/demo credentials and must be changed before production.

---

# 57. DEMO DATA

Create realistic demo data for:

```text
Customers
Vehicles
Bookings
Mechanics
Services
Parts
Invoices
```

Dashboard should look realistic when the project is first launched.

---

# 58. API TESTING

Create a Postman collection covering:

```text
Register
Login
Get Profile
Create Vehicle
Get Vehicles
Create Service
Create Booking
Confirm Booking
Assign Mechanic
Update Service
Create Service Record
Create Invoice
Update Payment
Get Dashboard
```

Document required headers:

```text
Authorization: Bearer <token>
Content-Type: application/json
```

---

# 59. README

Create a complete `README.md`.

Include:

```text
Project Overview
Features
Tech Stack
Requirements
Installation
Environment Variables
Database Setup
Running Frontend
Running Backend
Seed Data
API Documentation
Demo Credentials
Project Structure
Screenshots
Future Enhancements
```

Installation should be simple:

```bash
git clone <repository>
cd vehicle-service-management-system
npm install
npm run dev
```

If frontend/backend use separate package files, document both commands.

---

# 60. GIT CONFIGURATION

Create:

```text
.gitignore
.env.example
README.md
```

`.gitignore` should exclude:

```text
node_modules
.env
dist
build
uploads/*
```

Do not commit secrets.

---

# 61. PERFORMANCE REQUIREMENTS

Optimize:

* Database queries
* API responses
* React rendering
* Images
* Pagination
* Search

Use MongoDB indexes for frequently searched fields.

Recommended indexes:

```text
users.email
vehicles.registrationNumber
bookings.bookingDate
bookings.status
parts.partNumber
invoices.invoiceNumber
```

---

# 62. SECURITY REQUIREMENTS

Mandatory:

* Password hashing
* JWT authentication
* Role-based authorization
* Backend validation
* Protected API routes
* CORS
* Helmet
* Rate limiting
* Secure error messages
* Environment variables
* No secret keys in frontend
* No sensitive information in logs

Prevent:

```text
Unauthorized API access
Privilege escalation
Duplicate bookings
Invalid stock deductions
Invalid invoice totals
```

---

# 63. IMPORTANT BUSINESS LOGIC

The backend must be the source of truth.

Never rely on frontend calculations for:

```text
Invoice total
Stock quantity
Booking availability
User permissions
Service price
Payment amount
```

Always verify these values on the server.

---

# 64. CUSTOMER BOOKING EXAMPLE

Customer:

```text
Name: Rahul
Vehicle: MH12AB1234
Vehicle: Honda City
```

Customer selects:

```text
Service: General Service
Date: 15 September
Time: 10:00 AM
Problem: Engine making unusual noise
```

System creates:

```text
Booking ID: BK-2026-00001
Status: Pending
```

Staff confirms:

```text
Status → Confirmed
```

Staff assigns mechanic:

```text
Mechanic → Amit
Status → Assigned
```

Mechanic starts:

```text
Status → In Progress
```

Mechanic completes:

```text
Status → Completed
```

System generates:

```text
Service Record
Invoice
```

Customer completes payment:

```text
Payment → Paid
Booking → Closed
```

---

# 65. UI NAVIGATION

## Customer Sidebar

```text
Dashboard
My Vehicles
Book Service
My Bookings
Service History
Invoices
Notifications
Profile
Logout
```

## Admin Sidebar

```text
Dashboard
Customers
Vehicles
Services
Bookings
Mechanics
Staff
Service Records
Parts
Inventory
Invoices
Payments
Reports
Notifications
Settings
Logout
```

## Staff Sidebar

```text
Dashboard
Bookings
Customers
Vehicles
Service Records
Invoices
Profile
Logout
```

## Mechanic Sidebar

```text
Dashboard
My Jobs
Service Records
Profile
Logout
```

---

# 66. RESPONSIVE MOBILE NAVIGATION

On mobile:

```text
☰ Menu
```

Sidebar should become a drawer.

Important actions should remain easily accessible.

Booking form must work properly on mobile.

---

# 67. ACCESS CONTROL MATRIX

| Feature            | Customer |   Staff | Mechanic | Admin |
| ------------------ | -------: | ------: | -------: | ----: |
| Own Profile        |        ✓ |       ✓ |        ✓ |     ✓ |
| Own Vehicles       |        ✓ |    View |     View |     ✓ |
| Create Booking     |        ✓ |       ✓ |        ✗ |     ✓ |
| Manage Bookings    |      Own |       ✓ | Assigned |     ✓ |
| Assign Mechanic    |        ✗ |       ✓ |        ✗ |     ✓ |
| Update Service     |        ✗ |       ✓ | Assigned |     ✓ |
| Manage Services    |        ✗ |       ✗ |        ✗ |     ✓ |
| Manage Parts       |        ✗ |       ✓ |    Usage |     ✓ |
| Manage Users       |        ✗ | Limited |        ✗ |     ✓ |
| View Invoice       |      Own |       ✓ |  Limited |     ✓ |
| Payment Management |      Own |       ✓ |        ✗ |     ✓ |
| Reports            |        ✗ | Limited |        ✗ |     ✓ |
| System Settings    |        ✗ |       ✗ |        ✗ |     ✓ |

---

# 68. PROJECT DEVELOPMENT PHASES

## Phase 1 — Project Setup

Create:

```text
Frontend
Backend
MongoDB connection
Environment variables
Git configuration
```

## Phase 2 — Authentication

Implement:

```text
Register
Login
JWT
Logout
Forgot Password
Role-based authorization
```

## Phase 3 — Customer & Vehicle

Implement:

```text
Customer profile
Vehicle CRUD
Vehicle details
```

## Phase 4 — Services

Implement:

```text
Service CRUD
Service categories
Pricing
```

## Phase 5 — Booking

Implement:

```text
Booking
Time slots
Booking status
Booking management
```

## Phase 6 — Mechanics

Implement:

```text
Mechanic management
Assignment
Mechanic dashboard
```

## Phase 7 — Service Processing

Implement:

```text
Inspection
Service records
Parts used
Status tracking
```

## Phase 8 — Billing

Implement:

```text
Invoice
Payment
Payment status
```

## Phase 9 — Dashboard

Implement:

```text
Statistics
Charts
Reports
```

## Phase 10 — Testing & Optimization

Perform:

```text
Frontend testing
Backend testing
API testing
Role testing
Security testing
Responsive testing
Error handling
```

---

# 69. MVP PRIORITY

Build features in this priority:

### P0 — Mandatory

```text
Authentication
Role Management
Customer
Vehicle
Services
Booking
Mechanic Assignment
Service History
Invoice
Dashboard
```

### P1 — Important

```text
Parts
Inventory
Notifications
Reports
Calendar
```

### P2 — Optional

```text
Online Payment Gateway
Email Notifications
SMS
Multiple Service Centers
Advanced Analytics
AI Service Recommendations
```

---

# 70. FUTURE AI FEATURES

Design the architecture so AI can be added later.

Potential AI features:

### AI Vehicle Problem Assistant

Customer enters:

```text
"My car makes a clicking sound when I turn."
```

AI provides:

```text
Possible causes
Recommended inspection
Suggested service
Urgency level
```

AI must clearly state that this is an informational recommendation and not a professional mechanical diagnosis.

### AI Service Recommendation

Use:

```text
Vehicle history
Mileage
Previous services
Current issue
```

to recommend possible maintenance.

### AI Maintenance Reminder

Predict:

```text
Oil change
Brake inspection
Battery check
General service
```

based on previous service history.

---

# 71. FUTURE MULTI-BRANCH SUPPORT

Keep the database design extensible for future support of multiple service centers.

Potential future collection:

```text
serviceCenters
```

Bookings can eventually contain:

```text
serviceCenterId
```

Do not implement complex multi-branch functionality in MVP unless necessary.

---

# 72. TESTING REQUIREMENTS

Test all major functionality.

## Authentication Tests

```text
Valid registration
Duplicate email
Invalid email
Weak password
Valid login
Invalid password
Unauthorized route
```

## Vehicle Tests

```text
Add vehicle
Edit vehicle
Delete vehicle
Duplicate registration number
Unauthorized vehicle access
```

## Booking Tests

```text
Create booking
Invalid date
Duplicate time slot
Cancel booking
Confirm booking
Assign mechanic
Update status
```

## Billing Tests

```text
Correct subtotal
Correct tax
Correct discount
Correct total
Payment status
```

## Security Tests

Verify that:

```text
Customer cannot access admin APIs.
Mechanic cannot modify invoices.
Staff cannot access system settings.
Unauthenticated users cannot access protected APIs.
```

---

# 73. ACCEPTANCE CRITERIA

The project is considered complete only when:

* User can register and login.
* Role-based dashboards work.
* Customer can add vehicles.
* Customer can book services.
* Staff can manage bookings.
* Staff can assign mechanics.
* Mechanic can update assigned service.
* Service history is automatically created.
* Spare parts can be tracked.
* Inventory updates after parts usage.
* Invoice can be generated.
* Payment status can be updated.
* Notifications work.
* Dashboard uses real database data.
* Search and filtering work.
* Protected routes work.
* API validation works.
* Error handling works.
* Application is responsive.
* MongoDB stores all persistent data.
* No important functionality is hardcoded.
* Project can be installed using README instructions.

---

# 74. AI DEVELOPMENT INSTRUCTIONS

When generating the project, follow these rules:

### Rule 1

Do not create a static prototype.

Build a fully functional full-stack application.

### Rule 2

Do not hardcode customer, booking, service, or dashboard data.

Use MongoDB.

### Rule 3

Every frontend operation involving data must communicate with the backend API.

### Rule 4

Implement proper loading, error, and empty states.

### Rule 5

Use reusable React components.

### Rule 6

Keep frontend and backend logically separated.

### Rule 7

Use controllers, routes, models, middleware, and services in the backend.

### Rule 8

Use environment variables for secrets.

### Rule 9

Never expose JWT secrets or database credentials.

### Rule 10

Implement role-based authorization on the backend, not only the frontend.

### Rule 11

Validate all incoming API data.

### Rule 12

Do not trust frontend calculations.

### Rule 13

Use meaningful HTTP status codes.

### Rule 14

Return consistent API responses.

### Rule 15

Use professional error messages.

### Rule 16

Do not generate placeholder buttons that do nothing.

Every visible action must either work or be explicitly marked as a future feature.

### Rule 17

Use realistic seed data.

### Rule 18

Make the application responsive.

### Rule 19

Do not unnecessarily over-engineer the application.

### Rule 20

After implementation, test the complete workflow from customer registration to completed service and invoice.

---

# 75. REQUIRED FINAL PROJECT STRUCTURE

The final repository should look approximately like:

```text
vehicle-service-management-system/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── backend/
│   ├── src/
│   ├── uploads/
│   ├── package.json
│   └── .env.example
│
├── postman/
│   └── VSMS.postman_collection.json
│
├── docs/
│   ├── API.md
│   └── DATABASE.md
│
├── .gitignore
├── README.md
└── package.json
```

---

# 76. FINAL DEVELOPMENT COMMANDS

The project should support:

```bash
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm run dev
```

Production builds:

```bash
npm run build
```

---

# 77. FINAL DELIVERABLE

The AI developer must produce:

1. Complete React frontend
2. Complete Node.js/Express backend
3. MongoDB/Mongoose integration
4. JWT authentication
5. Role-based authorization
6. Customer management
7. Vehicle management
8. Service management
9. Service booking
10. Mechanic management
11. Service processing
12. Service history
13. Spare-parts management
14. Inventory management
15. Invoice generation
16. Payment tracking
17. Notifications
18. Role-specific dashboards
19. Admin reports
20. Responsive UI
21. Form validation
22. Error handling
23. Loading states
24. Empty states
25. Seed data
26. Postman collection
27. `.env.example`
28. README documentation
29. Database documentation
30. Secure API implementation

---

# 78. DEFINITION OF DONE

The project is complete when a new customer can perform this entire workflow without developer intervention:

```text
Register
   ↓
Login
   ↓
Add Vehicle
   ↓
Browse Services
   ↓
Book Service
   ↓
Receive Confirmation
   ↓
Track Booking
   ↓
Vehicle Assigned to Mechanic
   ↓
Mechanic Performs Inspection
   ↓
Mechanic Updates Service
   ↓
Parts Added
   ↓
Service Completed
   ↓
Service History Created
   ↓
Invoice Generated
   ↓
Payment Recorded
   ↓
Customer Views Final Invoice
```

At the same time, the admin/staff should be able to monitor the entire process through their dashboards.

**Build the application according to this specification. Prioritize functionality, security, clean architecture, maintainability, responsive design, and a professional user experience.**
