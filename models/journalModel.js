const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
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
    date: {
      type: Date,
      default: Date.now, // dars sanasi
    },
    lessonTheme: {
      type: String,
      trim: true,
    },
    students: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        status: {
          type: String,
          enum: ["Keldi", "Sababli", "Sababsiz", "Kelmadi"],
          default: "Keldi",
        },
        grade: {
          type: Number,
          min: 1,
          max: 5,
          default: null,
        },
      },
    ],
  },
  { timestamps: true }
);

const Journal = mongoose.model("Journal", journalSchema);

module.exports = Journal;
