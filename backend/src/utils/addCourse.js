import mongoose from "mongoose";
import Course from "../models/course.model.js";
import { connectDB } from "./db.js";
import fs from 'fs';

const courses = JSON.parse(fs.readFileSync(new URL('./courses.json', import.meta.url)));

async function add() {
  try {
    await connectDB();

    /* await Course.deleteMany({});
    console.log("Cleared existing courses"); */

    await Course.insertMany(courses);
    console.log("Seeded courses");

    await mongoose.disconnect();
    console.log("Disconnected from DB");
  } catch (error) {
    console.error("Seeding error:", error);
  }
}

add();
