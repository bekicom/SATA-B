const Student = require("../models/studentModel");
const ExamResult = require("../models/examResultModel");
const LessonSchedule = require("../models/lessonScheduleModel");
const Grade = require("../models/gradeModel");
const Payment = require("../models/paymentModel");
const Homework = require("../models/homeworkModel"); // 🟢 YANGI
const jwt = require("jsonwebtoken");
const moment = require("moment");

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

    const children = await Student.find({ guardianPhoneNumber });

    if (!children || children.length === 0) {
      return res
        .status(404)
        .json({ message: "Bu raqamga bog'langan farzand topilmadi" });
    }

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
    const { guardianPhoneNumber } = req.user;

    if (!guardianPhoneNumber) {
      return res.status(404).json({
        message: "Ota-ona telefon raqami topilmadi",
        variant: "warning",
        innerData: null,
      });
    }

    const children = await Student.find({ guardianPhoneNumber })
      .populate("groupId", "name number")
      .populate("schoolId", "name address")
      .select("firstName lastName groupId schoolId");

    res.json({
      message: "Farzandlar ro'yxati",
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

exports.getChildGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query;

    const student = await Student.findById(studentId).populate(
      "groupId",
      "name number"
    );
    if (!student) {
      return res.status(404).json({ message: "Student topilmadi" });
    }

    const lessons = await LessonSchedule.find({ groupId: student.groupId._id })
      .populate("subjectId", "name")
      .lean();

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
      grades: data.filter((d) => !date || d.grade !== null),
    });
  } catch (error) {
    console.error("getChildGrades error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

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
      return res.status(400).json({ message: "Noto'g'ri sana formati" });
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

      const lessonsWithHomework = await Promise.all(
        lessons.map(async (lesson) => {
          // Shu lesson uchun uyga vazifalarni olish
          const homeworks = await Homework.find({
            lessonId: lesson._id,
          })
            .populate("subjectId", "name")
            .populate("teacherId", "firstName lastName")
            .sort({ createdAt: -1 })
            .lean();

          const formattedHomeworks = homeworks.map((hw) => ({
            id: hw._id,
            title: hw.title,
            description: hw.description,
            subject: hw.subjectId?.name || "Noma'lum",
            teacher: hw.teacherId
              ? `${hw.teacherId.firstName} ${hw.teacherId.lastName}`
              : "Noma'lum",
            assignedDate: hw.createdAt,
          }));

          return {
            subject: lesson.subjectId?.name,
            lessonNumber: lesson.lessonNumber,
            teacher: `${lesson.teacherId?.firstName} ${lesson.teacherId?.lastName}`,
            homeworks: formattedHomeworks,
          };
        })
      );

      result.push({
        student: `${child.firstName} ${child.lastName}`,
        group: `${child.groupId.number}-${child.groupId.name}`,
        lessons: lessonsWithHomework,
      });
    }

    res.json({
      message: "Farzand darslari va uyga vazifalari",
      date: selectedDate.toISOString().split("T")[0],
      data: result,
    });
  } catch (error) {
    console.error("getTodayLessonsForChildren error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};


exports.getChildrenPayments = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.user;
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

    const data = [];
    for (let child of children) {
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
            p.payment_quantity >= child.monthlyFee ? "To'langan" : "Qisman",
        };
      });

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
      message: "Farzand to'lovlari",
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

exports.getChildrenDebts = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.user;
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

    const data = [];

    for (let child of children) {
      const admissionDate = moment(child.admissionDate);
      const currentDate = moment();

      const payments = await Payment.find({ user_id: child._id }).lean();

      const paymentMap = {};
      payments.forEach((payment) => {
        if (!paymentMap[payment.payment_month]) {
          paymentMap[payment.payment_month] = 0;
        }
        paymentMap[payment.payment_month] += payment.payment_quantity;
      });

      const debts = [];
      let totalDebt = 0;
      let tempDate = admissionDate.clone();

      while (tempDate.isSameOrBefore(currentDate, "month")) {
        const monthKey = tempDate.format("MM-YYYY");
        const paidAmount = paymentMap[monthKey] || 0;
        const debtAmount = child.monthlyFee - paidAmount;

        if (debtAmount > 0) {
          debts.push({
            month: monthKey,
            monthName: getMonthName(tempDate.format("MM")),
            year: tempDate.format("YYYY"),
            monthlyFee: child.monthlyFee,
            paidAmount: paidAmount,
            debtAmount: debtAmount,
          });
          totalDebt += debtAmount;
        }

        tempDate.add(1, "month");
      }

      data.push({
        student: {
          id: child._id,
          firstName: child.firstName,
          lastName: child.lastName,
          group: child.groupId?.name || null,
          admissionDate: child.admissionDate,
        },
        monthlyFee: child.monthlyFee,
        totalDebt: totalDebt,
        debts: debts,
        debtMonthsCount: debts.length,
      });
    }

    res.json({
      message: "Farzand qarzdorliklari",
      data,
    });
  } catch (error) {
    console.error("getChildrenDebts error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// 🟢 YANGI: Farzandning uyga vazifalarini olish
exports.getChildHomework = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { guardianPhoneNumber } = req.user;

    // 1. Studentni topish va validatsiya
    const student = await Student.findById(studentId)
      .populate("groupId", "name number")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student topilmadi" });
    }

    // 2. Bu student ota-onaga tegishli ekanligini tekshirish
    if (student.guardianPhoneNumber !== guardianPhoneNumber) {
      return res.status(403).json({
        message: "Bu farzandning ma'lumotlarini ko'rishga ruxsatingiz yo'q",
      });
    }

    // 3. Student guruhiga tegishli barcha uyga vazifalarni olish
    const homeworks = await Homework.find({ groupId: student.groupId._id })
      .populate("subjectId", "name")
      .populate("teacherId", "firstName lastName")
      .populate("lessonId", "day lessonNumber")
      .sort({ createdAt: -1 }) // eng yangisidan boshlab
      .lean();

    // 4. Response formatini to'g'rilash
    const formattedHomeworks = homeworks.map((hw) => ({
      id: hw._id,
      title: hw.title,
      description: hw.description,
      subject: hw.subjectId?.name || "Noma'lum",
      teacher: hw.teacherId
        ? `${hw.teacherId.firstName} ${hw.teacherId.lastName}`
        : "Noma'lum",
      lesson: {
        day: hw.lessonId?.day || "Noma'lum",
        lessonNumber: hw.lessonId?.lessonNumber || null,
      },
      assignedDate: hw.createdAt,
    }));

    res.json({
      message: "Farzand uyga vazifalari",
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        group: `${student.groupId.number}-${student.groupId.name}`,
      },
      totalHomeworks: formattedHomeworks.length,
      homeworks: formattedHomeworks,
    });
  } catch (error) {
    console.error("getChildHomework error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Helper function
function getMonthName(monthNumber) {
  const months = {
    "01": "Yanvar",
    "02": "Fevral",
    "03": "Mart",
    "04": "Aprel",
    "05": "May",
    "06": "Iyun",
    "07": "Iyul",
    "08": "Avgust",
    "09": "Sentabr",
    10: "Oktabr",
    11: "Noyabr",
    12: "Dekabr",
  };
  return months[monthNumber] || "Noma'lum";
}
