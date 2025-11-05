const Group = require("../models/groupModel");
const Teacher = require("../models/teacherModel");

// 🔹 Guruh yaratish
exports.createGroup = async (req, res) => {
  try {
    const { teacher, ...body } = req.body;

    // O‘qituvchini tekshirish
    const teacherData = await Teacher.findById(teacher);
    if (!teacherData) {
      return res.status(404).json({ message: "O‘qituvchi topilmadi" });
    }

    // Guruh yaratish
    const group = new Group({ ...body, teacher });
    await group.save();

    // O‘qituvchini classLeader qilib qo‘yish
    teacherData.classLeader = group._id;
    await teacherData.save();

    return res.status(201).json({ message: "Guruh yaratildi", group });
  } catch (error) {
    console.error("createGroup error:", error);
    return res.status(500).json({
      message: "Guruh yaratishda xato yuz berdi",
      error: error.message,
    });
  }
};

// 🔹 Barcha guruhlarni olish
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find({ schoolId: req.user.schoolId }).populate(
      "teacher",
      "firstName lastName"
    );
    return res.json(groups);
  } catch (error) {
    console.error("getAllGroups error:", error);
    return res.status(500).json({
      message: "Guruhlarni olishda xato yuz berdi",
      error: error.message,
    });
  }
};

// 🔹 Guruhga student qo‘shish
exports.addStudentToGroup = async (req, res) => {
  try {
    const { studentId } = req.body;
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Guruh topilmadi" });
    }

    // Duplicate bo‘lishini oldini olish
    if (group.students.includes(studentId)) {
      return res
        .status(400)
        .json({ message: "Bu o‘quvchi allaqachon qo‘shilgan" });
    }

    group.students.push(studentId);
    await group.save();

    return res.json({ message: "O‘quvchi guruhga qo‘shildi", group });
  } catch (error) {
    console.error("addStudentToGroup error:", error);
    return res.status(500).json({
      message: "Guruhga o‘quvchi qo‘shishda xato yuz berdi",
      error: error.message,
    });
  }
};

// 🔹 Guruhdagi barcha studentlarni olish
exports.getGroupStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id).populate(
      "students",
      "firstName lastName phone"
    );
    if (!group) {
      return res.status(404).json({ message: "Guruh topilmadi" });
    }

    return res.json(group.students);
  } catch (error) {
    console.error("getGroupStudents error:", error);
    return res.status(500).json({
      message: "Guruhdagi o‘quvchilarni olishda xato yuz berdi",
      error: error.message,
    });
  }
};

// 🔹 Guruhni yangilash
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacher: newTeacherId, ...otherFields } = req.body;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Guruh topilmadi" });
    }

    // O‘qituvchini almashtirish
    if (newTeacherId) {
      const newTeacher = await Teacher.findById(newTeacherId);
      if (!newTeacher) {
        return res.status(404).json({ message: "Yangi o‘qituvchi topilmadi" });
      }

      // Oldingi o‘qituvchini bo‘shatish
      if (group.teacher) {
        await Teacher.findByIdAndUpdate(group.teacher, { classLeader: null });
      }

      // Yangi o‘qituvchini classLeader qilib qo‘yish
      newTeacher.classLeader = group._id;
      await newTeacher.save();

      group.teacher = newTeacherId;
    }

    // Guruh ma’lumotlarini yangilash
    Object.assign(group, otherFields);
    await group.save();

    return res.json({ message: "Guruh yangilandi", group });
  } catch (error) {
    console.error("updateGroup error:", error);
    return res.status(500).json({
      message: "Guruhni yangilashda xato yuz berdi",
      error: error.message,
    });
  }
};
 