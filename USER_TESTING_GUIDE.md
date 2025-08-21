# 🧪 BrainBased EMDR Platform - User Testing Guide

## Quick Test Accounts

All test accounts are seeded and ready to use. Simply logout and login with different accounts to test each role.

### 👨‍💼 ADMIN TESTING
**Login:** `admin@brainbasedemdr.com` / `admin123`

**Test Scenarios:**
1. **Dashboard Overview**
   - ✅ View system statistics (users, sessions, revenue, health)
   - ✅ Check quick actions menu
   - ✅ Navigate between tabs (Overview, Activity, Approvals, System, Evaluations)

2. **Certificate Management**
   - ✅ Go to "Approvals" tab
   - ✅ See pending certificates (Sarah Johnson should have 42 hours)
   - ✅ Preview certificate
   - ✅ Approve and issue certificate
   - ✅ Test certificate designer: `/admin/certificates/designer`

3. **System Management**
   - ✅ Export student progress CSV
   - ✅ Export consultant earnings CSV
   - ✅ View evaluations and logs
   - ✅ Access system health metrics

### 👩‍🎓 STUDENT TESTING
**Login:** `student1@example.com` / `student123` (42 hours - eligible for cert)
**Login:** `student2@example.com` / `student123` (25 hours - in progress)  
**Login:** `student3@example.com` / `student123` (8 hours - just started)

**Test Scenarios:**
1. **Dashboard Overview**
   - ✅ View progress tracking (hours completed vs required)
   - ✅ See upcoming and completed sessions
   - ✅ Check certificate status widget

2. **Session Management**
   - ✅ View `/sessions` - see session history
   - ✅ Submit reflections and evaluations for completed sessions
   - ✅ Access session recordings (if available)

3. **Scheduling**
   - ✅ Go to `/schedule` to book new consultation sessions
   - ✅ View available time slots from consultants
   - ✅ Book new sessions

4. **Progress Tracking**
   - ✅ Access `/progress` page
   - ✅ View detailed hour breakdown
   - ✅ Download progress PDF

5. **Certificate Access** (for student1 with 42 hours)
   - ✅ Admin approves certificate first
   - ✅ View "My Certificate" widget on dashboard
   - ✅ Download certificate PDF
   - ✅ Access verification page

### 👨‍⚕️ CONSULTANT TESTING
**Login:** `consultant1@example.com` / `consultant123` (Dr. Lisa Thompson)
**Login:** `consultant2@example.com` / `consultant123` (Dr. James Wilson)

**Test Scenarios:**
1. **Dashboard Overview**
   - ✅ View upcoming and recent sessions
   - ✅ See earnings summary
   - ✅ Quick session management

2. **Session Management**
   - ✅ View `/sessions` - see all sessions
   - ✅ Provide feedback for completed sessions
   - ✅ Mark sessions as completed
   - ✅ Verify student attendance

3. **Availability Management**
   - ✅ Go to `/availability`
   - ✅ Set weekly schedule (Mon-Sun time blocks)
   - ✅ Add blocked/exception dates
   - ✅ Update availability preferences

4. **Earnings & Reports**
   - ✅ View monthly earnings breakdown
   - ✅ Export earnings CSV
   - ✅ Track session-based payments

## 🔄 Complete End-to-End Workflow Test

**Scenario:** New student completes 40+ hours and gets certified

1. **Student Registration** (Manual via admin or Kajabi webhook)
2. **Student Books Sessions** - Schedule with available consultants
3. **Video Sessions** - Join session, consultant verifies attendance  
4. **Post-Session** - Student submits reflection, consultant provides feedback
5. **Hours Tracking** - System tracks verified hours toward 40-hour requirement
6. **Certificate Eligibility** - Student reaches 40+ hours, appears in admin approvals
7. **Admin Approval** - Admin reviews and approves certificate
8. **Certificate Generation** - System generates branded PDF with QR verification
9. **Student Access** - Student downloads certificate, can verify authenticity
10. **Public Verification** - Anyone can verify certificate via QR code or verification page

## 🐛 Issues to Watch For

1. **API Double Prefix** - Fixed, but monitor for `/api/api/` in requests
2. **JSON Parsing Errors** - Should be resolved, watch console
3. **WebSocket Connections** - Expected to show connection errors (video sessions not fully implemented)
4. **Tab Navigation** - Admin panel tabs should switch properly without 404s
5. **Authentication Flow** - Login/logout should work smoothly across all roles

## 🎯 Success Criteria

### Platform Fully Functional When:
- ✅ All 3 user roles can login successfully
- ✅ Admin dashboard shows real data and allows certificate management
- ✅ Students can view progress, book sessions, access certificates
- ✅ Consultants can manage availability, view earnings, handle sessions
- ✅ No console errors preventing functionality
- ✅ Core workflows (booking → session → certification) work end-to-end

## 🚀 Next Development Priorities

Based on TODO.md analysis:

**P0 Critical (Launch Blockers):**
1. Video session reliability (TURN/STUN, multi-participant testing)
2. Consultant default availability seeding  
3. Production operations (SSL, backups, monitoring)

**P1 High Priority:**
1. Security hardening (CORS, rate limiting, RLS audit)
2. Timezone handling and scheduling improvements
3. Enhanced evaluations/logs admin interface
4. Comprehensive testing & CI/CD

**P2 Future Enhancements:**
1. Phase 2 directory feature
2. Email delivery infrastructure  
3. Accessibility improvements
4. Performance optimizations

---

**Last Updated:** Manual testing guide created for comprehensive user role validation.
