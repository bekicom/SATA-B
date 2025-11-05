const LessonSchedule = require("../models/lessonScheduleModel");
const Group = require("../models/groupModel");
const Grade = require("../models/gradeModel"); // ✅ Baholar uchun qo‘shildi

// 🔹 Yangi dars qo‘shish
const createLesson = async (req, res) => {
  try {
    const { subjectId, teacherId, groupId, day, lessonNumber, room } = req.body;

    if (!req.user?.schoolId) {
      return res
        .status(400)
        .json({ message: "schoolId topilmadi (auth token kerak)" });
    }

    // ❗ Bir guruhda, bir kun, bir soatda boshqa dars bo‘lmasligi kerak
    const exists = await LessonSchedule.findOne({
      schoolId: req.user.schoolId,
      groupId,
      day,
      lessonNumber,
    });

    if (exists) {
      return res.status(400).json({
        message: "Bu guruh uchun shu kuni va shu soatda dars allaqachon mavjud",
      });
    }

    const lesson = new LessonSchedule({
      subjectId,
      teacherId,
      groupId,
      day,
      lessonNumber,
      room,
      schoolId: req.user.schoolId,
    });

    await lesson.save();
    res.status(201).json({ message: "Dars qo‘shildi", lesson });
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🔹 O‘qituvchining sanaga qarab jadvali
const getScheduleByDate = async (req, res) => {
  try {
    const teacherId = req.user?.teacherId; // authMiddleware’dan keladi
    const schoolId = req.user?.schoolId;
    const { date } = req.params; // YYYY-MM-DD formatida

    if (!teacherId || !schoolId) {
      return res
        .status(400)
        .json({ message: "Token ichida teacherId yoki schoolId topilmadi" });
    }

    const days = [
      "yakshanba",
      "dushanba",
      "seshanba",
      "chorshanba",
      "payshanba",
      "juma",
      "shanba",
    ];

    const selectedDate = date ? new Date(date) : new Date();
    if (isNaN(selectedDate)) {
      return res.status(400).json({ message: "Noto‘g‘ri sana formati" });
    }

    const dayName = days[selectedDate.getDay()];

    const lessons = await LessonSchedule.find({
      teacherId,
      schoolId,
      day: dayName,
    })
      .populate("groupId", "name number")
      .populate("subjectId", "name");

    return res.json({ success: true, data: lessons });
  } catch (error) {
    console.error("Get schedule by date error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};
// 🔹 Tanlangan darsga biriktirilgan o‘quvchilar
const getLessonStudents = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await LessonSchedule.findById(lessonId).populate(
      "groupId subjectId"
    );
    if (!lesson) return res.status(404).json({ message: "Dars topilmadi" });

    const group = await Group.findById(lesson.groupId._id).populate(
      "students",
      "firstName lastName phone"
    );

    // Shu darsdagi baholarni olish
    const grades = await Grade.find({ lessonId }).lean();

    // Studentlarga baho va statusni biriktirish
    const studentsWithGrades = group.students.map((student) => {
      const gradeRecord = grades.find(
        (g) => g.studentId.toString() === student._id.toString()
      );
      return {
        ...student.toObject(),
        grade: gradeRecord ? gradeRecord.grade : null,
        status: gradeRecord ? gradeRecord.status : "kelgan", // 🔹 doim qaytadi
      };
    });

    return res.json({
      success: true,
      lessonId,
      subject: lesson.subjectId?.name,
      group: group?.name,
      students: studentsWithGrades,
    });
  } catch (error) {
    console.error("Get lesson students error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🔹 Darsni yangilash
const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await LessonSchedule.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!lesson) {
      return res.status(404).json({ message: "Dars topilmadi" });
    }

    res.json({ message: "Dars yangilandi", lesson });
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🔹 Darsni o‘chirish
const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    await LessonSchedule.findByIdAndDelete(id);
    res.json({ message: "Dars o‘chirildi" });
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🔹 Guruh bo‘yicha jadval
const getScheduleByClass = async (req, res) => {
  try {
    const { groupId } = req.params;
    const lessons = await LessonSchedule.find({ groupId })
      .populate("teacherId", "firstName lastName")
      .populate("subjectId", "name")
      .sort({ day: 1, lessonNumber: 1 });

    res.json({ success: true, data: lessons });
  } catch (error) {
    console.error("Get schedule by class error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🔹 O‘qituvchi bo‘yicha jadval
const getScheduleByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const lessons = await LessonSchedule.find({ teacherId })
      .populate("groupId", "name number")
      .populate("subjectId", "name")
      .sort({ day: 1, lessonNumber: 1 });

    res.json({ success: true, data: lessons });
  } catch (error) {
    console.error("Get schedule by teacher error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

module.exports = {
  createLesson,
  getScheduleByDate,
  getLessonStudents,
  updateLesson,
  deleteLesson,
  getScheduleByTeacher,
  getScheduleByClass,
};
