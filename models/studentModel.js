const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    passportNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    admissionDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // 🔥 Qaysi oydan boshlab nofaol
    inactiveFrom: {
      type: String, // format: "MM-YYYY"
      default: null,
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["O'g'ilbola", "Qizbola"],
      required: true,
    },

    birthDate: {
      type: Date,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    guardianPhoneNumber: {
      type: String,
      trim: true,
    },

    source: {
      type: String,
      enum: ["Telegram", "Instagram", "Sayt", "Do'st", "Reklama", "Banner"],
      required: true,
    },

    // 🔥 To‘lovlar tarixi
    payments: [
      {
        amount: Number,
        date: { type: Date, default: Date.now },
        method: {
          type: String,
          enum: ["naqd", "plastik", "click", "payme", "boshqa"],
        },
      },
    ],

    monthlyFee: {
      type: Number,
      default: 0,
    },

    // Hikvision uchun identifikator
    employeeNo: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true },
);

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
