const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LessonSchedule",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    title: { type: String, required: true }, // Masalan: "Uyga vazifa"
    description: { type: String, required: true }, // Masalan: "10-betdagi 3-mashq"
  },
  { timestamps: true }
);

const Homework = mongoose.model("Homework", homeworkSchema);
module.exports = Homework;
