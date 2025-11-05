const Grade = require("../models/gradeModel");
const Student = require("../models/studentModel");
const LessonSchedule = require("../models/lessonScheduleModel");
const Group = require("../models/groupModel"); // 🔑 import qo‘shildi
const response = require("../utils/response.helper");

exports.addGrade = async (req, res) => {
  try {
    const { studentId, lessonId, grade, status } = req.body;
    const { teacherId, schoolId } = req.teacher || req.user;

    if (!studentId || !lessonId) {
      return response.validationError(res, "Majburiy maydonlar to‘ldirilmagan");
    }

    // 1️⃣ Darsni tekshirish
    const lesson = await LessonSchedule.findById(lessonId).populate(
      "groupId subjectId"
    );
    if (!lesson) return response.notFound(res, "Dars topilmadi");

    // 2️⃣ Student shu guruhda bormi?
    const group = await Group.findById(lesson.groupId).populate("students");
    const isStudentInGroup = group.students.some(
      (s) => s._id.toString() === studentId
    );
    if (!isStudentInGroup) {
      return response.validationError(res, "Student bu dars guruhida emas");
    }

    // 3️⃣ Baho mavjud bo‘lsa update, bo‘lmasa create
    const newGrade = await Grade.findOneAndUpdate(
      { studentId, lessonId },
      {
        schoolId,
        lessonId,
        studentId,
        teacherId,
        groupId: lesson.groupId?._id,
        subjectId: lesson.subjectId?._id,
        grade: grade || null,
        status: status || "kelgan", // ✅ default to‘g‘rilandi
      },
      { upsert: true, new: true }
    );

    return response.success(res, {
      message: "Baho saqlandi",
      grade: newGrade,
    });
  } catch (err) {
    console.error("Add grade error:", err);
    return response.error(res, err.message); // ✅ serverError → error
  }
};

// 🔹 O‘quvchining barcha baholari
exports.getGradesByStudent = async (req, res) => {
  try {
    const grades = await Grade.find({ studentId: req.params.id })
      .populate("subjectId", "name")
      .populate("teacherId", "firstName lastName")
      .populate("lessonId", "day lessonNumber");

    return response.success(res, grades);
  } catch (err) {
    return response.error(res, err.message); // ✅
  }
};

// 🔹 Guruh bo‘yicha baholar
exports.getGradesByGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // 1️⃣ Guruh va studentlarni olish
    const group = await Group.findById(groupId).populate(
      "students",
      "firstName lastName"
    );
    if (!group) return response.notFound(res, "Guruh topilmadi");

    // 2️⃣ O‘sha guruhdagi baholarni olish
    const grades = await Grade.find({ groupId })
      .populate("studentId", "firstName lastName")
      .populate("subjectId", "name")
      .populate("teacherId", "firstName lastName")
      .populate("lessonId", "day lessonNumber");

    // 3️⃣ Har bir student uchun baho bor-yo‘qligini tekshirish
    const result = group.students.map((student) => {
      const grade = grades.find(
        (g) => g.studentId?._id.toString() === student._id.toString()
      );

      return {
        studentId: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        grade: grade?.grade || null,
        status: grade?.status || "kelgan",
        subject: grade?.subjectId?.name || null,
        lesson: grade?.lessonId || null,
        teacher: grade?.teacherId
          ? `${grade.teacherId.firstName} ${grade.teacherId.lastName}`
          : null,
      };
    });

    return response.success(res, result);
  } catch (err) {
    console.error("Get grades by group error:", err);
    return response.error(res, err.message); // ✅
  }
};

// 🔹 Dars bo‘yicha baholar
exports.getGradesByLesson = async (req, res) => {
  try {
    const grades = await Grade.find({ lessonId: req.params.lessonId })
      .populate("studentId", "firstName lastName")
      .populate("subjectId", "name")
      .populate("teacherId", "firstName lastName");

    return response.success(res, grades);
  } catch (err) {
    return response.error(res, err.message); // ✅
  }
};
