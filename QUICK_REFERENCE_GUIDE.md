# Role-Based Access Control - Quick Reference Guide

## 👤 User Roles Quick Reference

### 🔵 CUSTOMER
**What they do:** Book and track vehicle services
**Can:** View own bookings, vehicles, service history, invoices
**Cannot:** Manage staff, parts, or services
**Default Pages:** Dashboard, Vehicles, Book Service, My Bookings

---

### 🟠 MECHANIC  
**What they do:** Perform vehicle service work
**Can:** View assigned jobs, update service progress, manage parts stock
**Cannot:** Book services, create invoices, manage team
**Default Pages:** Dashboard, Assigned Jobs, Service History, Parts

---

### 🟡 STAFF
**What they do:** Manage bookings and service operations
**Can:** Assign jobs, create service records, manage team members, handle invoices
**Cannot:** Manage services, manage admin accounts
**Default Pages:** Dashboard, Bookings Queue, Team Management, Parts

---

### 🔴 ADMIN
**What they do:** System administration and oversight
**Can:** Everything - manage all users, services, parts, invoices, bookings
**Cannot:** Nothing (full access)
**Default Pages:** Dashboard, All Management Sections

---

## 🛠️ COMMON ADMIN TASKS

### Create a New Mechanic
```
1. Login as Admin
2. Go to Operations → Team & Access
3. Fill in:
   - Name: (mechanic's name)
   - Email: (unique email)
   - Password: (8+ chars with uppercase, lowercase, number)
   - Role: "mechanic"
   - Specialization: (e.g., "AC Service")
4. Click "Save record"
✅ Mechanic can now login
```

### Create a New Staff Member
```
1. Login as Admin
2. Go to Operations → Team & Access
3. Fill in:
   - Name: (staff name)
   - Email: (unique email)
   - Password: (8+ chars with uppercase, lowercase, number)
   - Role: "staff"
4. Click "Save record"
✅ Staff can now login
```

### Create Another Admin Account
```
1. Login as existing Admin
2. Option A (UI): Cannot create admin via UI (intentional security feature)
3. Option B (Backend API):
   POST /api/users
   {
     "name": "New Admin",
     "email": "admin2@example.com",
     "password": "SecurePass@123",
     "role": "admin"
   }
✅ New admin created
```

### Deactivate a Team Member
```
As Admin:
1. Go to Operations → Team & Access
2. Find the team member
3. Click deactivate (they cannot login)

As Staff (NEW):
1. Same process, but cannot deactivate admins
2. Can deactivate mechanics and other staff
```

### Assign a Mechanic to a Job
```
As Admin or Staff:
1. Go to Bookings
2. Find the booking
3. Click "Assign Mechanic"
4. Select from available mechanics
✅ Mechanic assigned
```

---

## 🔐 SECURITY FEATURES

| Feature | Details |
|---------|---------|
| **Admin Protection** | Only admins can create/manage admin accounts |
| **Password Validation** | 8+ chars, uppercase, lowercase, number required |
| **Email Uniqueness** | No duplicate emails in system |
| **Role Isolation** | Each role sees only relevant sections |
| **Data Isolation** | Customers see only own data; mechanics see only assigned work |
| **Staff Restrictions** | Staff can manage non-admin users only |

---

## ⚠️ IMPORTANT NOTES

### Passwords
- **Minimum:** 8 characters
- **Required:** Uppercase letter, lowercase letter, number
- **Validation:** Enforced on both frontend and backend
- **Examples of valid passwords:**
  - `Mechanic@123` ✅
  - `Staff@2024` ✅
  - `SecurePass@456` ✅
- **Examples of invalid passwords:**
  - `password123` ❌ (no uppercase)
  - `PASSWORD123` ❌ (no lowercase)
  - `Password` ❌ (no number)

### Default Demo Accounts
If you run `node src/seed.js` to populate initial data:
```
Admin:    admin@example.com / Admin@123
Staff:    staff@example.com / Staff@123  
Mechanic: mechanic@example.com / Mechanic@123
```
**⚠️ Change these passwords in production!**

### Role Restrictions by UI

#### Cannot See in Navigation:
- **CUSTOMER seeing "My Vehicles":** ✅ Can see (correct)
- **CUSTOMER seeing "Book Service":** ✅ Can see (correct)
- **STAFF seeing "My Vehicles":** ❌ Cannot see (correct)
- **STAFF seeing "Book Service":** ❌ Cannot see (correct)
- **MECHANIC seeing "Services":** ❌ Cannot see (correct)
- **MECHANIC seeing "Team":** ❌ Cannot see (correct)

