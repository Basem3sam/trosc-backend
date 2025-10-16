# 🎓 Trosc Backend

> Backend server for **Trosc**, the student club at [Your College Name], powering authentication, course streaming, events, and more.

---

## 🚀 Overview

This project is the backend system for **Trosc**, a student community website.  
It handles user authentication, course & track management, event scheduling, announcements, and admin dashboards — all secured and scalable.

---

## 🧰 Tech Stack

| Category             | Technologies                                          |
| -------------------- | ----------------------------------------------------- |
| Runtime              | Node.js (Express.js)                                  |
| Database             | MongoDB (Mongoose ODM)                                |
| Security             | Helmet, Rate Limiting, XSS-Clean, HPP, Mongo Sanitize |
| Validation           | Joi                                                   |
| Emailing             | Nodemailer                                            |
| File Uploads         | Multer + Cloudinary                                   |
| Auth                 | JWT (JSON Web Token)                                  |
| Linting & Formatting | ESLint + Prettier                                     |
| Environment          | dotenv                                                |

---

## 🧩 Folder Structure

```
src/
 ├── app.js
 ├── server.js
 ├── controllers/
 ├── models/
 ├── routes/
 ├── services/
 ├── utils/
 ├── middlewares/
 └── config/
```

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the repo

```bash
git clone https://github.com/basem3sam/trosc-backend.git
cd trosc-backend
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Add environment variables

Create a `.env` file in the root directory:

```bash
NODE_ENV=development
PORT=5000
MODE=development

DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/trosc
JWT_SECRET=supersecretkey
JWT_EXPIRES_IN=30d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CORS_ORIGIN=http://localhost:3000
```

_(Don’t forget to replace credentials.)_

### 4️⃣ Start the server

```bash
npm start
```

---

## 🧪 Scripts

| Script           | Description                           |
| ---------------- | ------------------------------------- |
| `npm start`      | Start server in dev mode with nodemon |
| `npm start:prod` | Start server in production            |
| `npm run lint`   | Run ESLint check                      |
| `npm run debug`  | Run in debug mode                     |

---

## 🔐 Security Features

- Helmet for HTTP header protection
- Rate limiting to prevent brute-force
- Sanitization against NoSQL injection & XSS
- Secure JWT-based authentication

---

## 📦 API Modules (In Progress)

- `Auth` — register, login, forgot password
- `Users` — manage profiles
- `Tracks` — stream courses, rate & comment
- `Events` — schedule and manage club events
- `Admin Dashboard` — stats and content control

---

## 🧑‍💻 Author

**Basem Esam Omar**  
Backend Engineer — Node.js | MongoDB | Express.js  
[GitHub Profile](https://github.com/basem3sam)
[LinkedIN Profile](https://linkedin/in/basemesam)

---

## 🏗️ License

This project is licensed under the **ISC License** — feel free to use and improve it for educational purposes.
