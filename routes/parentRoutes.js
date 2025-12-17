const express = require("express");
const router = express.Router();
const parentAuth = require("../middlewares/parentAuthMiddleware");

// === Controllerlar ===
const {
  parentLogin,
  getMyChildren,
  getChildGrades,
  getChildrenPayments,
  getTodayLessonsForChildren,
  getChildrenExamResults,
  getChildrenDebts,
  getChildHomework,
  getWeeklyLessonsForChildren,
  getChildHomeworksForPeriod,
  getChildDailyGrades, // 🟢 YANGI: Kunlik baholar
} = require("../controllers/parentController");

const {
  getStudentOverview,
} = require("../controllers/parentOverviewController");

// === ROUTERLAR ===

// 🔐 AUTHENTICATION
router.post("/login", parentLogin);

// 👨‍👩‍👧 PARENT & CHILDREN INFO
router.get("/me", parentAuth, getMyChildren);
router.get("/children", parentAuth, getMyChildren);

// 📚 LESSONS & SCHEDULE
router.get("/today-lessons", parentAuth, getTodayLessonsForChildren); // Bugungi darslar
router.get("/weekly-lessons", parentAuth, getWeeklyLessonsForChildren); // Haftalik darslar

// 📚 HOMEWORK
router.get("/homework/:studentId", parentAuth, getChildHomework); // Barcha uyga vazifalar
router.get(
  "/homeworks-period/:studentId",
  parentAuth,
  getChildHomeworksForPeriod
); // Davr uchun vazifalar

// 📊 GRADES
router.get("/grades/:studentId", parentAuth, getChildGrades); // Baholar (eski)
router.get("/daily-grades/:studentId", parentAuth, getChildDailyGrades); // Kunlik baholar (yangi)

// 💰 PAYMENTS & FINANCE
router.get("/payments", parentAuth, getChildrenPayments); // To'lovlar
router.get("/debts", parentAuth, getChildrenDebts); // Qarzdorliklar

// 🧾 EXAMS
router.get("/exam-results", parentAuth, getChildrenExamResults); // Imtihon natijalari

// 📈 OVERVIEW
router.get("/overview/:studentId", parentAuth, getStudentOverview); // Umumiy ma'lumot

// ================================================
// ✅ OLD PATHS FOR BACKWARD COMPATIBILITY
// ================================================

// 👨‍👩‍👧 Farzandlar
router.get("/parents/children", parentAuth, getMyChildren);

// 📚 Darslar
router.get(
  "/parents/children/today-lessons",
  parentAuth,
  getTodayLessonsForChildren
);
router.get(
  "/parents/children/weekly-lessons",
  parentAuth,
  getWeeklyLessonsForChildren
);

// 📚 Uyga vazifalar
router.get(
  "/parents/children/homework/:studentId",
  parentAuth,
  getChildHomework
);
router.get(
  "/parents/children/homeworks-period/:studentId",
  parentAuth,
  getChildHomeworksForPeriod
);

// 📊 Baholar
router.get("/parents/children/grades/:studentId", parentAuth, getChildGrades);
router.get(
  "/parents/children/daily-grades/:studentId",
  parentAuth,
  getChildDailyGrades
);

// 💰 Moliya
router.get("/parents/children/payments", parentAuth, getChildrenPayments);
router.get("/parents/children/debts", parentAuth, getChildrenDebts);

// 🧾 Imtihonlar
router.get("/parents/children/exams", parentAuth, getChildrenExamResults);

// 📈 Umumiy
router.get("/parents/overview/:studentId", parentAuth, getStudentOverview);

module.exports = router;
