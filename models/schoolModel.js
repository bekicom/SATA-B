// models/schoolModel.js
const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  login: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  extraPassword: {
    type: String,
  },
  teacherLogin: {
    type: String,
  },
  teacherPassword: {
    type: String,
  },
  phone: {
    type: String,
    required: true,
  },
  budget: {
    type: Number,
    required: true,
    default: 0,
  },
});

const School = mongoose.model("School", schoolSchema);

module.exports = School;
