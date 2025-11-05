const LessonSchedule = require("../models/lessonScheduleModel");
const Group = require("../models/groupModel");
const Grade = require("../models/gradeModel");

exports.getTeacherJournal = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;
    const { date } = req.query;

    if (!teacherId) {
      return res
        .status(400)
        .json({ message: "Teacher ID token ichida topilmadi" });
    }

    // Sana → hafta kuni nomi
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

    // Faqat shu kunlik darslarni olish
    const lessons = await LessonSchedule.find({ teacherId, day: dayName })
      .populate("groupId", "name number students")
      .populate("subjectId", "name");

    if (!lessons.length) {
      return res.json({ message: "Bu kunda darslar yo‘q", data: [] });
    }

    const grouped = {};

    for (let lesson of lessons) {
      const groupName = lesson.groupId.number
        ? `${lesson.groupId.number}-${lesson.groupId.name}`
        : lesson.groupId.name;

      if (!grouped[groupName]) grouped[groupName] = [];

      const group = await Group.findById(lesson.groupId._id).populate(
        "students",
        "firstName lastName"
      );

      const grades = await Grade.find({ lessonId: lesson._id }).lean();

      const students = group.students.map((student) => {
        const gradeRecord = grades.find(
          (g) => g.studentId.toString() === student._id.toString()
        );
        return {
          id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          grade: gradeRecord ? gradeRecord.grade : null,
          status: gradeRecord ? gradeRecord.status : "Keldi",
        };
      });

      grouped[groupName].push({
        lessonId: lesson._id,
        subject: lesson.subjectId.name,
        lessonNumber: lesson.lessonNumber,
        students,
      });
    }

    const result = Object.keys(grouped).map((group) => ({
      group,
      subjects: grouped[group],
    }));

    res.json({
      message: "Kunlik jurnal ma'lumotlari",
      data: result,
    });
  } catch (error) {
    console.error("getTeacherJournal error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};
