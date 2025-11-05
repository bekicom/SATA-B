const Student = require("../models/studentModel");
const Group = require("../models/groupModel");

// Yangi o'quvchi qo'shish
const addStudent = async (req, res) => {
  const { groupId, employeeNo } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Guruh topilmadi" });
    }

    const exists = await Student.findOne({ employeeNo });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Bu employeeNo allaqachon mavjud" });
    }

    const student = await Student.create(req.body);

    group.students.push(student._id);
    await group.save();

    res.status(201).json(student);
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: "O'quvchini qo'shishda xato",
      error: error.message || error,
    });
  }
};

// Barcha o'quvchilarni olish
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({
      schoolId: req.user.schoolId,
    }).populate("groupId");

    res.status(200).json(students);
  } catch (error) {
    res
      .status(500)
      .json({ message: "O'quvchilarni olishda xato yuz berdi", error });
  }
};

// O'quvchini yangilash
const updateStudent = async (req, res) => {
  try {
    const editingStudent = await Student.findById(req.params.id);
    if (!editingStudent) {
      return res.status(404).json({ message: "O'quvchi topilmadi" });
    }

    const oldGroupId = editingStudent?.groupId?.toString();
    const newGroupId = req.body.groupId?.toString();

    if (oldGroupId && newGroupId && oldGroupId !== newGroupId) {
      await Group.findByIdAndUpdate(oldGroupId, {
        $pull: { students: req.params.id },
      });

      const newGroup = await Group.findById(newGroupId);
      if (!newGroup) {
        return res.status(404).json({ message: "Yangi guruh topilmadi" });
      }
      newGroup.students.push(req.params.id);
      await newGroup.save();
    }

    if (req.body.employeeNo) {
      const exists = await Student.findOne({
        employeeNo: req.body.employeeNo,
        _id: { $ne: req.params.id },
      });
      if (exists) {
        return res
          .status(400)
          .json({ message: "Bu employeeNo allaqachon mavjud" });
      }
    }

    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// O'quvchini o'chirish
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletingStudent = await Student.findById(id);

    if (!deletingStudent) {
      return res.status(404).json({ message: "O'quvchi topilmadi" });
    }

    await Group.findByIdAndUpdate(deletingStudent.groupId, {
      $pull: { students: id },
    });

    await Student.findByIdAndDelete(id);

    res.json({ message: "O'quvchi muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🟢 O'quvchini aktiv / noaktiv qilish
const toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body; // true yoki false yuboriladi

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "O'quvchi topilmadi" });
    }

    student.isActive = isActive;
    await student.save();

    res.json({
      message: `O'quvchi ${
        isActive ? "faol holatga" : "nofaol holatga"
      } o‘tkazildi`,
      student,
    });
  } catch (error) {
    res.status(500).json({
      message: "Holatni o'zgartirishda xato yuz berdi",
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
