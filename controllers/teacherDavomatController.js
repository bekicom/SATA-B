const TeacherDavomat = require("../models/teacherDavomat");
const Teacher = require("../models/teacherModel");
const moment = require("moment-timezone");
const mongoose = require("mongoose");

exports.addTeacherDavomat = async (req, res) => {
  try {
    const {
      teacherId,
      employeeNo,
      davomatDate,
      scanDateTime,
      time,
      arrivedTime,
      arrivalTime,
      quittedTime,
      leaveTime,
    } = req.body;
    let { status } = req.body;

    const schoolId = new mongoose.Types.ObjectId(req.user.schoolId);

    // status ni normallashtiramiz
    status = String(status || "")
      .toLowerCase()
      .trim();
    if (status === "true") status = "keldi";
    if (status === "false") status = "kelmadi";
    if (status === "leave") status = "ketdi";

    // 1) O'qituvchini topish
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

    // 2) Sana
    const scanMoment =
      scanDateTime && moment(scanDateTime).isValid()
        ? moment(scanDateTime).tz("Asia/Tashkent")
        : null;

    const baseDate = davomatDate
      ? moment.tz(davomatDate, "YYYY-MM-DD", "Asia/Tashkent")
      : scanMoment || moment().tz("Asia/Tashkent");

    const dateKey = baseDate.format("YYYY-MM-DD");

    const parseTimeForDate = (rawValue) => {
      if (!rawValue) return null;

      const parsed = moment.tz(
        `${dateKey} ${String(rawValue).trim()}`,
        ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"],
        "Asia/Tashkent",
      );

      return parsed.isValid() ? parsed : null;
    };

    const resolveEventMoment = (preferredValues = []) => {
      for (const value of preferredValues) {
        const parsed = parseTimeForDate(value);
        if (parsed) return parsed;
      }

      if (scanMoment) return scanMoment.clone();

      return moment().tz("Asia/Tashkent");
    };

    let dayDoc = await TeacherDavomat.findOne({ schoolId, dateKey });

    if (!dayDoc) {
      dayDoc = await TeacherDavomat.create({
        schoolId,
        date: baseDate.clone().startOf("day").toDate(),
        dateKey,
        body: [],
      });
    }

    const existingEntry = dayDoc.body.find(
      (e) => String(e.teacher_id) === String(resolvedTeacherId),
    );

    const arrivalMoment = resolveEventMoment([arrivedTime, arrivalTime, time]);
    const leaveMoment = resolveEventMoment([quittedTime, leaveTime, time]);

    // 3) KELDI (1-scan), agar bor bo'lsa va quittedTime yo'q bo'lsa 2-scan => KETDI
    if (status === "keldi") {
      if (!existingEntry) {
        dayDoc.body.push({
          teacher_id: resolvedTeacherId,
          employeeNo: teacher.employeeNo,
          time: arrivalMoment.format("HH:mm:ss"),
          status: "keldi",
          quittedTime: null,
        });

        await dayDoc.save();
        return res.json({ success: true, message: "Keldi yozildi" });
      }

      // 2-scan => ketdi
      if (existingEntry.time && !existingEntry.quittedTime) {
        const arrivalMoment = moment.tz(
          `${dateKey} ${existingEntry.time}`,
          "YYYY-MM-DD HH:mm:ss",
          "Asia/Tashkent",
        );

        const diffInMinutes = leaveMoment.diff(arrivalMoment, "minutes");
        if (diffInMinutes < 5) {
          return res.status(400).json({
            success: false,
            message: "Ketish uchun kamida 5 minut o'tishi kerak",
          });
        }

        existingEntry.quittedTime = leaveMoment.format("HH:mm:ss");
        existingEntry.status = "ketdi";

        await dayDoc.save();
        return res.json({ success: true, message: "Ketish vaqti yozildi" });
      }

      return res.status(409).json({
        success: false,
        message: "Bugun allaqachon belgilangan",
      });
    }

    // 4) KETDI (alohida endpoint chaqirilsa)
    if (status === "ketdi") {
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

      const diffInMinutes = leaveMoment.diff(arrivalMoment, "minutes");
      if (diffInMinutes < 5) {
        return res.status(400).json({
          success: false,
          message: "Ketish uchun kamida 5 minut o'tishi kerak",
        });
      }

      existingEntry.quittedTime = leaveMoment.format("HH:mm:ss");
      existingEntry.status = "ketdi";

      await dayDoc.save();
      return res.json({ success: true, message: "Ketish vaqti yozildi" });
    }

    // 5) KELMADI
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
        quittedTime: null,
        status: "kelmadi",
      });

      await dayDoc.save();
      return res.json({ success: true, message: "Kelmadi yozildi" });
    }

    return res.status(400).json({ message: "Noto'g'ri status" });
  } catch (err) {
    console.error("addTeacherDavomat error:", err);
    return res
      .status(500)
      .json({ message: "Server xatosi", error: err.message });
  }
};

exports.getTeacherDavomat = async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.user.schoolId);

    const davomats = await TeacherDavomat.find({ schoolId })
      .populate("body.teacher_id", "firstName lastName employeeNo")
      .sort({ date: -1 });

    return res.json(davomats);
  } catch (err) {
    console.error("Davomat olishda xato:", err);
    return res
      .status(500)
      .json({ message: "Xatolik yuz berdi", error: err.message });
  }
};
