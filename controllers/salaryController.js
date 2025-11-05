const Salary = require("../models/salaryModel");
const Teacher = require("../models/teacherModel");
const School = require("../models/schoolModel");
const moment = require("moment");

// 💰 Admin tomonidan qo‘lda oylik to‘lash (manual qo‘shish)
exports.paySalary = async (req, res) => {
  try {
    const { teacherId, salaryAmount, paymentMonth } = req.body;
    const { schoolId } = req.user;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }

    // maktab budgetidan minus qilamiz
    const school = await School.findByIdAndUpdate(schoolId, {
      $inc: { budget: -salaryAmount },
    });
    if (!school) {
      return res
        .status(500)
        .json({ message: "Maktab budgetini yangilashda xatolik" });
    }

    // mavjud Salary hujjatini topamiz yoki yangi yaratamiz
    const updated = await Salary.findOneAndUpdate(
      { teacherId, schoolId, paymentMonth },
      {
        $inc: { salaryAmount },
        $setOnInsert: {
          teacher_fullname: teacher.firstName + " " + teacher.lastName,
        },
        $push: {
          logs: {
            date: new Date(),
            hours: 0, // manual bo‘lgani uchun soat emas
            amount: salaryAmount,
            reason: "manual",
          },
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json(updated);
  } catch (err) {
    console.error("paySalary xatolik:", err);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};

// 📊 Oy bo‘yicha umumiy oylik hisobot
exports.getMonthlySalarySummary = async (req, res) => {
  try {
    const { schoolId } = req.user;

    // Aggregation: paymentMonth bo‘yicha yig‘indi
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

// 📥 Barcha oyliklarni olish
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

// 🔄 O‘qituvchilar almashuvi (darsni boshqa o‘qituvchi o‘tib bersa)
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
      return res.status(403).json({ message: "Sizga ruxsat yo'q" });
    }

    // faqat umumiy summani yangilaymiz (logs tarixini o‘zgartirmaymiz)
    salary.paymentMonth = paymentMonth;
    salary.salaryAmount = salaryAmount;
    await salary.save();

    res
      .status(201)
      .json({ message: "To'lov muvaffaqiyatli o'zgartirildi", salary });
  } catch (err) {
    console.error("updateSalary xatolik:", err);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};

// 📌 Davomat yozish (masalan, darsga kelgan o‘qituvchi uchun)
exports.addAttendanceSalary = async (req, res) => {
  try {
    const { teacherId, days, hours, paymentMonth } = req.body;
    const { schoolId } = req.user;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }

    // hisoblash
    let earned = 0;
    if (hours) {
      earned = hours * teacher.price;
    } else if (days) {
      const hoursPerDay = (teacher.hour || 0) / 5; // haftasiga 5 kun
      earned = days * hoursPerDay * teacher.price;
    }

    // Salary hujjatini yangilash
    const updated = await Salary.findOneAndUpdate(
      { teacherId, schoolId, paymentMonth },
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
