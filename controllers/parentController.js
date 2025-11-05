const Student = require("../models/studentModel");
const ExamResult = require("../models/examResultModel");
const LessonSchedule = require("../models/lessonScheduleModel");
const Grade = require("../models/gradeModel"); // 🔹 baholar uchun
const Payment = require("../models/paymentModel");
const jwt = require("jsonwebtoken");

const generateParentToken = (guardianPhoneNumber) => {
  return jwt.sign(
    { guardianPhoneNumber, role: "parent" },
    process.env.JWT_SECRET_PARENT,
    { expiresIn: "30d" }
  );
};

exports.parentLogin = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.body;

    if (!guardianPhoneNumber) {
      return res
        .status(400)
        .json({ message: "Telefon raqam kiritilishi shart" });
    }

    // Shu raqam bo‘yicha farzandlarni qidiramiz
    const children = await Student.find({ guardianPhoneNumber });

    if (!children || children.length === 0) {
      return res
        .status(404)
        .json({ message: "Bu raqamga bog‘langan farzand topilmadi" });
    }

    // ✅ Token yaratamiz
    const token = generateParentToken(guardianPhoneNumber);

    res.json({
      message: "Muvaffaqiyatli login qilindi",
      token,
      guardian: {
        name: children[0].middleName || "Noma'lum",
        phoneNumber: guardianPhoneNumber,
      },
      children: children.map((child) => ({
        id: child._id,
        firstName: child.firstName,
        lastName: child.lastName,
        groupId: child.groupId,
        schoolId: child.schoolId,
      })),
    });
  } catch (error) {
    console.error("Parent login error:", error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

exports.getMyChildren = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.user; // parentAuth dan kelgan

    if (!guardianPhoneNumber) {
      return res.status(404).json({
        message: "Ota-ona telefon raqami topilmadi",
        variant: "warning",
        innerData: null,
      });
    }

    const children = await Student.find({ guardianPhoneNumber })
      .populate("groupId", "name number") // guruh ma’lumotini qo‘shib berish
      .populate("schoolId", "name address") // maktab ma’lumotini qo‘shib berish
      .select("firstName lastName groupId schoolId");

    res.json({
      message: "Farzandlar ro‘yxati",
      variant: "success",
      innerData: children,
    });
  } catch (error) {
    console.error("getMyChildren error:", error);
    res.status(500).json({
      message: "Server xatosi",
      variant: "error",
      innerData: null,
    });
  }
};

