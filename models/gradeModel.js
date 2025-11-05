const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LessonSchedule",
      required: true, // 🔑 Aynan qaysi dars (masalan 3-soat fizika)
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true, // 🔑 Qaysi guruh (masalan B guruh)
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true, // 🔑 Qaysi fan (masalan Fizika)
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true, // 🔑 Qaysi o‘quvchi (masalan Axadjon)
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    grade: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
    },
    status: {
      type: String,
      enum: ["kelgan", "sababli", "ishtirok etmagan"],
      default: "kelgan",
    },
  },
  { timestamps: true }
);

const Grade = mongoose.models.Grade || mongoose.model("Grade", gradeSchema);
module.exports = Grade;
