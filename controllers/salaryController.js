const Salary = require("../models/salaryModel");
const Teacher = require("../models/teacherModel");
const School = require("../models/schoolModel");
const Harajat = require("../models/harajatModel");
const mongoose = require("mongoose");
const moment = require("moment");

// 💰 Admin tomonidan qo'lda oylik to'lash
exports.paySalary = async (req, res) => {
  try {
    const { teacherId, salaryAmount, paymentMonth, paymentType } = req.body;
    const { schoolId } = req.user;

    // ✅ To'lov turi validatsiyasi
    if (!["naqd", "karta", "bank"].includes(paymentType)) {
      return res.status(400).json({ message: "Noto'g'ri to'lov turi" });
    }

    // ✅ O'qituvchini topish
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }

    // 💸 Harajat sifatida yozish (to'lov turini map qilish)
    const paymentTypeMap = {
      naqd: "naqd",
      karta: "plastik",
      bank: "bankshot",
    };

    await Harajat.create({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      name: `${teacher.firstName} ${teacher.lastName}`, // ✅ Name qo'shildi
      categoryTitle: "Oylik to'lovi",
      summ: salaryAmount,
      paymentType: paymentTypeMap[paymentType],
      description: `${paymentMonth} oyi uchun oylik to'lovi`,
      createdAt: new Date(),
    });

    // 💰 Salary hujjatiga yozish
    const updated = await Salary.findOneAndUpdate(
      {
        teacherId,
        schoolId: new mongoose.Types.ObjectId(schoolId),
        paymentMonth,
      },
      {
        $inc: { salaryAmount },
        $setOnInsert: {
          teacher_fullname: teacher.firstName + " " + teacher.lastName,
        },
        $push: {
          logs: {
            date: new Date(),
            hours: 0,
            amount: salaryAmount,
            paymentType,
            reason: "manual",
          },
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: "Oylik muvaffaqiyatli to'landi",
      data: updated,
    });
  } catch (err) {
    console.error("paySalary xatolik:", err);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};

// 📊 Oy bo'yicha umumiy oylik
exports.getMonthlySalarySummary = async (req, res) => {
  try {
    const { schoolId } = req.user;

    const result = await Salary.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: "$paymentMonth",
          totalSalary: { $sum: "$salaryAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(
      result.map((r) => ({
        paymentMonth: r._id,
        totalSalary: r.totalSalary,
      }))
    );
  } catch (error) {
    console.error("getMonthlySalarySummary xatolik:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 📥 Barcha oyliklar
exports.getSalary = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const salaries = await Salary.find({ schoolId });
    res.status(200).json(salaries);
  } catch (err) {
    console.error("getSalary xatolik:", err);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};

// 🔄 O'qituvchi almashtirish
exports.createExchangeLesson = async (req, res) => {
  try {
    const { sickTeacherId, teachingTeacherId, lessonCount, month, createdAt } =
      req.body;

    const sickTeacher = await Teacher.findById(sickTeacherId);
    const teachingTeacher = await Teacher.findById(teachingTeacherId);

    if (!sickTeacher || !teachingTeacher) {
      return res.status(404).json({ message: "O'qituvchilar topilmadi" });
    }

    sickTeacher.exchange_classes.push({
      lesson_quantity: lessonCount,
      month,
      extra_charge: -lessonCount * sickTeacher.price,
      createdAt,
    });

    teachingTeacher.exchange_classes.push({
      lesson_quantity: lessonCount,
      month,
      extra_charge: lessonCount * teachingTeacher.price,
      createdAt,
    });

    await sickTeacher.save();
    await teachingTeacher.save();

    res.status(201).json({ message: "Almashtirish muvaffaqiyatli" });
  } catch (err) {
    console.error("createExchangeLesson xatolik:", err);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};

// ✏️ Oylikni tahrirlash
exports.updateSalary = async (req, res) => {
  try {
    const { salary_id, paymentMonth, salaryAmount } = req.body;
    const { schoolId } = req.user;

    const salary = await Salary.findById(salary_id);
    if (!salary) {
      return res.status(404).json({ message: "To'lov topilmadi" });
    }

    if (salary.schoolId.toString() !== schoolId) {
      return res.status(403).json({ message: "Ruxsat yo'q" });
    }

    salary.paymentMonth = paymentMonth;
    salary.salaryAmount = salaryAmount;
    await salary.save();

    res.status(200).json({
      message: "To'lov muvaffaqiyatli o'zgartirildi",
      salary,
    });
  } catch (err) {
    console.error("updateSalary xatolik:", err);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};

// 📌 Davomat asosida oylik yozish
exports.addAttendanceSalary = async (req, res) => {
  try {
    const { teacherId, days, hours, paymentMonth } = req.body;
    const { schoolId } = req.user;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }

    let earned = 0;
    if (hours) {
      earned = hours * teacher.price;
    } else if (days) {
      const hoursPerDay = (teacher.hour || 0) / 5;
      earned = days * hoursPerDay * teacher.price;
    }

    const updated = await Salary.findOneAndUpdate(
      {
        teacherId,
        schoolId: new mongoose.Types.ObjectId(schoolId),
        paymentMonth,
      },
      {
        $inc: { salaryAmount: earned },
        $setOnInsert: {
          teacher_fullname: teacher.firstName + " " + teacher.lastName,
        },
        $push: {
          logs: {
            date: new Date(),
            days: days || 0,
            hours: hours || 0,
            amount: earned,
            paymentType: "karta", // 🟢 davomat default karta
            reason: "davomat",
          },
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json(updated);
  } catch (err) {
    console.error("addAttendanceSalary xatolik:", err);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};
