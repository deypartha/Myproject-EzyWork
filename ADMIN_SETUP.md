# EzyWork Admin Authentication System

## Overview

This document provides setup instructions for the admin authentication system with CRUD operations for users and workers through an admin dashboard.

---

## ✨ Features

- **Unique Admin Authentication**: Separate login for admin users
- **Secure Admin Dashboard**: Only accessible to users with admin role
- **User Management**: View, edit, and delete user accounts
- **Worker Management**: View, edit, and delete worker profiles
- **Dashboard Statistics**: Real-time overview of total users and workers
- **Role-Based Access Control**: Only admins can access admin features

---

## 🚀 Setup Instructions

### Step 1: Start the Backend Server

Ensure MongoDB is running, then start your backend:

```bash
cd backend
npm start
```

### Step 2: Create the Initial Admin User

Run the seed script to create the first admin account:

```bash
node backend/seed-admin.js
```

You should see:

```
✓ Connected to MongoDB
✓ Admin user created successfully!

Admin Credentials:
Email: admin@ezywork.com
Password: Admin@123

⚠ WARNING: Change the admin password after first login!
```

### Step 3: Start the Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

### Step 4: Access Admin Portal

Navigate to:

```
http://localhost:5173/admin/login
```

Or click the admin login link from the home page.

**Default Admin Credentials:**

- Email: `admin@ezywork.com`
- Password: `Admin@123`

---

## 📱 Admin Dashboard Features

### 1. Overview Tab

Displays:

- Total number of users
- Total number of workers
- Quick statistics at a glance

### 2. Users Tab

Manage all user accounts:

- **View** all users with details (Name, Email, Join Date)
- **Edit** user information (Name, Email)
- **Delete** user accounts

### 3. Workers Tab

Manage all worker profiles:

- **View** all workers with skills and details
- **Edit** worker information (Name, Email, Skills, etc.)
- **Delete** worker profiles

---

## 🔌 API Endpoints

All endpoints require admin authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Admin Setup

- **POST** `/api/admin/setup`
  - Create admin user (one-time setup)
  - Body: `{ name, email, password }`

### Dashboard

- **GET** `/api/admin/dashboard/stats`
  - Get dashboard statistics

### Users Management

- **GET** `/api/admin/users`
  - Get all users
- **GET** `/api/admin/users/:id`
  - Get single user by ID
- **PUT** `/api/admin/users/:id`
  - Update user (name, email)
  - Body: `{ name?, email? }`
- **DELETE** `/api/admin/users/:id`
  - Delete user

### Workers Management

- **GET** `/api/admin/workers`
  - Get all workers
- **GET** `/api/admin/workers/:id`
  - Get single worker by ID
- **PUT** `/api/admin/workers/:id`
  - Update worker (name, email, skills, etc.)
  - Body: `{ name?, email?, skills?, number?, fullName?, location?, yearsOfExperience?, typeOfWork? }`
- **DELETE** `/api/admin/workers/:id`
  - Delete worker

---

## 🔐 Authentication Flow

1. Admin visits `/admin/login`
2. Admin enters email and password
3. System validates credentials against database
4. If valid, JWT token is generated and stored in localStorage
5. Admin is redirected to `/admin/dashboard`
6. All subsequent requests include the token in Authorization header
7. Backend middleware verifies token and admin role

---

## 🛡️ Security Features

- **Password Hashing**: Passwords are hashed using bcryptjs
- **JWT Token**: Secure token-based authentication
- **Role Verification**: Every request checks if user is admin
- **Token Expiry**: Tokens expire after 7 days
- **Protected Routes**: Dashboard routes are protected with RoleProtectedRoute

---

## 🔄 How It Works

### Backend Architecture

1. **adminAuth.js** (Middleware)
   - `verifyAdminToken`: Verifies JWT token
   - `isAdmin`: Checks if user has admin role

2. **adminController.js** (Business Logic)
   - CRUD operations for users and workers
   - Dashboard statistics

3. **adminRoutes.js** (API Routes)
   - All admin endpoints with authentication

### Frontend Architecture

1. **AdminLogin.jsx**
   - Standalone login page for admins
   - Validates credentials
   - Stores token in localStorage

2. **AdminDashboard.jsx**
   - Main admin interface
   - Tabs for Overview, Users, and Workers
   - Edit/Delete functionality

---

## 📝 Usage Examples

### Using cURL to Test API

#### Login as Admin

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ezywork.com",
    "password": "Admin@123"
  }'
```

#### Get All Users

```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update a User

```bash
curl -X PUT http://localhost:3000/api/admin/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Updated Name",
    "email": "updated@email.com"
  }'
```

#### Delete a User

```bash
curl -X DELETE http://localhost:3000/api/admin/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 Troubleshooting

### Admin Login Not Working

- Verify MongoDB is running
- Check if admin user exists: run seed script again
- Ensure backend server is running on port 3000
- Check browser console for errors

### Can't Access Dashboard

- Make sure you're logged in with admin credentials
- Check token in localStorage
- Verify your role is "admin" in the database

### CRUD Operations Failing

- Verify the token is still valid (not expired)
- Check user/worker ID is correct
- Ensure required fields are provided in request body

### Workers Not Showing

- Ensure workers are registered in the database
- Check if workers data is being fetched correctly
- Try refreshing the dashboard

---

## 🔑 Changing Admin Password

1. Login to admin dashboard
2. ⚠️ **Current Implementation Note**: Direct password change UI not yet implemented
3. To change password, use MongoDB client:
   ```javascript
   db.users.updateOne(
     { email: "admin@ezywork.com" },
     { $set: { password: bcrypt.hashSync("newPassword", 10) } },
   );
   ```

---

## 📊 Database Schema

### User Model (with admin)

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: "user" | "worker" | "admin",
  createdAt: Date,
  updatedAt: Date
}
```

### Admin Privileges

- Can view all users
- Can view all workers
- Can edit user/worker information
- Can delete users/workers
- Can view dashboard statistics

---

## 🎯 Next Steps (Optional Enhancements)

1. **Advanced Filtering**: Filter users/workers by date range, status, etc.
2. **Batch Operations**: Delete multiple users/workers at once
3. **Export Data**: Export user/worker data to CSV/PDF
4. **Admin Profile**: Admin can edit their own profile and password
5. **Activity Logs**: Track all admin actions for security
6. **Email Notifications**: Send notifications on important events
7. **Two-Factor Authentication (2FA)**: Enhanced security
8. **Admin Dashboard Analytics**: Advanced charts and graphs

---

## 📞 Support

For issues or questions:

1. Check this documentation
2. Review the troubleshooting section
3. Check browser console for errors
4. Review server logs for backend errors

---

## Version

- Current Version: 1.0.0
- Last Updated: 2026

---

**Remember**: Always use secure passwords and change default credentials after initial setup!