---

## 🧪 TEST SCENARIOS

### Scenario 1: New Staff Member Setup
```
1. Admin creates staff account with email staff2@company.com / Staff@123
2. New staff logs in
3. Staff creates a mechanic account
4. Staff deactivates the mechanic account
5. Mechanic tries to login → ❌ Cannot (deactivated)
6. Staff reactivates the mechanic account  
7. Mechanic logs in → ✅ Success
```

### Scenario 2: Security Validation
```
1. Staff tries to create admin account via UI → ❌ No admin option
2. Staff tries via API → ❌ 403 Forbidden error
3. Admin creates another admin account → ✅ Success
4. Admin deactivates the new admin → ✅ Success
5. Deactivated admin tries login → ❌ Cannot
```

### Scenario 3: Customer Experience
```
1. Customer logs in
2. Navigates to "Book Service" → ✅ Can see and use
3. Books a service appointment
4. Views "My Bookings" → ✅ Can see their booking
5. Tries to access "Team" → ❌ Not in navigation
6. Tries direct URL access to /team → ⚠️ May show page but backend denies data
```

---

## 📞 TROUBLESHOOTING

### Issue: User Cannot Login
**Possible Causes:**
1. Account deactivated (isActive = false)
2. Wrong email/password
3. Account not created yet
4. Email not confirmed (if required)

**Solution:**
- Admin: Go to Team & Access, check account status
- Reactivate account if deactivated
- Verify password follows validation rules

### Issue: Staff Cannot Create Users
**Possible Causes:**
1. Not logged in with staff/admin role
2. Backend not running
3. Password validation failed

**Solution:**
- Check user role is "staff" or "admin"
- Check browser console for error messages
- Ensure password has: 8+ chars, uppercase, lowercase, number

### Issue: Staff Sees Menu Items They Shouldn't
**Possible Causes:**
1. Frontend cache not cleared
2. User object not updated after login

**Solution:**
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Logout and login again

### Issue: Cannot Deactivate Admin Account as Staff
**Expected Behavior:** ✅ This is correct - only admins can manage admin accounts

---

## 📊 ROLES AT A GLANCE

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE PERMISSIONS                         │
├─────────────────────────────────────────────────────────────┤
│ CUSTOMER:  Book/Track/Manage OWN Services                   │
│ MECHANIC:  Execute Work on ASSIGNED Jobs                    │
│ STAFF:     Manage Bookings & Operations & Team (non-admin)  │
│ ADMIN:     Full System Access                               │
└─────────────────────────────────────────────────────────────┘

         Can Create Users?
         ↓
    ┌────────────────────────────┐
    │   ADMIN ✅   STAFF ✅      │
    │   (all)    (mech/staff)    │
    └────────────────────────────┘

         Can Manage Status?
         ↓
    ┌────────────────────────────┐
    │   ADMIN ✅ (all users)      │
    │   STAFF ✅ (non-admin only)│
    └────────────────────────────┘

         Can Manage Services?
         ↓
    ┌────────────────────────────┐
    │   ADMIN ✅   Others ❌      │
    └────────────────────────────┘
```

---

## 📝 AUDIT LOG

### Changes Made (2024-09-14)
1. ✅ Fixed navigation - Removed invalid menu items
2. ✅ Enhanced staff permissions - Can now manage team status
3. ✅ Added admin protection - Backend validates admin account creation
4. ✅ Improved security - Role-based data isolation verified

### Who Made Changes
- System Architecture Review
- Backend: app.js updated
- Frontend: navigation.js updated
- Documentation: Comprehensive guides created

### Files Modified
- `backend/src/app.js`
- `frontend/src/components/layout/navigation.js`
- Documentation files created (3 guides)

---

## 🚀 NEXT STEPS

1. **Test all roles** using scenarios above
2. **Update passwords** for demo accounts in production
3. **Train admins** on creating and managing users
4. **Monitor** team member creation and status changes
5. **Review** audit logs regularly for access patterns

---

**For technical details, see:**
- ROLE_AUDIT_REPORT.md - Complete permission audit
- ROLE_IMPLEMENTATION_SUMMARY.md - Detailed role structure
- BEFORE_AFTER_COMPARISON.md - Changes made

