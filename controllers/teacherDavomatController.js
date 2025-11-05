const TeacherDavomat = require("../models/teacherDavomat");
const Teacher = require("../models/teacherModel");
const Salary = require("../models/salaryModel"); // ✅ qo‘shildi
const moment = require("moment-timezone");
const mongoose = require("mongoose");

// HH:mm:ss -> Date (bugungi sana bilan birga) ga aylantirish yordamchisi
function makeDateOn(baseMoment, hhmmss) {
  const [H, M, S] = hhmmss.split(":").map(Number);
  return baseMoment.clone().hour(H).minute(M).second(S).millisecond(0);
}

// 📌 Davomat qo‘shish (kirish/chiqish) — 1 daqiqada 2 marta yozilmasin, chiqish 5 daqiqadan keyin
exports.addTeacherDavomat = async (req, res) => {
  try {
    const { employeeNo, davomatDate, status } = req.body;
    const schoolId = new mongoose.Types.ObjectId(req.user.schoolId);

    // ⏰ Hozirgi vaqt (Toshkent bo‘yicha)
    const now = moment().tz("Asia/Tashkent");
    const currentTime = now.format("HH:mm:ss");

    // 1) O‘qituvchini employeeNo orqali topamiz
    const teacher = await Teacher.findOne({ schoolId, employeeNo });
    if (!teacher) {
      return res.status(404).json({
        message: `employeeNo=${employeeNo} bo‘yicha o‘qituvchi topilmadi`,
      });
    }
    const teacherId = teacher._id;

    // 2) Sana (kun) kaliti
    const baseDate = davomatDate
      ? moment.tz(
          davomatDate,
          ["YYYY-MM-DD", "DD-MM-YYYY", moment.ISO_8601],
          "Asia/Tashkent"
        )
      : now;

    const dateKey = baseDate.format("YYYY-MM-DD");
    const dateValue = baseDate.clone().startOf("day").toDate();

    // 3) Kun uchun hujjat yaratish (agar bo‘lmasa)
    await TeacherDavomat.findOneAndUpdate(
      { schoolId, dateKey },
      { $setOnInsert: { date: dateValue, schoolId, dateKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4) Shu kunda o‘qituvchining barcha yozuvlarini olaylik (tartib bilan)
    const dayDoc = await TeacherDavomat.findOne({ schoolId, dateKey });
    const entries = (dayDoc?.body || []).filter(
      (e) => String(e.teacher_id) === String(teacherId)
    );

    // ⛔ 1 daqiqalik anti-double
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      const lastActionStr = last.quittedTime || last.time;
      const lastAction = makeDateOn(baseDate, lastActionStr);
      const diffSeconds = now.diff(lastAction, "seconds");
      if (diffSeconds < 60) {
        return res.status(429).json({
          success: false,
          message:
            "Davomat 1 daqiqa ichida qayta olinmaydi. Birozdan so‘ng urining.",
          waitSeconds: 60 - diffSeconds,
        });
      }
    }

    // 5) Agar ochiq yozuv bo‘lsa — chiqish
    const openEntry = (entries || []).find((e) => !e.quittedTime);

    if (openEntry) {
      const enteredAt = makeDateOn(baseDate, openEntry.time);
      const passedMinutes = now.diff(enteredAt, "minutes");
      if (passedMinutes < 5) {
        return res.status(400).json({
          success: false,
          message: "Chiqish uchun kamida 5 daqiqa o‘tishi kerak.",
          minutesLeft: 5 - passedMinutes,
        });
      }

      const updatedExit = await TeacherDavomat.findOneAndUpdate(
        {
          schoolId,
          dateKey,
          body: {
            $elemMatch: {
              teacher_id: teacherId,
              quittedTime: { $exists: false },
            },
          },
        },
        {
          $set: {
            "body.$.quittedTime": currentTime,
            "body.$.status": "ketdi",
          },
        },
        { new: true }
      );

      if (updatedExit) {
        return res.status(200).json({
          success: true,
          message: "Chiqish (ketdi) vaqti yozildi",
          data: updatedExit,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Chiqishni yozishda kutilmagan xato",
      });
    }

    // 6) Aks holda — yangi kirish (keldi) yozamiz
    const pushResult = await TeacherDavomat.findOneAndUpdate(
      { schoolId, dateKey },
      {
        $push: {
          body: {
            teacher_id: teacherId,
            employeeNo,
            time: currentTime,
            status: status || "keldi",
          },
        },
      },
      { new: true }
    );

    if (pushResult) {
      // ✅ Oylikni shu yerda hisoblaymiz
      const weekday = baseDate.format("dddd").toLowerCase(); // monday, tuesday...
      const kunMap = {
        monday: "dushanba",
        tuesday: "seshanba",
        wednesday: "chorshanba",
        thursday: "payshanba",
        friday: "juma",
        saturday: "shanba",
        sunday: "yakshanba",
      };

      const kun = kunMap[weekday] || null;
      if (kun === "yakshanba") {
        return res.status(200).json({
          success: true,
          message: "Yakshanba dam olish kuni — oylikka qo‘shilmadi.",
        });
      }
      const hours = (kun && teacher.schedule[kun]) || 0;
      const amount = hours * teacher.price;

      if (hours > 0) {
        const paymentMonth = baseDate.format("YYYY-MM");

        // shu kun uchun allaqachon yozilmaganini tekshir
        const exists = await Salary.findOne({
          teacherId,
          schoolId,
          paymentMonth,
          "logs.date": baseDate.clone().startOf("day").toDate(),
        });

        if (!exists) {
          await Salary.findOneAndUpdate(
            { teacherId, schoolId, paymentMonth },
            {
              $inc: { salaryAmount: amount },
              $setOnInsert: { teacher_fullname: teacher.fullName },
              $push: {
                logs: {
                  date: baseDate.clone().startOf("day").toDate(),
                  hours,
                  amount,
                  reason: "davomat",
                },
              },
            },
            { upsert: true, new: true }
          );
        }
      }

      return res.status(201).json({
        success: true,
        message: "Kirish (keldi) vaqti yozildi + oylikka qo‘shildi",
        data: pushResult,
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Davomatni yozib bo‘lmadi" });
  } catch (err) {
    console.error("Davomat yozishda xato:", err);
    res.status(500).json({ message: "Xatolik yuz berdi", error: err.message });
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
