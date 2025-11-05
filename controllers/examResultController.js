const ExamResult = require("../models/examResultModel");
const Student = require("../models/studentModel");
const ExamSession = require("../models/examSessionModel");

// 1) Session bo‘yicha barcha studentlarga "bo‘sh natija" yaratish
exports.initResultsForSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ExamSession.findById(sessionId).populate("groupId");
    if (!session) {
      return res.status(404).json({ message: "Session topilmadi" });
    }

    // Guruhdagi barcha o‘quvchilarni olish
    const students = await Student.find({ groupId: session.groupId });
    if (students.length === 0) {
      return res.status(400).json({ message: "Guruhda o‘quvchi yo‘q" });
    }

    // Har bir student uchun result yaratiladi (agar mavjud bo‘lmasa)
    const bulkOps = students.map((student) => ({
      updateOne: {
        filter: { sessionId, studentId: student._id },
        update: {
          $setOnInsert: {
            sessionId,
            studentId: student._id,
            subjectId: session.subjectId,
            createdBy: req.user._id, // teacher
          },
        },
        upsert: true,
      },
    }));

    await ExamResult.bulkWrite(bulkOps);

    res.json({ message: "Barcha studentlarga natija tayyorlandi" });
  } catch (err) {
    res.status(500).json({ message: "Xatolik", error: err.message });
  }
};

// 2) Bitta studentga baho qo‘yish
exports.setScore = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { score } = req.body;

    const result = await ExamResult.findByIdAndUpdate(
      resultId,
      { score },
      { new: true }
    ).populate("studentId", "firstName lastName");

    if (!result) {
      return res.status(404).json({ message: "Natija topilmadi" });
    }

    res.json({
      message: "Baho qo‘yildi",
      result,
    });
  } catch (err) {
    res.status(500).json({ message: "Xatolik", error: err.message });
  }
};

// 3) Session bo‘yicha barcha natijalarni olish
exports.getResultsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const results = await ExamResult.find({ sessionId })
      .populate("studentId", "firstName lastName")
      .populate("subjectId", "name");

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Xatolik", error: err.message });
  }
};

exports.getChildGrades = async (req, res) => {
  try {
    const { id } = req.params; // studentId
    const { guardianPhoneNumber } = req.user; // parentAuth dan keladi

    // 1) Student ota-onaga tegishlimi?
    const student = await Student.findOne({ _id: id, guardianPhoneNumber });
    if (!student) {
      return res.status(403).json({
        message: "Bu farzand sizga tegishli emas",
        variant: "warning",
      });
    }

    // 2) Shu student qatnashgan barcha darslarni olish
    const lessons = await LessonSchedule.find({ "students._id": id }).select(
      "subject date students"
    );

    // 3) Har bir darsdan studentning bahosi va statusini ajratib olish
    const grades = lessons.map((lesson) => {
      const studentData = lesson.students.find((s) => s._id.toString() === id);
      return {
        subject: lesson.subject,
        date: lesson.date,
        grade: studentData?.grade || null,
        status: studentData?.status || null,
      };
    });

    res.json({
      message: "Farzand baholari",
      variant: "success",
      innerData: grades,
    });
  } catch (err) {
    console.error("getChildGrades error:", err);
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

exports.updateResult = async (req, res) => {
  try {
    const { score } = req.body;
    const { resultId } = req.params;

    if (typeof score !== "number") {
      return res.status(400).json({ message: "Baho raqam bo‘lishi kerak" });
    }

    const updated = await ExamResult.findByIdAndUpdate(
      resultId,
      { score },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Natija topilmadi" });
    }

    res.json({
      message: "Baho yangilandi",
      result: updated,
    });
  } catch (err) {
    res.status(500).json({
      message: "Natijani yangilashda xato",
      error: err.message,
    });
  }
};