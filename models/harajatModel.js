const mongoose = require("mongoose");

const harajatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    comment: {
      type: String,
      trim: true,
    },
    summ: {
      type: Number,
      required: true,
      min: 0,
    },
    schoolId: {
      type: String,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["naqd", "plastik", "bankshot"], // ✅ yangi qiymat qo‘shildi
      required: true,
      default: "naqd",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Harajat", harajatSchema);
