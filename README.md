<h1 align="center">🐦 Twitter Clone Backend</h1>
<p align="center">
A complete Twitter-like REST API built with Node.js, Express, SQLite & JWT Authentication
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white">
  <img src="https://img.shields.io/badge/SQLite-Database-07405E?style=for-the-badge&logo=sqlite&logoColor=white">
  <img src="https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white">
  <img src="https://img.shields.io/badge/Status-Completed-brightgreen?style=for-the-badge">
</p>

---

# 📌 Overview

This project is a **Twitter-like backend** API built using:

- **Node.js**
- **Express.js**
- **SQLite Database**
- **JWT for Authentication**
- **bcrypt for Password Hashing**

It supports **user registration**, **login**, **tweet creation**, **likes**, **replies**, **followers**, and **protected APIs**.

---

# 🚀 Features

### 🔐 Authentication
- Register new users  
- Login with password validation  
- JWT token generation  
- Authentication middleware  

### 🐦 Tweets Module
- Create a tweet  
- View personal tweets  
- View tweet details (likes, replies, datetime)  
- Delete only your own tweets  
- Tweet feed (from following users)  

### 👥 Follower System
- List of users you follow  
- List of users who follow you  

### ❤️ Likes & Replies
- Who liked the tweet  
- Replies with name and text  
- Only accessible if you follow the tweet’s owner  

---

# 📦 Installation

### 1️⃣ Clone the Repository  

```sh
git clone https://github.com/your-username/twitter-clone-backend.git
cd twitter-clone-backend
```


2️⃣ Install Dependencies

```sh
npm install
```

3️⃣ Start Server

```sh
node app.js
```

4️⃣ Server URL
```sh
http://localhost:3000/
```

---

# 🛠️ API Endpoints
### 🔐 Authentication
- Method	Endpoint	Description
- POST	/register/	Register user
- POST	/login/	Login & get JWT


### 👥 User Following APIs
- Method	Endpoint	Description
- GET	/user/following/	People user follows
- GET	/user/followers/	People following user



### 🐦 Tweets APIs
**Method	Endpoint	Description**
- GET	/user/tweets/feed/	Feed of following users
- GET	/tweets/:tweetId/	Tweet details
- GET	/tweets/:tweetId/likes/	Who liked the tweet
- GET	/tweets/:tweetId/replies/	Replies list
- GET	/user/tweets/	User’s own tweets
- POST	/user/tweets/	Create tweet
- DELETE	/tweets/:tweetId/	Delete tweet


# 📁 Database Schema
*Includes 5 tables:*
- user
  follower
- tweet
- like
- reply

# 🔑 Sample Login Credentials
```
{
  "username": "JoeBiden",
  "password": "biden@123"
}
```

# 📸 Screenshots

<img width="1907" height="966" alt="image" src="https://github.com/user-attachments/assets/087ab8dc-d7e6-46bc-9820-56e0519ce57f" />


# 🧑‍💻 Author

### C. Moulidhar 
CSE Graduate
Passionate about backend systems & API development.
