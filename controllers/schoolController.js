// controllers/schoolController.js
const School = require("../models/schoolModel");
const bcrypt = require("bcryptjs");

// Maktab qo'shish
const addSchool = async (req, res) => {
  try {
    const {
      name,
      login,
      password,
      extraPassword,
      teacherLogin,
      teacherPassword,
      phone,
      budget,
    } = req.body;

    // 1. Majburiy maydonlarni tekshirish
    if (!name || !login || !password || !phone) {
      return res
        .status(400)
        .json({ message: "Majburiy maydonlar to'ldirilmagan" });
    }

    // 2. Login unique bo'lishi kerak
    let existingSchool = await School.findOne({ login });
    if (existingSchool) {
      return res.status(400).json({ message: "Bu login bilan maktab mavjud" });
    }

    // 3. Parolni hash qilish
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Yangi school yaratish
    const school = new School({
      name,
      login,
      password: hashedPassword,
      extraPassword,
      teacherLogin,
      teacherPassword,
      phone,
      budget,
    });

    await school.save();

    res.status(201).json({
      message: "Maktab muvaffaqiyatli qo'shildi",
      school,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// Maktab olish
const getSchool = async (req, res) => {
  try {
    const { schoolId } = req.user; // authMiddleware dan kelishi kerak
    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({ message: "Maktab topilmadi" });
    }

    res.json(school);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

module.exports = {
  addSchool,
  getSchool,
};
