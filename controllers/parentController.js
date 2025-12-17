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

// 🟢 YANGI: Ma'lum davr uchun uyga vazifalarni olish
exports.getChildHomeworksForPeriod = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { guardianPhoneNumber } = req.user;
    const { startDate, endDate } = req.query;

    // 1. Studentni topish va validatsiya
    const student = await Student.findById(studentId)
      .populate("groupId", "name number")
      .lean();

    if (!student) {
      return res.status(404).json({
        message: "Student topilmadi",
        variant: "error",
        innerData: null,
      });
    }

    // 2. Ota-ona huquqini tekshirish
    if (student.guardianPhoneNumber !== guardianPhoneNumber) {
      return res.status(403).json({
        message: "Bu farzandning ma'lumotlarini ko'rishga ruxsatingiz yo'q",
        variant: "error",
        innerData: null,
      });
    }

    // 3. Sana oralig'ini aniqlash
    const today = new Date();
    const start = startDate ? new Date(startDate) : new Date(today);
    const end = endDate ? new Date(endDate) : new Date(today);

    // Agar startDate berilmagan bo'lsa, 3 kun oldingi (kecha, bugun, ertaga)
    if (!startDate && !endDate) {
      start.setDate(today.getDate() - 1); // Kechadan boshlab
      end.setDate(today.getDate() + 1); // Ertagacha
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // 4. Uyga vazifalarni olish
    const homeworks = await Homework.find({
      groupId: student.groupId._id,
      createdAt: { $gte: start, $lte: end },
    })
      .populate("subjectId", "name")
      .populate("teacherId", "firstName lastName")
      .populate("lessonId", "day lessonNumber")
      .sort({ createdAt: -1 })
      .lean();

    // 5. Kunlar bo'yicha guruhlash
    const homeworksByDay = {};

    homeworks.forEach((hw) => {
      const dateKey = hw.createdAt.toISOString().split("T")[0];
      const dayName = getUzbekDayName(hw.createdAt.getDay());

      if (!homeworksByDay[dateKey]) {
        homeworksByDay[dateKey] = {
          date: dateKey,
          dayName: dayName,
          dayStatus: getDayStatus(dateKey, today),
          totalHomeworks: 0,
          subjects: [],
        };
      }

      // Subject bo'yicha guruhlash
      const subjectName = hw.subjectId?.name || "Noma'lum";
      const teacherName = hw.teacherId
        ? `${hw.teacherId.firstName} ${hw.teacherId.lastName}`
        : "Noma'lum";

      const existingSubject = homeworksByDay[dateKey].subjects.find(
        (s) => s.subject === subjectName
      );

      if (existingSubject) {
        existingSubject.homeworks.push({
          id: hw._id,
          title: hw.title,
          description: hw.description,
          teacher: teacherName,
          lesson: {
            day: hw.lessonId?.day || "Noma'lum",
            lessonNumber: hw.lessonId?.lessonNumber || null,
          },
          assignedDate: hw.createdAt,
          deadline: hw.deadline || null,
        });
      } else {
        homeworksByDay[dateKey].subjects.push({
          subject: subjectName,
          homeworks: [
            {
              id: hw._id,
              title: hw.title,
              description: hw.description,
              teacher: teacherName,
              lesson: {
                day: hw.lessonId?.day || "Noma'lum",
                lessonNumber: hw.lessonId?.lessonNumber || null,
              },
              assignedDate: hw.createdAt,
              deadline: hw.deadline || null,
            },
          ],
        });
      }

      homeworksByDay[dateKey].totalHomeworks++;
    });

    // 6. Kunlarni tartiblash (eng yangisidan boshlab)
    const sortedDates = Object.keys(homeworksByDay).sort(
      (a, b) => new Date(b) - new Date(a)
    );

    // 7. Bugun, kecha, ertaga uchun alohida ajratish
    const todayKey = today.toISOString().split("T")[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split("T")[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().split("T")[0];

    const result = {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        group: `${student.groupId.number}-${student.groupId.name}`,
      },
      dateRange: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
        totalDays: sortedDates.length,
      },
      summary: {
        totalHomeworks: homeworks.length,
        daysWithHomeworks: sortedDates.length,
        subjects: [
          ...new Set(homeworks.map((h) => h.subjectId?.name).filter(Boolean)),
        ],
      },
      // Alohida kunlar
      yesterday: homeworksByDay[yesterdayKey] || null,
      today: homeworksByDay[todayKey] || null,
      tomorrow: homeworksByDay[tomorrowKey] || null,
      // Barcha kunlar
      allDays: sortedDates.map((dateKey) => homeworksByDay[dateKey]),
    };

    res.json({
      message: "Farzand uyga vazifalari",
      variant: "success",
      innerData: result,
    });
  } catch (error) {
    console.error("getChildHomeworksForPeriod error:", error);
    res.status(500).json({
      message: "Server xatosi",
      variant: "error",
      innerData: null,
      error: error.message,
    });
  }
};

