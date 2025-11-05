const mongoose = require("mongoose");

const teacherDavomatSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    body: [
      {
        teacher_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Teacher",
          required: true,
        },
        employeeNo: { type: String, required: true },
        time: { type: String, required: true }, // kelish vaqti
        quittedTime: { type: String }, // ketish vaqti
        status: {
          type: String,
          enum: ["keldi", "ketdi", "kelmadi"], // 🔥 'ketdi' qo‘shildi
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// 📌 Bir maktab + bir kun = bitta hujjat
teacherDavomatSchema.index({ schoolId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model("TeacherDavomat", teacherDavomatSchema);
