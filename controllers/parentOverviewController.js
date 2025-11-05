const Grade = require("../models/gradeModel");
const Student = require("../models/studentModel");
const moment = require("moment");

// 🧩 Ota-ona uchun o‘quvchi umumiy ma’lumotlari (baholar tahlili)
exports.getStudentOverview = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1️⃣ O‘quvchini topamiz
    const student = await Student.findById(studentId)
      .populate("groupId", "name number")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "O‘quvchi topilmadi" });
    }

    // 2️⃣ O‘quvchining barcha baholarini olamiz
    const grades = await Grade.find({ studentId })
      .populate("subjectId", "name") // ✅ 'title' o‘rniga 'name'
      .sort({ createdAt: -1 })
      .lean();

    // 3️⃣ Agar baholar bo‘lmasa
    if (!grades.length) {
      return res.status(200).json({
        student: {
          fullName: `${student.firstName} ${student.lastName}`,
          group: `${student.groupId?.number || ""}-${
            student.groupId?.name || ""
          }`,
        },
        overall_progress: 0,
        last_marks: [],
        quarter_marks: { 1: 0, 2: 0, 3: 0, 4: 0 },
        monthly_marks: [],
      });
    }

    // 4️⃣ Umumiy o‘zlashtirish (%)
    const avg =
      grades.reduce((sum, g) => sum + (g.grade || 0), 0) / grades.length;
    const overall_progress = Math.round(avg * 20 * 10) / 10;

    // 5️⃣ So‘nggi 5 ta baho
    const last_marks = grades.slice(0, 5).map((g) => ({
      subject: g.subjectId?.name || "Noma'lum fan",
      mark: g.grade,
      date: moment(g.createdAt).format("DD.MM.YYYY"),
    }));

    // 6️⃣ Chorak bo‘yicha baholar
    const quarter_marks = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const quarter_counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    grades.forEach((g) => {
      const month = moment(g.createdAt).month() + 1;
      let q = 0;
      if (month >= 1 && month <= 3) q = 1;
      else if (month >= 4 && month <= 6) q = 2;
      else if (month >= 7 && month <= 9) q = 3;
      else if (month >= 10 && month <= 12) q = 4;

      quarter_marks[q] += g.grade;
      quarter_counts[q]++;
    });

    Object.keys(quarter_marks).forEach((q) => {
      if (quarter_counts[q] > 0) {
        quarter_marks[q] = Number(
          (quarter_marks[q] / quarter_counts[q]).toFixed(1)
        );
      }
    });

    // 7️⃣ Oy bo‘yicha o‘rtacha baholar
    const monthly_map = {};
    grades.forEach((g) => {
      const month = moment(g.createdAt).format("MMMM");
      if (!monthly_map[month]) monthly_map[month] = [];
      monthly_map[month].push(g.grade);
    });

    const monthly_marks = Object.keys(monthly_map).map((month) => ({
      month,
      average: Number(
        (
          monthly_map[month].reduce((a, b) => a + b, 0) /
          monthly_map[month].length
        ).toFixed(1)
      ),
    }));

    // ✅ Natijani qaytaramiz
    res.status(200).json({
      student: {
        id: student._id,
        fullName: `${student.firstName} ${student.lastName}`,
        group: `${student.groupId?.number || ""}-${
          student.groupId?.name || ""
        }`,
        guardianPhone: student.guardianPhoneNumber,
      },
      overall_progress,
      last_marks,
      quarter_marks,
      monthly_marks,
    });
  } catch (err) {
    console.error("getStudentOverview error:", err);
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};
