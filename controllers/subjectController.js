const Subject = require("../models/subjectModel");

// Fan qo‘shish
const addSubject = async (req, res) => {
  try {
    const { name, schoolId } = req.body;

    if (!name || !schoolId) {
      return res
        .status(400)
        .json({ message: "Majburiy maydonlar to‘ldirilmagan" });
    }

    const exists = await Subject.findOne({ name, schoolId });
    if (exists) {
      return res.status(400).json({ message: "Bu fan allaqachon mavjud" });
    }

    const subject = new Subject(req.body);
    await subject.save();

    res.status(201).json({
      message: "Fan muvaffaqiyatli qo‘shildi",
      subject,
    });
  } catch (error) {
    console.error("Fan qo‘shishda xato:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// Barcha fanlar
const getSubjects = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId || req.teacher?.schoolId;
    const subjects = await Subject.find({ schoolId });
    res.json(subjects);
  } catch (error) {
    console.error("Fanlarni olishda xato:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// ID bo‘yicha fan
const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: "Fan topilmadi" });
    res.json(subject);
  } catch (error) {
    console.error("Fan olishda xato:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// Fan yangilash
const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!subject) return res.status(404).json({ message: "Fan topilmadi" });

    res.json({ message: "Fan yangilandi", subject });
  } catch (error) {
    console.error("Fan yangilashda xato:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// Fan o‘chirish
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: "Fan topilmadi" });

    res.json({ message: "Fan o‘chirildi" });
  } catch (error) {
    console.error("Fan o‘chirishda xato:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

module.exports = {
  addSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
