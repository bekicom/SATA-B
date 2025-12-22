const express = require("express");
const router = express.Router();
const parentAuth = require("../middlewares/parentAuthMiddleware");
// === Controllers ===
const {
  parentLogin,
  getMyChildren,
  getChildGrades,
  getChildDailyGrades,
  getTodayLessonsForChildren,
  getWeeklyLessonsForChildren,
  getLessonsAndHomeworksByDateForChildren,
  getChildHomework,
  getChildHomeworksForPeriod,
  getChildrenPayments,
  getChildrenDebts,
  getChildrenExamResults, 
  getChildExamResults,
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
router.get("/children", parentAuth, getMyChildren);
// 📚 LESSONS
router.get("/today-lessons", parentAuth, getTodayLessonsForChildren);
router.get("/weekly-lessons", parentAuth, getWeeklyLessonsForChildren);
router.get(
  "/lessons-homeworks",
  parentAuth,
  getLessonsAndHomeworksByDateForChildren
);
// 📚 HOMEWORK
router.get("/homework/:studentId", parentAuth, getChildHomework);
router.get(
  "/homeworks-period/:studentId",
  parentAuth,
  getChildHomeworksForPeriod
);
// 📊 GRADES
router.get("/grades/:studentId", parentAuth, getChildGrades);
router.get("/daily-grades/:studentId", parentAuth, getChildDailyGrades);
// 💰 FINANCE
router.get("/payments", parentAuth, getChildrenPayments);
router.get("/debts", parentAuth, getChildrenDebts);
// 🧾 EXAMS
router.get("/exam-results", parentAuth, getChildrenExamResults);
router.get("/children/:id/exam-results", parentAuth, getChildExamResults); // ✅ bitta farzand
// 📈 OVERVIEW
router.get("/overview/:studentId", parentAuth, getStudentOverview);
// ================================================
// ✅ OLD PATHS (BACKWARD COMPATIBILITY)
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
// eski nom: /parents/children/exams -> hamma farzand imtihon natijalari
router.get("/parents/children/exams", parentAuth, getChildrenExamResults);
// eski nom: overview
router.get("/parents/overview/:studentId", parentAuth, getStudentOverview);

router.get("/children/:id/exam-results", parentAuth, getChildExamResults);



module.exports = router;
