const express = require("express");
const router = express.Router();

// ================= Controllers ================= //
const { loginSchool } = require("../controllers/authController");
const { addSchool, getSchool } = require("../controllers/schoolController");
const {
  addUser,
  getAllUsers,
  loginStaff,
} = require("../controllers/userController");
const {
  addStudent,
  getAllStudents,
  updateStudent,
  toggleActiveStatus,
  deleteStudent,
} = require("../controllers/studentController");
const {
  addTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  loginTeacher,
} = require("../controllers/teacherController");
const teacherValidation = require("../validations/teacherValidation");
const {
  createGroup,
  getAllGroups,
  addStudentToGroup,
  getGroupStudents,
  updateGroup,
} = require("../controllers/groupController");
const {
  addStudentDavomat,
  getDavomat,
} = require("../controllers/oquvchiDavomatController");
const {
  addTeacherDavomat,
  getTeacherDavomat,
} = require("../controllers/teacherDavomatController");
const {
  createPayment,
  getPaymentByUserId,
  getPayments,
  checkDebtStatus,
  editPayment,
  getMonthlyPaymentSummary,
  getDebts,
  deletePayment,
  getMonthlyPaymentSummaryForGivenMonth,
  getPaymentLog,
} = require("../controllers/paymentController");
const {
  createHarajat,
  getHarajat,
  getMonthlyExpenseSummary,
  updateHarajat,
} = require("../controllers/harajatController");
const {
  paySalary,
  getSalary,
  createExchangeLesson,
  getMonthlySalarySummary,
  updateSalary,
  addAttendanceSalary,
  updateSalaryLog,
} = require("../controllers/salaryController");
const {
  addSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");
const {
  createLesson,
  updateLesson,
  deleteLesson,
  getScheduleByDate,
  getLessonStudents,
  getScheduleByClass,
  getScheduleByTeacher,
} = require("../controllers/lessonScheduleController");
const {
  addGrade,
  getGradesByStudent,
  getGradesByGroup,
  getGradesByLesson,
} = require("../controllers/gradeController");
const {
  parentLogin,
  getMyChildren,
  getChildGrades,
  getChildrenPayments,
  getTodayLessonsForChildren,
  getChildrenExamResults,
} = require("../controllers/parentController");
const {
  addHomework,
  getHomeworkByLesson,
  getHomeworkByGroup,
  updateHomework,
} = require("../controllers/homeworkController");
const {
  createSession,
  getSessionStudents,
  bulkUpsertResults,
  toggleLock,
  getMyChildrenResults,
  getAllSessions,
} = require("../controllers/examController");
const {
  initResultsForSession,
  setScore,
  getResultsBySession,
} = require("../controllers/examResultController");
const { getTeacherJournal } = require("../controllers/journalController");
const {
  getStudentOverview,
} = require("../controllers/parentOverviewController");
// ---------- Quarters ----------
const {
  setSchoolQuarters,
  getSchoolQuarters,
} = require("../controllers/quarter.controller");


// ================= Middleware ================= //
const auth = require("../middlewares/authMiddleware");
const parentAuth = require("../middlewares/parentAuthMiddleware");

// ================= Routes ================= //

// ---------- Schools ----------
router.post("/schools/login", loginSchool);
router.post("/schools", addSchool);
router.get("/schools/me", getSchool);

// ---------- Users ----------
router.post("/users/login", loginStaff);
router.post("/users", addUser);
router.get("/users", getAllUsers);

// ---------- Teachers ----------
router.post("/teachers/login", loginTeacher);
router.post("/teachers", teacherValidation, addTeacher);
router.get("/teachers", getAllTeachers);
router.get("/teachers/:id", getTeacherById);
router.put("/teachers/:id", updateTeacher);
router.delete("/teachers/:id", deleteTeacher);

// ---------- Teacher’s own schedule ----------
router.get("/teacher/schedule/today/:date?", auth, getScheduleByDate);
router.get("/teacher/schedule/:lessonId/students", auth, getLessonStudents);

// ---------- Students ----------
router.post("/students", addStudent);
router.get("/students", getAllStudents);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);
router.patch("/students/:id/status", toggleActiveStatus);

