const mongoose = require("mongoose");

// 🔹 Har kuni qo'shilgan oylik yozuvi uchun kichik schema
const salaryLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },

    // ✅ Duplicate tekshiruv uchun string kalit ("2026-02-22")
    dateKey: { type: String, default: null },

    hours: { type: Number, default: 0 },
    amount: { type: Number, required: true },

    // ✅ required: false — davomat logida paymentType bo'lmasligi mumkin
    paymentType: {
      type: String,
      enum: ["naqd", "karta", "bank", null],
      default: null,
      required: false,
    },

    reason: {
      type: String,
      enum: ["davomat", "manual"],
      default: "davomat",
    },
  },
  { _id: false },
);

const salarySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    teacher_fullname: {
      type: String,
      required: true,
    },
    salaryAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    paymentMonth: {
      type: String, // "YYYY-MM"
      required: true,
    },
    logs: {
      type: [salaryLogSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// 🔎 Bitta o'qituvchi, bitta maktab, bitta oy uchun bitta hujjat
salarySchema.index(
  { teacherId: 1, schoolId: 1, paymentMonth: 1 },
  { unique: true },
);

module.exports = mongoose.model("Salary", salarySchema);
