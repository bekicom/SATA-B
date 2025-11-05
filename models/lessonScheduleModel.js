const mongoose = require("mongoose");

const lessonScheduleSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    day: {
      type: String,
      enum: [
        "dushanba",
        "seshanba",
        "chorshanba",
        "payshanba",
        "juma",
        "shanba",
      ],
      required: true,
    },
    lessonNumber: {
      type: Number, // 1–11 soat
      required: true,
      min: 1,
      max: 11,
    },
    room: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);


lessonScheduleSchema.index(
  { groupId: 1, day: 1, lessonNumber: 1 },
  { unique: true }
);

const LessonSchedule = mongoose.model("LessonSchedule", lessonScheduleSchema);
module.exports = LessonSchedule;