// ---------- Groups ----------
router.post("/groups", createGroup);
router.get("/groups", getAllGroups);
router.put("/groups/:id", updateGroup);
router.post("/groups/:id/students", addStudentToGroup);
router.get("/groups/:id/students", getGroupStudents);

// ---------- Attendance (davomat) ----------
router.post("/davomat/student", addStudentDavomat);
router.get("/davomat/student", getDavomat);
router.post("/davomat/student/scan", addStudentDavomat);
router.post("/davomat/teacher", addTeacherDavomat);
router.get("/davomat/teacher", getTeacherDavomat);

// ---------- Payments ----------
// ---------- Payments ----------
router.post("/payments", auth, createPayment);
router.get("/payments", auth, getPayments);
router.get("/payments/debts", auth, getDebts);
router.get("/payments/summary", auth, getMonthlyPaymentSummary);
router.get("/payments/summary/month", auth, getMonthlyPaymentSummaryForGivenMonth);
router.get("/payments/logs", auth, getPaymentLog);
router.post("/payments/check", auth, checkDebtStatus); // ✅ auth qo'shildi
router.get("/payments/:user_id", auth, getPaymentByUserId);
router.put("/payments/:id", auth, editPayment);
router.delete("/payments/:id", auth, deletePayment);

// ---------- Harajat ----------
router.post("/expenses", createHarajat);
router.get("/expenses", getHarajat);
router.put("/expenses/:id", updateHarajat);
router.get("/expenses/summary", getMonthlyExpenseSummary);

// ---------- Salary ----------
router.post("/salary", paySalary);
router.get("/salary", getSalary);
router.put("/salary", updateSalary);
router.get("/salary/summary", getMonthlySalarySummary);
router.post("/salary/exchange", createExchangeLesson);
router.post("/salary/attendance", addAttendanceSalary);
router.patch("/salary/log",  updateSalaryLog);

// ---------- Subjects ----------
router.post("/subjects", addSubject);
router.get("/subjects", getSubjects);
router.get("/subjects/:id", getSubjectById);
router.put("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);

// ---------- Lesson Schedule ----------
router.post("/schedule", createLesson);
router.get("/schedule/class/:groupId", getScheduleByClass);
router.get("/schedule/teacher/:teacherId", getScheduleByTeacher);
router.put("/schedule/:id", updateLesson);
router.delete("/schedule/:id", deleteLesson);

// ---------- Grades ----------
router.post("/grades", addGrade);
router.get("/grades/student/:id", getGradesByStudent);
router.get("/grades/group/:groupId", getGradesByGroup);
router.get("/grades/lesson/:lessonId", getGradesByLesson);

// ---------- Homework ----------
router.post("/homework", auth, addHomework);
router.get("/homework/lesson/:lessonId", getHomeworkByLesson);
router.get("/homework/group/:groupId", getHomeworkByGroup);
router.put("/homework/:homeworkId", auth, updateHomework);

// ---------- Parents ----------
router.post("/parents/login", parentLogin);

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

// ---------- Exams ----------
router.post("/exams/session", auth, createSession);
router.get("/exams/session/:sessionId/students", auth, getSessionStudents);
router.post("/exams/session/:sessionId/results", auth, bulkUpsertResults);
router.patch("/exams/session/:sessionId/lock", auth, toggleLock);
router.get("/exams/sessions", auth, getAllSessions);

// ---------- Results ----------
router.get("/me/results", auth, getMyChildrenResults);
router.post("/init/:sessionId", auth, initResultsForSession);
router.put("/score/:resultId", auth, setScore);
router.get("/session/:sessionId", auth, getResultsBySession);

// ---------- Journals ----------
router.get("/teacher/journal", auth, getTeacherJournal);

// ---------- Quarters (Choraklar) ----------

// Admin / School choraklarni belgilaydi
router.post("/quarters/set", auth, setSchoolQuarters);

// Maktab choraklarini olish (kerak bo‘lsa frontend uchun)
router.get("/quarters/:schoolId", auth, getSchoolQuarters);


module.exports = router;
