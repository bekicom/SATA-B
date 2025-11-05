// controllers/teacherScheduleController.js
const Student = require("../models/studentModel"); // 🔹 Model kerak bo‘lgani uchun qo‘shildi
const LessonSchedule = require("../models/lessonScheduleModel");
const Group = require("../models/groupModel");

// 🔹 Bugungi dars jadvalini olish (teacher token orqali)
const getTodaySchedule = async (req, res) => {
  try {
    const teacherId = req.teacher?.teacherId || req.user?.teacherId;
    const schoolId = req.teacher?.schoolId || req.user?.schoolId;

    if (!teacherId || !schoolId) {
      return res
        .status(400)
        .json({ message: "Token ichidan teacher yoki school ID topilmadi" });
    }

    // Haftalik kunlar
    const days = [
      "yakshanba",
      "dushanba",
      "seshanba",
      "chorshanba",
      "payshanba",
      "juma",
      "shanba",
    ];

    // 🔹 URL paramdan sanani olish
    const dateParam = req.params.date; // masalan: "2025-09-08"
    let selectedDate;

    if (dateParam) {
      selectedDate = new Date(dateParam);
      if (isNaN(selectedDate)) {
        return res.status(400).json({ message: "Noto‘g‘ri sana formati" });
      }
    } else {
      selectedDate = new Date();
    }

    const dayName = days[selectedDate.getDay()];

    // 🔹 O‘qituvchining o‘sha kundagi darslari
    const lessons = await LessonSchedule.find({
      teacherId,
      schoolId,
      day: dayName,
    })
      .populate("groupId", "name number students")
      .populate("subjectId", "name")
      .populate("teacherId", "firstName lastName");

    const result = await Promise.all(
      lessons.map(async (lesson) => {
        const group = await Group.findById(lesson.groupId._id).populate(
          "students",
          "firstName lastName"
        );

        return {
          _id: lesson._id,
          lessonNumber: lesson.lessonNumber,
          day: lesson.day,
          subject: lesson.subjectId?.name,
          teacher: `${lesson.teacherId.firstName} ${lesson.teacherId.lastName}`,
          group: {
            _id: group._id,
            name: group.name || `${group.number}-sinf`,
            students: group.students,
          },
          room: lesson.room,
          date: selectedDate.toISOString().split("T")[0], // YYYY-MM-DD format
        };
      })
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get Today Schedule Error:", error);
    return res
      .status(500)
      .json({ message: "Server xatosi", error: error.message });
  }
};



module.exports = { getTodaySchedule };