// Helper function: Kun holatini aniqlash
function getDayStatus(dateString, today) {
  const date = new Date(dateString);
  const todayStr = today.toISOString().split("T")[0];

  if (dateString === todayStr) return "bugun";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dateString === yesterdayStr) return "kecha";

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  if (dateString === tomorrowStr) return "ertaga";

  return date < today ? "o'tgan" : "kelasi";
}

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

exports.getWeeklyLessonsForChildren = async (req, res) => {
  try {
    const { guardianPhoneNumber } = req.user;
    const { startDate, endDate } = req.query; // Hafta oralig'ini olish uchun

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

    // Sana oralig'ini aniqlash
    const today = new Date();
    const start = startDate ? new Date(startDate) : new Date(today);
    const end = endDate ? new Date(endDate) : new Date(today);

    if (!startDate) {
      start.setDate(today.getDate() - 6); // 1 hafta oldingi kunlarni ko'rsatish
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const result = [];

    for (let child of children) {
      // Studentning haftalik dars rejasini olish
      const weeklySchedule = await LessonSchedule.find({
        groupId: child.groupId._id,
      })
        .populate("subjectId", "name")
        .populate("teacherId", "firstName lastName")
        .lean();

      // Haftalik rejani kunlar bo'yicha guruhlash
      const daysOfWeek = [
        "yakshanba",
        "dushanba",
        "seshanba",
        "chorshanba",
        "payshanba",
        "juma",
        "shanba",
      ];
      const scheduleByDay = {};

      daysOfWeek.forEach((day) => {
        scheduleByDay[day] = weeklySchedule
          .filter((lesson) => lesson.day === day)
          .sort((a, b) => a.lessonNumber - b.lessonNumber)
          .map((lesson) => ({
            subject: lesson.subjectId?.name,
            lessonNumber: lesson.lessonNumber,
            teacher: lesson.teacherId
              ? `${lesson.teacherId.firstName} ${lesson.teacherId.lastName}`
              : "Noma'lum",
            startTime: lesson.startTime || null,
            endTime: lesson.endTime || null,
          }));
      });

      // Belgilangan oralikdagi haqiqiy darslar (o'tkazilgan yoki rejalashtirilgan)
      const actualLessons = await LessonSchedule.find({
        groupId: child.groupId._id,
        // Agar lessonDate maydoni bo'lsa, undan foydalaning
        ...(LessonSchedule.schema.path("lessonDate") && {
          lessonDate: { $gte: start, $lte: end },
        }),
      })
        .populate("subjectId", "name")
        .populate("teacherId", "firstName lastName")
        .lean();

      // Bugungi darslar
      const todayName = daysOfWeek[today.getDay()];
      const todayLessons = scheduleByDay[todayName] || [];

      // Ertangi darslar
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowName = daysOfWeek[tomorrow.getDay()];
      const tomorrowLessons = scheduleByDay[tomorrowName] || [];

      // Kechagi darslar (1 kun oldin)
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayName = daysOfWeek[yesterday.getDay()];
      const yesterdayLessons = scheduleByDay[yesterdayName] || [];

      // Bugungi darslar uchun uyga vazifalarni olish
      const todayLessonsWithHomework = await Promise.all(
        todayLessons.map(async (lesson) => {
          const homeworks = await Homework.find({
            subjectId: {
              $in: weeklySchedule
                .filter((l) => l.subjectId?.name === lesson.subject)
                .map((l) => l.subjectId),
            },
            groupId: child.groupId._id,
            createdAt: { $gte: start, $lte: end },
          })
            .populate("subjectId", "name")
            .populate("teacherId", "firstName lastName")
            .sort({ createdAt: -1 })
            .lean();

          return {
            ...lesson,
            homeworks: homeworks.map((hw) => ({
              id: hw._id,
              title: hw.title,
              description: hw.description,
              assignedDate: hw.createdAt,
              deadline: hw.deadline || null,
            })),
          };
        })
      );

      result.push({
        student: {
          id: child._id,
          name: `${child.firstName} ${child.lastName}`,
          group: `${child.groupId.number}-${child.groupId.name}`,
        },
        weeklySchedule: scheduleByDay, // Butun haftalik reja
        yesterday: {
          date: yesterday.toISOString().split("T")[0],
          dayName: yesterdayName,
          lessons: yesterdayLessons,
        },
        today: {
          date: today.toISOString().split("T")[0],
          dayName: todayName,
          lessons: todayLessonsWithHomework,
        },
        tomorrow: {
          date: tomorrow.toISOString().split("T")[0],
          dayName: tomorrowName,
          lessons: tomorrowLessons,
        },
        dateRange: {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        },
      });
    }

    res.json({
      message: "Farzand dars jadvali",
      data: result,
    });
  } catch (error) {
    console.error("getWeeklyLessonsForChildren error:", error);
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// getWeeklyLessonsForChildren funksiyasidan keyin qo'shing:

// 🟢 YANGI: Kunlik baholar funksiyasi
exports.getChildDailyGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { guardianPhoneNumber } = req.user;
    const { startDate, endDate } = req.query;

    // 1. Studentni topish va validatsiya
    const student = await Student.findById(studentId)
      .populate("groupId", "name number")
      .lean();

    if (!student) {
      return res.status(404).json({
        message: "Student topilmadi",
        variant: "error",
        innerData: null,
      });
    }

    // 2. Ota-ona huquqini tekshirish
    if (student.guardianPhoneNumber !== guardianPhoneNumber) {
      return res.status(403).json({
        message: "Bu farzandning ma'lumotlarini ko'rishga ruxsatingiz yo'q",
        variant: "error",
        innerData: null,
      });
    }

    // 3. Sana oralig'ini aniqlash
    const today = new Date();
    const start = startDate ? new Date(startDate) : new Date(today);
    const end = endDate ? new Date(endDate) : new Date(today);

    // Agar startDate berilmagan bo'lsa, 1 hafta oldingi kunlarni olish
    if (!startDate) {
      start.setDate(today.getDate() - 6);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // 4. Baholarni olish (kunlik guruhlab)
    const grades = await Grade.find({
      studentId,
      createdAt: { $gte: start, $lte: end },
    })
      .populate({
        path: "lessonId",
        populate: [
          { path: "subjectId", select: "name" },
          { path: "teacherId", select: "firstName lastName" },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    // 5. Kunlar bo'yicha guruhlash
    const gradesByDay = {};

    grades.forEach((grade) => {
      if (!grade.lessonId) return;

      const dateKey = grade.createdAt.toISOString().split("T")[0];

      if (!gradesByDay[dateKey]) {
        gradesByDay[dateKey] = {
          date: dateKey,
          dayName: getUzbekDayName(grade.createdAt.getDay()),
          totalGrades: 0,
          averageGrade: 0,
          subjects: [],
        };
      }

      // Subject bo'yicha guruhlash
      const subjectName = grade.lessonId.subjectId?.name || "Noma'lum";
      const teacherName = grade.lessonId.teacherId
        ? `${grade.lessonId.teacherId.firstName} ${grade.lessonId.teacherId.lastName}`
        : "Noma'lum";

      const existingSubject = gradesByDay[dateKey].subjects.find(
        (s) => s.subject === subjectName
      );

      if (existingSubject) {
        existingSubject.grades.push({
          grade: grade.grade,
          status: grade.status,
          lessonNumber: grade.lessonId.lessonNumber,
          teacher: teacherName,
          time: grade.createdAt.toLocaleTimeString("uz-UZ"),
        });
      } else {
        gradesByDay[dateKey].subjects.push({
          subject: subjectName,
          grades: [
            {
              grade: grade.grade,
              status: grade.status,
              lessonNumber: grade.lessonId.lessonNumber,
              teacher: teacherName,
              time: grade.createdAt.toLocaleTimeString("uz-UZ"),
            },
          ],
        });
      }

      gradesByDay[dateKey].totalGrades++;
    });

    // 6. O'rtacha baholarni hisoblash
    Object.keys(gradesByDay).forEach((dateKey) => {
      const day = gradesByDay[dateKey];
      let total = 0;
      let count = 0;

      day.subjects.forEach((subject) => {
        subject.grades.forEach((g) => {
          if (g.grade && typeof g.grade === "number") {
            total += g.grade;
            count++;
          }
        });
      });

      day.averageGrade = count > 0 ? (total / count).toFixed(1) : 0;
      day.totalGrades = count;
    });

    // 7. Response tayyorlash
    const sortedDates = Object.keys(gradesByDay).sort().reverse();

    const result = {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        group: `${student.groupId.number}-${student.groupId.name}`,
      },
      dateRange: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
        totalDays: sortedDates.length,
      },
      summary: {
        totalGrades: grades.length,
        daysWithGrades: sortedDates.length,
        averageGrade:
          grades.length > 0
            ? (
                grades.reduce((sum, g) => sum + (g.grade || 0), 0) /
                grades.filter((g) => g.grade).length
              ).toFixed(1)
            : 0,
      },
      dailyGrades: sortedDates.map((dateKey) => gradesByDay[dateKey]),
    };

    res.json({
      message: "Farzand kunlik baholari",
      variant: "success",
      innerData: result,
    });
  } catch (error) {
    console.error("getChildDailyGrades error:", error);
    res.status(500).json({
      message: "Server xatosi",
      variant: "error",
      innerData: null,
      error: error.message,
    });
  }
};

// getChildHomeworksForPeriod funksiyasidan oldin qo'shing:

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
