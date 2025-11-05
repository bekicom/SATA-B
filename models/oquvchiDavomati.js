const mongoose = require("mongoose");

const oquvchiDavomatiSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    date: {
      type: Date, // kun boshiga normalize qilingan
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    body: [
      {
        student_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        employeeNo: { type: String, required: true },
        time: { type: String, required: true }, // HH:mm:ss
        status: { type: String, enum: ["keldi", "ketdi"], required: true },
        quittedTime: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("OquvchiDavomati", oquvchiDavomatiSchema);
