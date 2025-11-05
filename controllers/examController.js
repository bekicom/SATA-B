const ExamSession = require("../models/examSessionModel");
const ExamResult = require("../models/examResultModel");
const Student = require("../models/studentModel");
const Group = require("../models/groupModel");
const Subject = require("../models/subjectModel");

// === 1) Yangi session yaratish ===
exports.createSession = async (req, res) => {
  try {
    const { type, year, month, quarter, groupId, subjectId, maxScore } =
      req.body;

    if (type === "monthly" && !month) {
      return res.status(400).json({ message: "Oy tanlanishi shart" });
    }
    if (type === "quarterly" && !quarter) {
      return res.status(400).json({ message: "Chorak tanlanishi shart" });
    }

    // Guruh va fan tekshiruv
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Guruh topilmadi" });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Fan topilmadi" });

    // Session yaratish
    const session = await ExamSession.create({
      schoolId: req.user.schoolId, // token’dan keladi
      type,
      year,
      month: month ?? null,
      quarter: quarter ?? null,
      groupId,
      subjectId,
      maxScore: maxScore ?? 100,
      createdBy: req.user.teacherId,
    });

    // ✅ Studentlarga 0 baho yozib qo‘yish
    const students = await Student.find({ groupId });
    if (students.length > 0) {
      const bulkOps = students.map((student) => ({
        updateOne: {
          filter: { sessionId: session._id, studentId: student._id },
          update: {
            $setOnInsert: {
              sessionId: session._id,
              studentId: student._id,
              subjectId,
              score: 0, // boshlang‘ich baho
              createdBy: req.user.teacherId,
            },
          },
          upsert: true,
        },
      }));

      await ExamResult.bulkWrite(bulkOps);
    }

    res.status(201).json({
      message: "Session yaratildi va barcha studentlarga 0 baho qo‘yildi",
      session,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Bu davr/fan/guruh uchun allaqachon session yaratilgan",
      });
    }
    res.status(500).json({
      message: "Session yaratishda xato",
      error: err.message,
    });
  }
};



// === 2) Session bo‘yicha o‘quvchilar ro‘yxati ===
exports.getSessionStudents = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ExamSession.findOne({
      _id: sessionId,
      schoolId: req.user.schoolId,
    })
      .populate("groupId", "name students")
      .populate("subjectId", "title");

    if (!session) return res.status(404).json({ message: "Session topilmadi" });

    const students = await Student.find({
      _id: { $in: session.groupId.students },
    }).select("_id firstName lastName middleName");

    const results = await ExamResult.find({ sessionId }).select(
      "studentId score"
    );
    const map = new Map(results.map((r) => [String(r.studentId), r.score]));

    const list = students.map((st) => ({
      _id: st._id,
      fullName: [st.lastName, st.firstName, st.middleName]
        .filter(Boolean)
        .join(" "),
      score: map.get(String(st._id)) ?? null,
    }));

    res.json({
      session: {
        _id: session._id,
        type: session.type,
        year: session.year,
        month: session.month,
        quarter: session.quarter,
        groupName: session.groupId.name,
        subjectTitle: session.subjectId.title,
        maxScore: session.maxScore,
        isLocked: session.isLocked,
      },
      students: list,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "O‘quvchilarni olishda xato", error: err.message });
  }
};

// === 3) Natijalarni bulk qo‘shish/yangi qilish ===
exports.bulkUpsertResults = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ExamSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session topilmadi" });
    if (session.isLocked)
      return res.status(423).json({ message: "Session locked" });

    const max = session.maxScore ?? 100;
    let created = 0,
      updated = 0;

    for (const item of req.body.items) {
      if (item.score > max) continue;

      const existing = await ExamResult.findOne({
        sessionId,
        studentId: item.studentId,
      });
      if (existing) {
        existing.score = item.score;
        existing.comment = item.comment ?? existing.comment;
        existing.updatedBy = req.user._id;
        await existing.save();
        updated++;
      } else {
        await ExamResult.create({
          schoolId: req.user.schoolId,
          sessionId,
          studentId: item.studentId,
          score: item.score,
          comment: item.comment || null,
          createdBy: req.user._id,
        });
        created++;
      }
    }

    res.json({ created, updated });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Natijalarni saqlashda xato", error: err.message });
  }
};

// === 4) Sessiyani lock/unlock qilish ===
exports.toggleLock = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { isLocked } = req.body;

    const session = await ExamSession.findOneAndUpdate(
      { _id: sessionId, schoolId: req.user.schoolId },
      { $set: { isLocked } },
      { new: true }
    );

    if (!session) return res.status(404).json({ message: "Session topilmadi" });

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Lock qilishda xato", error: err.message });
  }
};

// === 5) Ota-ona uchun farzand natijalari ===
exports.getMyChildrenResults = async (req, res) => {
  try {
    const childIds = req.user.childrenIds; // parentAuthMiddleware qo‘yadi
    const results = await ExamResult.find({
      schoolId: req.user.schoolId,
      studentId: { $in: childIds },
    })
      .populate("sessionId", "type year month quarter subjectId groupId")
      .populate("sessionId.subjectId", "title")
      .populate("sessionId.groupId", "name");

    res.json(results);
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Farzand natijalarini olishda xato",
        error: err.message,
      });
  }
};

// === 6) Barcha imtihon sessiyalarini olish ===
exports.getAllSessions = async (req, res) => {
  try {
    const { groupId, subjectId, year, type, month, quarter } = req.query;

    // Filtr shartlari
    const filter = { schoolId: req.user.schoolId };
    if (groupId) filter.groupId = groupId;
    if (subjectId) filter.subjectId = subjectId;
    if (year) filter.year = Number(year);
    if (type) filter.type = type;
    if (month) filter.month = Number(month);
    if (quarter) filter.quarter = Number(quarter);

    const sessions = await ExamSession.find(filter)
      .populate("groupId", "name")
      .populate("subjectId", "_id name") // ✅ id va title ikkalasi
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({
      message: "Sessiyalarni olishda xato",
      error: err.message,
    });
  }
};
