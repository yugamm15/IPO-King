# ==============================================================================
# IPO KING - DIRECT SUPABASE AUTHENTICATION GUIDE
# ==============================================================================

Your application now directly integrates with **Supabase Auth** (`auth.users`).
You do NOT need to create or maintain custom password/phone/role tables.

---

### **How to Add Users in Supabase Dashboard**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/_/auth/users).
2. Click on **Authentication** in the left sidebar → Select **Users**.
3. Click the green **"Add user"** button (top right) → Choose **"Create user"**.
4. Enter:
   - **User Email**: e.g. `yourname@gmail.com`
   - **User Password**: Enter the user's password.
   - **Auto Confirm User?**: Check **"Auto Confirm User?"** so they can log in immediately without email confirmation links.
5. Click **Create User**.

---

### **How the Login & 2FA Flow Works**

1. **Step 1: Primary Authentication**
   - The user enters their **Email** and **Password** on the IPO KING login page.
   - The backend validates the credentials directly with Supabase Auth (`supabase.auth.signInWithPassword`).

2. **Step 2: 2-Factor Authentication (2FA OTP)**
   - Once Supabase validates the email and password, the system generates a secure 6-digit One-Time Password (OTP).
   - The OTP is immediately emailed to the user's registered email address.

3. **Step 3: Verification & Session Issue**
   - The user enters the 6-digit OTP code received in their email.
   - Upon verification, the user receives their secure JWT session token and gains access to the application.
