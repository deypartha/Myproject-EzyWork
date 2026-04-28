# Admin Portal - Quick Reference

## 🚀 Quick Start

### Access Points

- **Admin Login**: `http://localhost:5173/admin/login`
- **Dashboard**: `http://localhost:5173/admin/dashboard`

### Default Credentials

```
Email: admin@ezywork.com
Password: Admin@123
```

---

## 📊 Dashboard Sections

| Section      | Features                                    |
| ------------ | ------------------------------------------- |
| **Overview** | Total Users, Total Workers, Recent Activity |
| **Users**    | View, Edit, Delete User Accounts            |
| **Workers**  | View, Edit, Delete Worker Profiles          |

---

## ⚡ Common Tasks

### View All Users

1. Go to **Admin Dashboard**
2. Click **Users** tab
3. See list of all users with Email, Name, Join Date

### Edit User

1. Find user in Users list
2. Click **Edit** (pencil icon)
3. Modify Name/Email
4. Click **Save**

### Delete User

1. Find user in Users list
2. Click **Delete** (trash icon)
3. Confirm deletion

### View All Workers

1. Go to **Admin Dashboard**
2. Click **Workers** tab
3. See list with Skills, Name, Email

### Edit Worker

1. Find worker in Workers list
2. Click **Edit** (pencil icon)
3. Modify Name, Email, Skills, etc.
4. Click **Save**

### Delete Worker

1. Find worker in Workers list
2. Click **Delete** (trash icon)
3. Confirm deletion

---

## 🔑 API Endpoints Summary

```
GET    /api/admin/dashboard/stats        - Dashboard stats
GET    /api/admin/users                  - All users
GET    /api/admin/users/:id              - Single user
PUT    /api/admin/users/:id              - Update user
DELETE /api/admin/users/:id              - Delete user
GET    /api/admin/workers                - All workers
GET    /api/admin/workers/:id            - Single worker
PUT    /api/admin/workers/:id            - Update worker
DELETE /api/admin/workers/:id            - Delete worker
```

All endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🛡️ Security Checklist

- ✅ Passwords are hashed with bcryptjs
- ✅ JWT tokens expire after 7 days
- ✅ Only admin role can access dashboard
- ✅ All requests are authenticated
- ✅ Role verification on every endpoint

---

## 📲 Files Created/Modified

### Backend

- `backend/middlewares/adminAuth.js` - Admin authentication middleware
- `backend/controllers/adminController.js` - CRUD operations controller
- `backend/routes/adminRoutes.js` - Admin API routes
- `backend/seed-admin.js` - Admin user creation script
- `backend/server.js` - Added admin routes

### Frontend

- `frontend/src/components/UI/auth/AdminLogin.jsx` - Admin login page
- `frontend/src/components/UI/admin/AdminDashboard.jsx` - Admin dashboard
- `frontend/src/App.jsx` - Added admin routes

### Documentation

- `ADMIN_SETUP.md` - Complete setup guide
- `ADMIN_QUICK_REF.md` - This file

---

## 🔧 Setup Commands

### Create Admin User

```bash
cd backend
node seed-admin.js
```

### Start Backend

```bash
cd backend
npm start
```

### Start Frontend

```bash
cd frontend
npm run dev
```

---

## ⚠️ Important Notes

1. **Change Default Password**: After first login, change the admin password
2. **Secure Environment**: Keep JWT_SECRET safe in .env file
3. **Database Backups**: Regularly backup your MongoDB database
4. **Token Management**: Tokens expire after 7 days, user will need to login again

---

## 🐛 Quick Troubleshooting

| Issue                    | Solution                                         |
| ------------------------ | ------------------------------------------------ |
| Can't login              | Verify admin user exists (run seed-admin.js)     |
| Dashboard not loading    | Check if token is valid in localStorage          |
| CRUD operations failing  | Ensure you're logged in and token hasn't expired |
| MongoDB connection error | Verify MongoDB is running                        |

---

## 📞 Need Help?

Refer to `ADMIN_SETUP.md` for detailed documentation and examples.
