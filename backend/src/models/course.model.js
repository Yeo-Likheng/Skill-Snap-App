import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  skill: { type: String, required: true, index: true },  
  title: { type: String, required: true },
  platform: { type: String, required: true },
  url: { type: String, required: true },
  image: { type: String },
});

const Course = mongoose.model("Course", courseSchema);

export default Course;
