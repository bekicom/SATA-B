const Teacher = require("../models/teacherModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// O'qituvchi qo'shish
const addTeacher = async (req, res) => {
  try {
    const { login, password, employeeNo } = req.body;

    // Login va password majburiy
    if (!login || !password) {
      return res.status(400).json({
        message: "Login va parol majburiy",
      });
    }

    // Login unique bo'lishi shart
    const loginExists = await Teacher.findOne({ login });
    if (loginExists) {
      return res.status(400).json({
        message: "Bu login allaqachon mavjud. Boshqa login tanlang.",
      });
    }

    // employeeNo unique bo'lishi shart
    if (employeeNo) {
      const exists = await Teacher.findOne({ employeeNo });
      if (exists) {
        return res.status(400).json({
          message: "Bu xodim raqami allaqachon mavjud",
        });
      }
    }

    // Parol hash qilish
    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = new Teacher({
      ...req.body,
      password: hashedPassword,
    });

    const saveTeacher = await teacher.save();

    // Parolni response dan olib tashlash
    const teacherResponse = saveTeacher.toObject();
    delete teacherResponse.password;

    res.status(201).json({
      message: "O'qituvchi muvaffaqiyatli qo'shildi",
      teacher: teacherResponse,
    });
  } catch (error) {
    console.error("Error adding teacher:", error);

    // MongoDB duplicate key xatosini ushlash
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Bu ${field} allaqachon mavjud`,
      });
    }

    res.status(500).json({ message: "Server xatosi" });
  }
};

// O'qituvchi login
const loginTeacher = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        message: "Login va parol majburiy",
      });
    }

    const teacher = await Teacher.findOne({ login }).select("+password");
    if (!teacher) {
      return res.status(400).json({
        message: "Login yoki parol noto'g'ri",
      });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Login yoki parol noto'g'ri",
      });
    }

    const token = jwt.sign(
      { teacherId: teacher._id, schoolId: teacher.schoolId, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login muvaffaqiyatli",
      token,
      teacher: {
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        login: teacher.login,
        schoolId: teacher.schoolId,
      },
    });
  } catch (error) {
    console.error("Teacher login error:", error);
    res.status(500).json({ message: error.message || "Server xatosi" });
  }
};

// Barcha o'qituvchilar
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({ schoolId: req.user.schoolId });
    res.json(teachers);
  } catch (error) {
    console.error("O'qituvchilarni olishda xato:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// ID bo'yicha bitta o'qituvchi
const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }
    res.json(teacher);
  } catch (error) {
    console.error("Error retrieving teacher:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// O'qituvchini yangilash
const updateTeacher = async (req, res) => {
  try {
    const { login, password, employeeNo } = req.body;

    // login unique bo'lishini tekshirish
    if (login) {
      const existsLogin = await Teacher.findOne({
        login,
        _id: { $ne: req.params.id },
      });
      if (existsLogin) {
        return res.status(400).json({
          message:
            "Bu login allaqachon boshqa o'qituvchi tomonidan ishlatilmoqda",
        });
      }
    }

    // employeeNo unique bo'lishini tekshirish
    if (employeeNo) {
      const exists = await Teacher.findOne({
        employeeNo,
        _id: { $ne: req.params.id },
      });
      if (exists) {
        return res.status(400).json({
          message:
            "Bu xodim raqami allaqachon boshqa o'qituvchiga biriktirilgan",
        });
      }
    }

    // Parol yuborilsa → hash qilish
    if (password) {
      req.body.password = await bcrypt.hash(password, 10);
    }

    // faqat yuborilgan maydonlar yangilanadi
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }

    // Parolni response dan olib tashlash
    const teacherResponse = updatedTeacher.toObject();
    delete teacherResponse.password;

    res.json({
      message: "O'qituvchi muvaffaqiyatli yangilandi",
      teacher: teacherResponse,
    });
  } catch (error) {
    console.error("Error updating teacher:", error);

    // MongoDB duplicate key xatosini ushlash
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Bu ${field} allaqachon mavjud`,
      });
    }

    res.status(500).json({ message: "Server xatosi" });
  }
};

// O'qituvchini o'chirish
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }

    res.json({ message: "O'qituvchi muvaffaqiyatli o'chirildi" });
  } catch (error) {
    console.error("Error deleting teacher:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

module.exports = {
  addTeacher,
  loginTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};
