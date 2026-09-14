# Role-Based Access Control Audit Report

## 1. SYSTEM ROLES
- **Customer** - Vehicle owners who book services
- **Staff** - Service advisors who manage bookings and operations
- **Mechanic** - Technicians who perform service work
- **Admin** - System administrators with full access

---

## 2. CURRENT BACKEND PERMISSIONS (API)

### ✅ CUSTOMER
- GET `/api/auth/me` - View profile
- GET `/api/vehicles` - Own vehicles only
- POST `/api/vehicles` - Create vehicles
- PUT `/api/vehicles/:id` - Update own vehicles
- DELETE `/api/vehicles/:id` - Delete own vehicles
- POST `/api/bookings` - Create bookings
- GET `/api/bookings` - Own bookings only
- PATCH `/api/bookings/:id/cancel` - Cancel own bookings
- PATCH `/api/bookings/:id/reschedule` - Reschedule own bookings
- GET `/api/invoices` - Own invoices only
- GET `/api/payments` - Own payments only
- GET `/api/service-records` - Own service records only
- GET `/api/notifications` - Own notifications

### ✅ STAFF
- GET `/api/auth/me` - View profile
- GET `/api/vehicles` - All vehicles
- POST `/api/vehicles` - Create vehicles
- GET `/api/services` - View all services
- GET `/api/bookings` - All bookings
- PATCH `/api/bookings/:id/status` - Update booking status ✅
- PATCH `/api/bookings/:id/assign-mechanic` - Assign mechanics ✅
- ❌ **CANNOT** PATCH `/api/users/:id/status` - Manage staff status (ONLY admin)
- GET `/api/users` - View team members
- POST `/api/users` - Create team members ✅
- GET `/api/mechanics` - View mechanics
- GET `/api/parts` - View parts inventory
- POST `/api/parts` - Add parts
- PUT `/api/parts/:id` - Update parts
- PATCH `/api/parts/:id/stock` - Update stock
- POST `/api/service-records` - Create service records
- GET `/api/invoices` - All invoices
- POST `/api/invoices` - Create invoices
- PATCH `/api/invoices/:id/payment` - Update payment status
- POST `/api/payments` - Record payments
- GET `/api/notifications` - Own notifications

### ✅ MECHANIC
- GET `/api/auth/me` - View profile
- GET `/api/bookings` - Assigned bookings only
- PATCH `/api/bookings/:id/status` - Update booking status ✅
- GET `/api/parts` - View parts inventory
- PATCH `/api/parts/:id/stock` - Update stock ✅
- POST `/api/service-records` - Create service records ✅
- GET `/api/service-records` - Own service records only
- GET `/api/notifications` - Own notifications

### ✅ ADMIN
- GET `/api/auth/me` - View profile
- GET/POST `/api/vehicles` - All vehicles
- GET/POST/PUT `/api/services` - Manage services ✅
- GET/POST/PUT `/api/bookings` - All bookings
- PATCH `/api/bookings/:id/status` - Update status
- PATCH `/api/bookings/:id/assign-mechanic` - Assign mechanics
- PATCH `/api/bookings/:id/assign-staff` - Assign staff
- GET `/api/mechanics` - View mechanics
- GET `/api/users` - View all users
- POST `/api/users` - Create users
- PATCH `/api/users/:id/status` - Manage user status ✅ (ONLY ADMIN)
- GET `/api/parts` - View parts
- POST/PUT `/api/parts` - Manage parts
- PATCH `/api/parts/:id/stock` - Update stock
- POST `/api/service-records` - Create records
- GET `/api/invoices` - All invoices
- POST `/api/invoices` - Create invoices
- PATCH `/api/invoices/:id/payment` - Update payment
- POST `/api/payments` - Record payments
- GET `/api/notifications` - All notifications

---

## 3. FRONTEND NAVIGATION ISSUES FOUND

### 🔴 ISSUE 1: Incorrect Navigation for Admin/Staff
**Current:** navigation.js shows:
```
{ label: 'My vehicles', roles: ['customer', 'admin', 'staff'] }
{ label: 'Book service', roles: ['customer', 'admin', 'staff'] }
```
**Problem:** Admin and staff don't need to book services or manage personal vehicles
**Fix:** Remove admin/staff from these items

### 🔴 ISSUE 2: Missing Navigation Item Restrictions
**Current:** Invoices are shown to ['customer', 'admin', 'staff']
**Problem:** Inconsistent - customers can view but not in primary nav for them
**Fix:** Clarify customer access to invoices

### 🔴 ISSUE 3: Mechanic Permissions Mismatch
**Current:** Mechanic can see "Parts & inventory" but has limited permissions
**Problem:** UI shows full parts page but mechanic can only update stock
**Fix:** Restrict parts UI for mechanics to stock updates only

### 🔴 ISSUE 4: Staff Status Management Gap
**Current:** Staff can CREATE users but NOT MANAGE their status
**Problem:** Staff created a user but admin must deactivate them
**Fix:** Allow staff to manage user status for non-admin users

### 🔴 ISSUE 5: Service Management Inconsistency
**Current:** "Services" in navigation only for ['admin']
**Problem:** Staff needs to manage services too
**Fix:** Add 'staff' to services navigation? OR keep admin-only?

---

## 4. CURRENT FRONTEND UI RESTRICTIONS

### ✅ Dashboard
- Shows role-specific stats correctly

### ✅ Sidebar Navigation
- Properly filters items based on user.role

### ⚠️ Pages Not Fully Restricted
- OperationsPage shows different forms for team/parts/services
- RecordsPage shows different content based on 'type' prop but not role

---

## 5. RECOMMENDATIONS

### High Priority Fixes:
1. ❌ Remove 'admin' and 'staff' from "My vehicles" navigation
2. ❌ Remove 'admin' and 'staff' from "Book service" navigation  
3. ✅ Allow STAFF to manage team member status (currently only admin)
4. ✅ Clarify mechanic parts permissions (view only OR update stock only)
5. ✅ Add form validation - prevent staff from creating admin accounts (already done)

### Medium Priority:
6. Consider: Should staff manage services, or admin only?
7. Consider: Should staff have "Invoices" access for view/create?
8. Consider: Add customer to "Invoices" primary navigation?

### Low Priority:
9. Add role-based page access control (currently relies on navigation only)
10. Add audit logging for sensitive operations

---

## 6. SUMMARY BY ROLE

| Feature | Customer | Mechanic | Staff | Admin |
|---------|----------|----------|-------|-------|
| Dashboard | Personal | Assigned jobs | Queue | Overview |
| Book Service | ✅ | ❌ | ❌ | ❌ |
| My Vehicles | ✅ | ❌ | ❌ | ❌ |
| View Bookings | Own | Assigned | All | All |
| Manage Bookings | Cancel/Reschedule | Update status | Assign/Status | Full |
| Parts Inventory | ❌ | View/Stock | View/Add/Edit | Full |
| Service Records | Own | Create/View | Create/View | Full |
| Team Management | ❌ | ❌ | Create/View | Full |
| Services | ❌ | ❌ | ❌ | Create/Edit |
| Financial | View own | ❌ | Create/Manage | Full |
| Invoices | Own | ❌ | All | All |
| Notifications | Own | Own | Own | All |

