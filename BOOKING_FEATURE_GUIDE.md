# Booking Service Feature - Testing Guide

## Features Implemented

### 1. **Enhanced Book Service Page** (`/book`)
A streamlined 4-step booking process with real-time availability checking.

#### Features:
- ✅ Vehicle selection with live details display
- ✅ Service selection with pricing and duration
- ✅ Dynamic time slot availability based on selected date
- ✅ Problem description and additional notes fields
- ✅ Real-time validation and error messages
- ✅ Success confirmation with auto-reset form

#### How to Use:
1. Navigate to "Book Service" from sidebar
2. Select a vehicle from dropdown
3. Choose desired service (displays price & duration)
4. Select booking date (minimum: today)
5. Time slots auto-populate based on availability
6. Add problem description (optional)
7. Click "Confirm Booking"

---

### 2. **My Bookings Page** (`/bookings`)
Complete booking management dashboard with filtering and actions.

#### Features:
- ✅ View all personal bookings
- ✅ Filter by status: All / Active / Past
- ✅ Booking details: date, time, cost, vehicle, service
- ✅ Status badges with visual indicators
- ✅ Reschedule active bookings
- ✅ Cancel bookings (with reason)
- ✅ Booking ID for reference

#### How to Use:
1. Navigate to "Bookings" from sidebar
2. Use filter buttons to view different booking statuses
3. Click "Reschedule" to change date/time
4. Click "Cancel" to cancel booking
5. Follow modal dialogs for actions

---

### 3. **Booking Status Management**
Comprehensive status tracking throughout booking lifecycle.

#### Status Flow:
```
Pending → Confirmed → Assigned → Inspection → In Progress → Waiting for Parts → Completed
                                                     ↓
                                                 Cancelled/Rejected
```

#### Customer Actions by Status:
- **Pending, Confirmed, Assigned, Inspection**: Can reschedule or cancel
- **In Progress, Waiting for Parts**: Can only view (no actions)
- **Completed, Cancelled, Rejected**: View only (locked)

---

## Testing Scenarios

### Scenario 1: Complete a Booking
```
1. Navigate to Book Service
2. Select any active vehicle
3. Select any active service
4. Select a future date
5. Select an available time slot
6. Add problem description
7. Click Confirm
✓ Expected: Success message, form resets, notification received
```

### Scenario 2: Check Time Slot Availability
```
1. Go to Book Service
2. Select a vehicle
3. Select a service
4. Pick a date with existing bookings
✓ Expected: Available slots shown (excluding booked times)
```

### Scenario 3: Reschedule a Booking
```
1. Go to My Bookings
2. Find an active booking
3. Click "Reschedule"
4. Select new date
5. Available slots load automatically
6. Select new time
7. Confirm reschedule
✓ Expected: Booking updates, status history shows change
```

### Scenario 4: Cancel a Booking
```
1. Go to My Bookings
2. Find an active booking (not "In Progress")
3. Click "Cancel"
4. Optionally add cancellation reason
5. Click "Yes, Cancel Booking"
✓ Expected: Status changes to Cancelled, customer notified
```

### Scenario 5: View Booking History
```
1. Go to My Bookings
2. Click "Past" filter tab
✓ Expected: Only Completed, Cancelled, Rejected bookings shown
```

---

## Backend API Endpoints

### New Endpoints Added

#### 1. Get Booking Details
```
GET /api/bookings/:id
Authentication: Required (Bearer token)
Response: Full booking object with all populated relationships
```

#### 2. Check Slot Availability
```
GET /api/bookings/available-slots/:date
Authentication: Required
Params: date (YYYY-MM-DD format)
Response: { date, availableSlots: [], bookedSlots: [] }
```

#### 3. Cancel Booking
```
PATCH /api/bookings/:id/cancel
Authentication: Required
Body: { reason: "string" }
Validations:
  - Cannot cancel already completed/cancelled bookings
  - Customer can only cancel own bookings
Response: Updated booking with Cancelled status
```

#### 4. Reschedule Booking
```
PATCH /api/bookings/:id/reschedule
Authentication: Required
Body: { newDate: "YYYY-MM-DD", newTimeSlot: "HH:MM AM/PM" }
Validations:
  - Cannot reschedule in-progress bookings
  - New slot must be available
  - Cannot reschedule to past dates
Response: Updated booking with new date/time
```

---

## UI/UX Enhancements

### Visual Improvements:
- ✨ Color-coded status badges with emojis
- 🎨 Responsive grid layouts
- 📱 Mobile-friendly design
- ⚡ Real-time loading indicators
- 🎯 Clear step-by-step guidance

### Error Handling:
- ❌ Validation messages for invalid inputs
- 🚫 Prevents double-booking
- ⚠️ Alerts for past dates
- 📢 Inline error messages

---

## Booking Components

### Reusable Components Created:

#### 1. BookingCard
- Displays booking information in card format
- Shows status with visual indicators
- Optional action buttons (Reschedule, Cancel)
- Can be used in dashboards and lists

#### 2. BookingStatusTimeline
- Shows booking status history
- Visual timeline with timestamps
- Status notes and change details
- Emoji indicators for each status

---

## Data Validation

### Booking Creation:
- ✓ Vehicle must belong to customer and be active
- ✓ Service must be active
- ✓ Date must be today or future
- ✓ Time slot must not already be booked
- ✓ Cannot book same slot twice (excludes cancelled/rejected)

### Rescheduling:
- ✓ New date must be future date
- ✓ New slot must be available
- ✓ Cannot reschedule in-progress bookings
- ✓ Cannot reschedule past bookings

### Cancellation:
- ✓ Cannot cancel completed bookings
- ✓ Cannot cancel already cancelled bookings
- ✓ Cannot cancel rejected bookings

---

## Notifications

Customers receive notifications for:
- ✓ Booking creation: "Your booking is pending confirmation"
- ✓ Status updates: "Your booking is now [status]"
- ✓ Cancellation: "Your booking has been cancelled"
- ✓ Reschedule: "Your booking has been rescheduled to [date] [time]"

---

## Technical Details

### Files Modified:
1. `backend/src/app.js` - Added 4 new booking endpoints
2. `frontend/src/api.js` - Added patch() helper function
3. `frontend/src/App.jsx` - Added MyBookingsPage import and routes

### Files Created:
1. `frontend/src/pages/customer/BookServicePage.jsx` - Enhanced booking form
2. `frontend/src/pages/customer/MyBookingsPage.jsx` - Booking management dashboard
3. `frontend/src/components/common/BookingCard.jsx` - Reusable booking card
4. `frontend/src/components/common/BookingStatusTimeline.jsx` - Status timeline

---

## Troubleshooting

### Issue: "No available slots" for any date
- Check if there are bookings for that date
- Ensure service has available time slots (09:00, 11:00, 02:00, 04:00)
- Verify date is not in the past

### Issue: Reschedule button not showing
- Booking must have status: Pending, Confirmed, Assigned, or Inspection
- In-progress bookings cannot be rescheduled

### Issue: Cannot cancel booking
- Completed, Cancelled, or Rejected bookings cannot be cancelled
- Only active bookings (Pending to Waiting for Parts) can be cancelled

---

## Performance Notes

- Available slots load dynamically (no page reload needed)
- Bookings list paginates for large datasets
- Status updates reflected in real-time
- Notifications created on status changes

---

## Next Steps / Future Enhancements

1. Email/SMS notifications
2. Booking reminders
3. Calendar view for availability
4. Booking history export (PDF)
5. Deposit payment before confirmation
6. Multi-slot booking
7. Booking analytics and reports
8. Recurring bookings
