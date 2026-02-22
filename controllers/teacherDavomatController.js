const TeacherDavomat = require("../models/teacherDavomat");
const Teacher = require("../models/teacherModel");
const moment = require("moment-timezone");
const mongoose = require("mongoose");

exports.addTeacherDavomat = async (req, res) => {
  try {
    const { teacherId, employeeNo, davomatDate, status } = req.body;
    const schoolId = new mongoose.Types.ObjectId(req.user.schoolId);

    // ==============================
    // 1️⃣ O‘qituvchini topish
    // ==============================
    let teacher = null;

    if (teacherId) {
      teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    }

    if (!teacher && employeeNo) {
      teacher = await Teacher.findOne({ employeeNo, schoolId });
    }

    if (!teacher) {
      return res.status(404).json({ message: "O'qituvchi topilmadi" });
    }

    const resolvedTeacherId = teacher._id;

    // ==============================
    // 2️⃣ Sana
    // ==============================
    const baseDate = davomatDate
      ? moment.tz(davomatDate, "YYYY-MM-DD", "Asia/Tashkent")
      : moment().tz("Asia/Tashkent");

    const dateKey = baseDate.format("YYYY-MM-DD");

    let dayDoc = await TeacherDavomat.findOne({ schoolId, dateKey });

    if (!dayDoc) {
      dayDoc = await TeacherDavomat.create({
        schoolId,
        date: baseDate.startOf("day").toDate(),
        dateKey,
        body: [],
      });
    }

    const existingEntry = dayDoc.body.find(
      (e) => String(e.teacher_id) === String(resolvedTeacherId),
    );

    const nowMoment = moment.tz("Asia/Tashkent");

    // ==============================
    // 3️⃣ KELDI
    // ==============================
    if (status === "keldi") {
      if (existingEntry) {
        return res.status(409).json({
          success: false,
          message: "Bugun allaqachon kelgan",
        });
      }

      dayDoc.body.push({
        teacher_id: resolvedTeacherId,
        employeeNo: teacher.employeeNo,
        time: nowMoment.format("HH:mm:ss"),
        status: "keldi",
        quittedTime: null,
      });

      await dayDoc.save();

      return res.json({
        success: true,
        message: "Keldi yozildi",
      });
    }

    // ==============================
    // 4️⃣ KETDI
    // ==============================
    if (status === "leave") {
      if (!existingEntry || !existingEntry.time) {
        return res.status(400).json({
          success: false,
          message: "Avval kelish belgilanmagan",
        });
      }

      if (existingEntry.quittedTime) {
        return res.status(409).json({
          success: false,
          message: "Ketish allaqachon yozilgan",
        });
      }

      const arrivalMoment = moment.tz(
        `${dateKey} ${existingEntry.time}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Tashkent",
      );

      const diffInMinutes = nowMoment.diff(arrivalMoment, "minutes");

      // 🔥 5 minut shart
      if (diffInMinutes < 5) {
        return res.status(400).json({
          success: false,
          message: "Ketish uchun kamida 5 minut o'tishi kerak",
        });
      }

      existingEntry.quittedTime = nowMoment.format("HH:mm:ss");
      await dayDoc.save();

      return res.json({
        success: true,
        message: "Ketish vaqti yozildi",
      });
    }

    // ==============================
    // 5️⃣ KELMADI
    // ==============================
    if (status === "kelmadi") {
      if (existingEntry) {
        return res.status(409).json({
          success: false,
          message: "Bugun allaqachon belgilangan",
        });
      }

      dayDoc.body.push({
        teacher_id: resolvedTeacherId,
        employeeNo: teacher.employeeNo,
        time: null,
        status: "kelmadi",
        quittedTime: null,
      });

      await dayDoc.save();

      return res.json({
        success: true,
        message: "Kelmadi yozildi",
      });
    }

    return res.status(400).json({ message: "Noto'g'ri status" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

exports.getTeacherDavomat = async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.user.schoolId);
    const davomats = await TeacherDavomat.find({ schoolId })
      .populate("body.teacher_id", "firstName lastName employeeNo")
      .sort({ date: -1 });
    res.json(davomats);
  } catch (err) {
    console.error("Davomat olishda xato:", err);
    res.status(500).json({ message: "Xatolik yuz berdi", error: err.message });
  }
};
