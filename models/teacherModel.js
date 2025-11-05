const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  birthDate: {
    type: Date,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  science: {
    type: String,
    default: false,
  },

  // 💰 1 soatlik narx (stavka)
  price: {
    type: Number,
    required: true,
    min: 1,
  },

  // 🕒 O‘qituvchining haftada qancha soat darsi borligi (umumiy soat)
  hour: {
    type: Number,
    required: true,
    min: 1,
  },

  // 📅 Haftalik dars jadvali (kunlik dars soatlari)
  schedule: {
    type: {
      dushanba: { type: Number, default: 0 },
      seshanba: { type: Number, default: 0 },
      chorshanba: { type: Number, default: 0 },
      payshanba: { type: Number, default: 0 },
      juma: { type: Number, default: 0 },
      shanba: { type: Number, default: 0 },
    },
    required: true,
    _id: false,
  },

  classLeader: {
    type: String,
    default: "",
  },

  // 🏦 Oylik maoshi (hisoblangan natija saqlanishi uchun)
  monthlySalary: { type: Number, required: true },

  // 🔄 Qo‘shimcha darslar va to‘lovlar
  exchange_classes: {
    type: [
      {
        lesson_quantity: Number,
        month: String,
        extra_charge: Number,
        createdAt: String,
      },
    ],
    required: true,
    default: [],
  },

  // ✅ Hikvision uchun noyob identifikator
  employeeNo: {
    type: String,
    unique: true,
    sparse: true, // barcha o‘qituvchilarda bo‘lishi shart emas
    default: null,
  },

  // 🔑 Login va Parol
  login: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // API javobida qaytmasligi uchun
  },
});

// 🔎 Qo‘shimcha virtual property: FullName
teacherSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;
