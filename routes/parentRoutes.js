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
} = require("../controllers/parentController");

const {
  getStudentOverview,
} = require("../controllers/parentOverviewController");

// === ROUTERLAR ===

// 🔐 Login — token olish
router.post("/login", parentLogin);
// 👨‍👩‍👧 Farzandlar ro‘yxati
router.get("/me", parentAuth, getMyChildren);
router.get("/children", parentAuth, getMyChildren);
// 📘 Baholar
router.get("/grades/:studentId", parentAuth, getChildGrades);
// 📆 Bugungi darslar
router.get("/today-lessons", parentAuth, getTodayLessonsForChildren);
// 💰 To‘lovlar
router.get("/payments", parentAuth, getChildrenPayments);
// 🧾 Imtihon natijalari
router.get("/exam-results", parentAuth, getChildrenExamResults);
// 📊 Umumiy overview (o‘quvchi holati, so‘nggi baholar, chorak va oy tahlili)
router.get("/overview/:studentId", getStudentOverview);
// ✅ OTA-ONA uchun himoyalangan yo‘llar
router.get("/parents/children", parentAuth, getMyChildren);
router.get("/parents/children/grades/:studentId", parentAuth, getChildGrades);
router.get("/parents/children/payments", parentAuth, getChildrenPayments);
router.get("/parents/children/exams", parentAuth, getChildrenExamResults);
router.get(
  "/parents/children/today-lessons",
  parentAuth,
  getTodayLessonsForChildren
);
router.get("/parents/overview/:studentId", parentAuth, getStudentOverview);

module.exports = router;
