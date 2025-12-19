const express = require("express");
const router = express.Router();
const parentAuth = require("../middlewares/parentAuthMiddleware");

// === Controllers ===
const {
  parentLogin,
  getMyChildren,
  getChildGrades,
  getChildrenPayments,
  getTodayLessonsForChildren,
  getChildrenExamResults,
  getChildrenDebts,
  getChildHomework,
  getLessonsAndHomeworksByDateForChildren,
  getWeeklyLessonsForChildren,
  getChildHomeworksForPeriod,
  getChildDailyGrades,
} = require("../controllers/parentController");

const {
  getStudentOverview,
} = require("../controllers/parentOverviewController");

// ================================================
// ✅ MAIN ROUTES (new clean API)
// ================================================

// 🔐 AUTH
router.post("/login", parentLogin);

// 👨‍👩‍👧 CHILDREN
router.get("/children", parentAuth, getMyChildren); // parent children list

// 📚 LESSONS
router.get("/today-lessons", parentAuth, getTodayLessonsForChildren); // today or ?date=
router.get("/weekly-lessons", parentAuth, getWeeklyLessonsForChildren); // weekly schedule
router.get(
  "/lessons-homeworks",
  parentAuth,
  getLessonsAndHomeworksByDateForChildren
); // ✅ ?date=YYYY-MM-DD

// 📚 HOMEWORK
router.get("/homework/:studentId", parentAuth, getChildHomework); // all homeworks
router.get(
  "/homeworks-period/:studentId",
  parentAuth,
  getChildHomeworksForPeriod
); // ?start=YYYY-MM-DD&end=YYYY-MM-DD (sizdagi controllerga mos)

// 📊 GRADES
router.get("/grades/:studentId", parentAuth, getChildGrades);
router.get("/daily-grades/:studentId", parentAuth, getChildDailyGrades);

// 💰 FINANCE
router.get("/payments", parentAuth, getChildrenPayments);
router.get("/debts", parentAuth, getChildrenDebts);

// 🧾 EXAMS
router.get("/exam-results", parentAuth, getChildrenExamResults);

// 📈 OVERVIEW
router.get("/overview/:studentId", parentAuth, getStudentOverview);

// ================================================
// ✅ OLD PATHS (BACKWARD COMPATIBILITY)
// Agar eski frontend ishlatayotgan bo‘lsa, shular qolsin
// ================================================

router.get("/parents/children", parentAuth, getMyChildren);

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

router.get(
  "/parents/children/lessons-homeworks",
  parentAuth,
  getLessonsAndHomeworksByDateForChildren
);

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

router.get("/parents/children/grades/:studentId", parentAuth, getChildGrades);
router.get(
  "/parents/children/daily-grades/:studentId",
  parentAuth,
  getChildDailyGrades
);

router.get("/parents/children/payments", parentAuth, getChildrenPayments);
router.get("/parents/children/debts", parentAuth, getChildrenDebts);

router.get("/parents/children/exams", parentAuth, getChildrenExamResults);

router.get("/parents/overview/:studentId", parentAuth, getStudentOverview);

module.exports = router;
