const ExamSession = require("../models/examSessionModel");
const ExamResult = require("../models/examResultModel");
const Student = require("../models/studentModel");
const Group = require("../models/groupModel");
const Subject = require("../models/subjectModel");
const Quarter = require("../models/quarterModel");
// helper: type normalize (xohlasangiz)
const normalizeType = (t) => {
  // Frontend monthly/quarterly/yearly yuborsa ham ishlasin desangiz:
  if (t === "monthly") return "Oylik";
  if (t === "quarterly") return "Choraklik";
  if (t === "yearly") return "Yillik";
  return t; // Oylik/Choraklik/Yillik bo‘lsa shu qaytadi
};

// === Yangi session yaratish ===
exports.createSession = async (req, res) => {
  try {
    let { type, year, month, quarter, groupId, subjectId, maxScore } = req.body;

    // frontend monthly/quarterly yuborsa ham ishlasin
    if (type === "monthly") type = "Oylik";
    if (type === "quarterly") type = "Choraklik";
    if (type === "yearly") type = "Yillik";

    if (type === "Oylik" && !month)
      return res.status(400).json({ message: "Oy tanlanishi shart" });

    if (type === "Choraklik" && !quarter)
      return res.status(400).json({ message: "Chorak tanlanishi shart" });

    // ✅ Chorakni DB dan tekshiramiz
    let quarterDoc = null;
    if (type === "Choraklik") {
      quarterDoc = await Quarter.findOne({
        schoolId: req.user.schoolId,
        number: Number(quarter),
        isActive: true,
      });

      if (!quarterDoc) {
        return res.status(404).json({
          message: "Bu chorak maktab tomonidan belgilanmagan",
        });
      }
    }

    const session = await ExamSession.create({
      schoolId: req.user.schoolId,
      type,
      year: Number(year),

      month: type === "Oylik" ? Number(month) : null,
      quarter: type === "Choraklik" ? Number(quarter) : null, // optional
      quarterId: type === "Choraklik" ? quarterDoc._id : null, // ✅ asosiy bog‘lanish

      groupId,
      subjectId,
      maxScore: maxScore ?? 100,
      createdBy: req.user.teacherId,
    });

    res.status(201).json({
      message: "Session yaratildi",
      session,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Bu chorak/fan/guruh uchun session allaqachon mavjud",
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
      .populate("subjectId", "title name"); // subject modelingiz qaysi field ishlatsa

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
      score: map.get(String(st._id)) ?? 0, // siz 0 yaratgansiz -> default 0
    }));

    res.json({
      session: {
        _id: session._id,
        type: session.type,
        year: session.year,
        month: session.month,
        quarter: session.quarter,
        groupName: session.groupId.name,
        subjectTitle: session.subjectId.title || session.subjectId.name,
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

// === 3) Natijalarni bulk qo‘shish/yangi qilish (TEZ variant) ===
exports.bulkUpsertResults = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ExamSession.findOne({
      _id: sessionId,
      schoolId: req.user.schoolId,
    });
    if (!session) return res.status(404).json({ message: "Session topilmadi" });
    if (session.isLocked)
      return res.status(423).json({ message: "Session locked" });

    const max = session.maxScore ?? 100;
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    const ops = [];
    for (const item of items) {
      if (!item?.studentId) continue;

      const score = Number(item.score);
      if (Number.isNaN(score)) continue;
      if (score > max) continue;
      if (score < 0) continue;

      ops.push({
        updateOne: {
          filter: { sessionId, studentId: item.studentId },
          update: {
            $set: {
              score,
              comment: item.comment ?? null,
              updatedBy: req.user.teacherId,
            },
            $setOnInsert: {
              schoolId: req.user.schoolId,
              sessionId,
              studentId: item.studentId,
              subjectId: session.subjectId,
              createdBy: req.user.teacherId,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) return res.json({ created: 0, updated: 0 });

    const r = await ExamResult.bulkWrite(ops);

    // bulkWrite aniq created/updated ni turlicha qaytaradi, shunga yaqin hisob:
    const created = r.upsertedCount || 0;
    const updated = r.modifiedCount || 0;

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
      { $set: { isLocked: Boolean(isLocked) } },
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
    const childIds = req.user.childrenIds;

    const results = await ExamResult.find({
      schoolId: req.user.schoolId,
      studentId: { $in: childIds },
    })
      .populate(
        "sessionId",
        "type year month quarter subjectId groupId maxScore"
      )
      .populate("sessionId.subjectId", "title name")
      .populate("sessionId.groupId", "name");

    res.json(results);
  } catch (err) {
    res.status(500).json({
      message: "Farzand natijalarini olishda xato",
      error: err.message,
    });
  }
};

exports.getAllSessions = async (req, res) => {
  try {
    let { groupId, subjectId, year, type, month, quarter } = req.query;

    type = type ? normalizeType(type) : undefined;

    const filter = { schoolId: req.user.schoolId };
    if (groupId) filter.groupId = groupId;
    if (subjectId) filter.subjectId = subjectId;
    if (year) filter.year = Number(year);
    if (type) filter.type = type;

    // type ga mos filtr
    if (month) filter.month = Number(month);
    if (quarter) filter.quarter = Number(quarter);

    const sessions = await ExamSession.find(filter)
      .populate("groupId", "name")
      .populate("subjectId", "_id title name") // qaysi field bo‘lsa
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
