const mongoose = require("mongoose");

// Imtihon sessiyasi (oylik/choraklik/yillik)
const examSessionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    type: {
      type: String,
      enum: ["Oylik", "Choraklik", "Yillik"],
      required: true,
    },
    year: { type: Number, required: true },
    month: { type: Number, min: 1, max: 12 }, // monthly bo‘lsa kerak
    quarter: { type: Number, min: 1, max: 4 }, // quarterly bo‘lsa kerak

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

    maxScore: { type: Number, default: 100 }, // Maksimal ball
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    isLocked: { type: Boolean, default: false }, // lock bo‘lsa tahrirga ruxsat yo‘q
  },
  { timestamps: true }
);

// Unikal: bir davr + guruh + fan
examSessionSchema.index(
  {
    schoolId: 1,
    type: 1,
    year: 1,
    month: 1,
    quarter: 1,
    groupId: 1,
    subjectId: 1,
  },
  { unique: true }
);

module.exports = mongoose.model("ExamSession", examSessionSchema);
