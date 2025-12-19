const mongoose = require("mongoose");

// Imtihon sessiyasi (oylik/choraklik/yillik)
const examSessionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["Oylik", "Choraklik", "Yillik"],
      required: true,
      index: true,
    },

    year: { type: Number, required: true, index: true },

    // ✅ default null qildik
    month: { type: Number, min: 1, max: 12, default: null },
    quarter: { type: Number, min: 1, max: 4, default: null },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    maxScore: { type: Number, default: 100 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Type bo‘yicha majburiy fieldlarni tekshiradi va boshqalarini tozalaydi
examSessionSchema.pre("validate", function (next) {
  if (this.type === "Oylik") {
    if (!this.month)
      return next(new Error("Oylik imtihon uchun month majburiy"));
    this.quarter = null; // oylikda quarter bo‘lmasin
  }

  if (this.type === "Choraklik") {
    if (!this.quarter)
      return next(new Error("Choraklik imtihon uchun quarter majburiy"));
    this.month = null; // choraklikda month bo‘lmasin
  }

  if (this.type === "Yillik") {
    this.month = null;
    this.quarter = null;
  }

  next();
});

// ✅ Unikal: bir davr + guruh + fan (month/quarter null bo‘lib boshqariladi)
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