// Ota-ona farzandining baholarini ko‘rishi
exports.getChildGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    // Studentni topamiz
    const student = await Student.findById(studentId).populate(
      "groupId",
      "name number"
    );
    if (!student) {
      return res.status(404).json({ message: "Student topilmadi" });
    }

    // Guruhdagi darslar
    const lessons = await LessonSchedule.find({ groupId: student.groupId._id })
      .populate("subjectId", "name")
      .lean();

    // Sana filterini qo‘llash
    let gradeQuery = { studentId };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      gradeQuery.createdAt = { $gte: start, $lte: end };
    }

    const grades = await Grade.find(gradeQuery).lean();

    const data = lessons.map((lesson) => {
      const gradeRecord = grades.find(
        (g) => g.lessonId.toString() === lesson._id.toString()
      );
      return {
        subject: lesson.subjectId?.name,
        lessonNumber: lesson.lessonNumber,
        grade: gradeRecord ? gradeRecord.grade : null,
        status: gradeRecord ? gradeRecord.status : "Keldi",
        date: gradeRecord
          ? gradeRecord.createdAt.toISOString().split("T")[0]
          : null,
      };
    });

    res.json({
      message: "Farzand baholari",
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      grades: data.filter((d) => !date || d.grade !== null), // agar date berilsa faqat bahosi borlarini qaytaradi
    });
  } catch (error) {
    console.error("getChildGrades error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Bugungi darslar (farzandlar uchun)
exports.getTodayLessonsForChildren = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.user;
    const { date } = req.query;

    if (!guardianPhoneNumber) {
      return res
        .status(400)
        .json({ message: "Ota-ona telefon raqami topilmadi" });
    }

    const children = await Student.find({ guardianPhoneNumber })
      .populate("groupId", "name number")
      .lean();

    if (!children.length) {
      return res.json({ message: "Farzandlar topilmadi", data: [] });
    }

    // ✅ Sana -> hafta kuni
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

    const result = [];

    for (let child of children) {
      const lessons = await LessonSchedule.find({
        groupId: child.groupId._id,
        day: dayName,
      })
        .populate("subjectId", "name")
        .populate("teacherId", "firstName lastName")
        .lean();

      result.push({
        student: `${child.firstName} ${child.lastName}`,
        group: `${child.groupId.number}-${child.groupId.name}`,
        lessons: lessons.map((l) => ({
          subject: l.subjectId?.name,
          lessonNumber: l.lessonNumber,
          teacher: `${l.teacherId?.firstName} ${l.teacherId?.lastName}`,
        })),
      });
    }

    res.json({
      message: "Farzand darslari",
      date: selectedDate.toISOString().split("T")[0],
      data: result,
    });
  } catch (error) {
    console.error("getTodayLessonsForChildren error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Ota-ona farzandlarining to‘lovlarini ko‘rishi
exports.getChildrenPayments = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.user; // parentAuth dan keladi
    if (!guardianPhoneNumber) {
      return res
        .status(400)
        .json({ message: "Ota-ona telefon raqami topilmadi" });
    }

    // Farzandlarni olish
    const children = await Student.find({ guardianPhoneNumber })
      .populate("groupId", "name number")
      .lean();

    if (!children.length) {
      return res.json({ message: "Farzandlar topilmadi", data: [] });
    }

    const data = [];
    for (let child of children) {
      // Shu studentning to‘lovlari
      const payments = await Payment.find({ user_id: child._id })
        .sort({ createdAt: -1 })
        .lean();

      let totalPaid = 0;
      const formattedPayments = payments.map((p) => {
        totalPaid += p.payment_quantity;
        return {
          amount: p.payment_quantity,
          method: p.payment_type,
          month: p.payment_month,
          date: p.payment_date,
          status:
            p.payment_quantity >= child.monthlyFee ? "To‘langan" : "Qisman",
        };
      });

      // Qarzdorlik hisoblash
      const remainingDebt =
        child.monthlyFee > totalPaid ? child.monthlyFee - totalPaid : 0;

      data.push({
        student: {
          id: child._id,
          firstName: child.firstName,
          lastName: child.lastName,
          group: child.groupId?.name || null,
        },
        payments: formattedPayments,
        summary: {
          monthlyFee: child.monthlyFee,
          totalPaid,
          remainingDebt,
        },
      });
    }

    res.json({
      message: "Farzand to‘lovlari",
      data,
    });
  } catch (error) {
    console.error("getChildrenPayments error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

exports.getChildrenExamResults = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.user;
    if (!guardianPhoneNumber) {
      return res
        .status(400)
        .json({ message: "Ota-ona telefon raqami topilmadi" });
    }

    // Farzandlarni topish
    const children = await Student.find({ guardianPhoneNumber }).lean();
    if (!children.length) {
      return res.json({ message: "Farzandlar topilmadi", data: [] });
    }

    const results = [];

    for (let child of children) {
      const examResults = await ExamResult.find({ studentId: child._id })
        .populate("sessionId", "type year month quarter")
        .populate("subjectId", "name")
        .lean();

      results.push({
        student: {
          id: child._id,
          firstName: child.firstName,
          lastName: child.lastName,
        },
        exams: examResults.map((res) => ({
          subject: res.subjectId?.name,
          session: res.sessionId
            ? {
                type: res.sessionId.type,
                year: res.sessionId.year,
                month: res.sessionId.month,
                quarter: res.sessionId.quarter,
              }
            : null,
          score: res.score,
          createdAt: res.createdAt,
        })),
      });
    }

    res.json({
      message: "Farzand imtihon natijalari",
      data: results,
    });
  } catch (error) {
    console.error("getChildrenExamResults error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};
