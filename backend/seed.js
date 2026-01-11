import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "./models/user.models.js";
import bcrypt from "bcryptjs";

const users = [
  // Rishabh accounts (primary + dummy)
  {
    name: "Rishabh Jain",
    email: "jainrishabh2610@gmail.com",
    password: "password123",
    role: "citizen",
    phone: "8433943227"
  },
  
  {
    name: "Rishabh Jain",
    email: "rishabh.jain.6112@gmail.com",
    password: "password123",
    role: "agency",
    phone: "8433943227"
  },
  
  {
    name: "Rishabh Jain",
    email: "rishabh.jain09610@gmail.com",
    password: "password123",
    role: "coordinator",
    phone: "8433943227"
  },
  
  {
    name: "Aaditya Benke",
    email: "aaditybenke@gmail.com",
    password: "password123",
    role: "citizen",
    phone: "7021127964"
  },
  {
    name: "Aaditya Benke",
    email: "ab@gmail.com",
    password: "password123",
    role: "agency",
    phone: "7021127964"
  },
  {
    name: "Aaditya Benke",
    email: "ab2@gmail.com",
    password: "password123",
    role: "coordinator",
    phone: "7021127964"
  },

  {
    name: "Aarjav Jain",
    email: "aarjav.n.jain205@gmail.com",
    password: "password123",
    role: "citizen",
    phone: "8591768921"
  },
  {
    name: "Aarjav Jain",
    email: "aaj@gmail.com",
    password: "password123",
    role: "agency",
    phone: "8591768921"
  },
  {
    name: "Aarjav Jain",
    email: "aaj2@gmail.com",
    password: "password123",
    role: "coordinator",
    phone: "8591768921"
  },

  {
    name: "Atharva Jadhav",
    email: "atharvai2005@gmail.com",
    password: "password123",
    role: "citizen",
    phone: "7387241068"
  },
  {
    name: "Atharva Jadhav",
    email: "aj@gmail.com",
    password: "password123",
    role: "agency",
    phone: "7387241068"
  },
  {
    name: "Atharva Jadhav",
    email: "aj2@gmail.com",
    password: "password123",
    role: "coordinator",
    phone: "7387241068"
  }
];

mongoose.connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("DB Connected for seeding users");
    seedUsers();
  })
  .catch(err => console.error("DB connection error:", err));

const seedUsers = async () => {
  try {
    // Delete existing user records
    await User.deleteMany({});

    // Manually hash passwords for each user
    const saltRounds = 12;
    const hashedUsers = await Promise.all(users.map(async user => {
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      return { ...user, password: hashedPassword };
    }));

    // Insert user data in bulk with hashed passwords
    await User.insertMany(hashedUsers);
    console.log("User data initialized successfully");
  } catch (error) {
    console.error("Error seeding user data:", error);
  } finally {
    mongoose.connection.close();
  }
};