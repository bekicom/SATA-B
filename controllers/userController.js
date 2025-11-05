// controllers/userController.js
const User = require("../models/adminModel");
const bcrypt = require("bcryptjs");

// Foydalanuvchi qo'shish
const addUser = async (req, res) => {
  const { firstName, lastName, email, password, schoolId } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      schoolId,
    });
    await user.save();
    res
      .status(201)
      .json({ message: "Foydalanuvchi muvaffaqiyatli qo'shildi", user });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
};

const loginStaff = async (req, res) => {
  const { login, password } = req.body
  try {
    const user = await User.findOne({ login });
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Parol noto'g'ri" });
    }

    const token = await jwt.generate({ id: user._id, schoolId: user.schoolId }, "30d");
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
}

// Barcha foydalanuvchilarni olish
const getAllUsers = async (req, res) => {
  const { schoolId } = req.user;

  try {
    const users = await User.find({ schoolId });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
};

module.exports = {
  addUser,
  getAllUsers,
  loginStaff
};
