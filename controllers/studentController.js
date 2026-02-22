const moment = require("moment");
const Student = require("../models/studentModel");
const Group = require("../models/groupModel");

// ================================
// 🟢 Yangi o‘quvchi qo‘shish
// ================================
const addStudent = async (req, res) => {
  try {
    const { groupId, employeeNo } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Guruh topilmadi" });
    }

    // employeeNo unique tekshirish
    if (employeeNo) {
      const exists = await Student.findOne({ employeeNo });
      if (exists) {
        return res.status(400).json({
          message: "Bu employeeNo allaqachon mavjud",
        });
      }
    }

    const student = await Student.create({
      ...req.body,
      schoolId: req.user.schoolId,
    });

    group.students.push(student._id);
    await group.save();

    res.status(201).json(student);
  } catch (error) {
    console.error("Add Student Error:", error);
    res.status(400).json({
      message: "O'quvchini qo'shishda xato",
      error: error.message,
    });
  }
};

// ================================
// 🟢 Barcha o‘quvchilarni olish
// ================================
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({
      schoolId: req.user.schoolId,
    })
      .populate("groupId")
      .sort({ createdAt: -1 });

    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({
      message: "O'quvchilarni olishda xato",
      error: error.message,
    });
  }
};

// ================================
// 🟢 O‘quvchini yangilash
// ================================
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "O'quvchi topilmadi" });
    }

    // 🔹 Guruh o‘zgarsa
    const oldGroupId = student.groupId?.toString();
    const newGroupId = req.body.groupId?.toString();

    if (oldGroupId && newGroupId && oldGroupId !== newGroupId) {
      await Group.findByIdAndUpdate(oldGroupId, {
        $pull: { students: student._id },
      });

      const newGroup = await Group.findById(newGroupId);
      if (!newGroup) {
        return res.status(404).json({ message: "Yangi guruh topilmadi" });
      }

      newGroup.students.push(student._id);
      await newGroup.save();
    }

    // 🔹 employeeNo unique tekshirish
    if (req.body.employeeNo) {
      const exists = await Student.findOne({
        employeeNo: req.body.employeeNo,
        _id: { $ne: student._id },
      });

      if (exists) {
        return res.status(400).json({
          message: "Bu employeeNo allaqachon mavjud",
        });
      }
    }

    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("groupId");

    res.json(updated);
  } catch (error) {
    res.status(500).json({
      message: "Yangilashda xato",
      error: error.message,
    });
  }
};

// ================================
// 🟢 O‘quvchini o‘chirish
// ================================
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "O'quvchi topilmadi" });
    }

    await Group.findByIdAndUpdate(student.groupId, {
      $pull: { students: id },
    });

    await Student.findByIdAndDelete(id);

    res.json({ message: "O'quvchi muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).json({
      message: "O'chirishda xato",
      error: error.message,
    });
  }
};

// ================================
// 🟢 Aktiv / Nofaol qilish (Freeze Logic)
// ================================
const toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive boolean bo‘lishi kerak",
      });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        message: "O'quvchi topilmadi",
      });
    }

    if (student.isActive === isActive) {
      return res.status(400).json({
        message: "Status allaqachon shu holatda",
      });
    }

    student.isActive = isActive;

    if (!isActive) {
      // 🔴 Nofaol qilingan oy
      student.inactiveFrom = moment().format("MM-YYYY");
    } else {
      // 🟢 Qayta faol qilinsa
      student.inactiveFrom = null;
    }

    await student.save();

    res.status(200).json({
      message: `O'quvchi ${isActive ? "faollashtirildi" : "nofaol qilindi"}`,
      student,
    });
  } catch (error) {
    console.error("Toggle Status Error:", error);
    res.status(500).json({
      message: "Holatni o'zgartirishda xato",
      error: error.message,
    });
  }
};

module.exports = {
  addStudent,
  getAllStudents,
  updateStudent,
  deleteStudent,
  toggleActiveStatus,
};
