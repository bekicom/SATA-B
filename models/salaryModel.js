const mongoose = require("mongoose");

// 🔹 Har kuni qo‘shilgan oylik yozuvi uchun kichik schema
const salaryLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // Sana
    hours: { type: Number, required: true }, // Necha soat dars o‘tilgan
    amount: { type: Number, required: true }, // Shu kunda qo‘shilgan summa
    reason: {
      type: String,
      enum: ["davomat", "manual"], // Qayerdan qo‘shilgan
      default: "davomat",
    },
  },
  { _id: false }
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
      default: 0, // umumiy yig‘indi
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
      type: [salaryLogSchema], // kunlik yozuvlar
      default: [],
    },
  },
  { timestamps: true }
);

// 🔎 Bitta o‘qituvchi, bitta maktab, bitta oy uchun bitta hujjat
salarySchema.index(
  { teacherId: 1, schoolId: 1, paymentMonth: 1 },
  { unique: true }
);

module.exports = mongoose.model("Salary", salarySchema);
