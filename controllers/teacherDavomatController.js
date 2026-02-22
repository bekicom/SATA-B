const TeacherDavomat = require("../models/teacherDavomat");
const Teacher = require("../models/teacherModel");
const Salary = require("../models/salaryModel");
const moment = require("moment-timezone");
const mongoose = require("mongoose");

exports.addTeacherDavomat = async (req, res) => {
  try {
    const { teacherId, employeeNo, davomatDate, status, summ } = req.body;
    const schoolId = new mongoose.Types.ObjectId(req.user.schoolId);

    // ✅ teacherId yoki employeeNo bilan o'qituvchini topamiz
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

    // Sana kaliti
    const baseDate = davomatDate
      ? moment.tz(davomatDate, ["YYYY-MM-DD", "DD-MM-YYYY"], "Asia/Tashkent")
      : moment().tz("Asia/Tashkent");

    const dateKey = baseDate.format("YYYY-MM-DD");
    const paymentMonth = baseDate.format("YYYY-MM");

    // ✅ status ni BARCHA formatda to'g'ri parse qilamiz
    // keldi: true, "true", "keldi"
    // kelmadi: false, "false", "kelmadi"
    const davomatStatus =
      status === true || status === "true" || status === "keldi";

    // Shu kunda bu o'qituvchi davomati allaqachon yozilganmi?
    const dayDoc = await TeacherDavomat.findOne({ schoolId, dateKey });
    const alreadyExists = (dayDoc?.body || []).some(
      (e) => String(e.teacher_id) === String(resolvedTeacherId),
    );

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        message: "Bu o'qituvchining davomati bugun allaqachon olingan",
      });
    }

    // Kun hujjatini yaratish (agar bo'lmasa)
    await TeacherDavomat.findOneAndUpdate(
      { schoolId, dateKey },
      {
        $setOnInsert: {
          date: baseDate.clone().startOf("day").toDate(),
          schoolId,
          dateKey,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // ✅ Davomatni yozamiz — status ANIQ saqlanadi
    await TeacherDavomat.findOneAndUpdate(
      { schoolId, dateKey },
      {
        $push: {
          body: {
            teacher_id: resolvedTeacherId,
            employeeNo: teacher.employeeNo,
            time: davomatStatus
              ? moment().tz("Asia/Tashkent").format("HH:mm:ss")
              : null, // ✅ kelmadi bo'lsa vaqt saqlanmaydi
            status: davomatStatus ? "keldi" : "kelmadi",
            summ: davomatStatus ? summ || 0 : 0,
          },
        },
      },
      { new: true },
    );

    // ✅ Faqat "keldi" bo'lsa oylikka qo'shamiz
    if (davomatStatus) {
      const weekday = baseDate.format("dddd").toLowerCase();
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
        return res.status(201).json({
          success: true,
          message: "Yakshanba dam olish kuni — oylikka qo'shilmadi",
        });
      }

      const hours = (kun && teacher.schedule?.[kun]) || 0;
      const amount = summ || hours * teacher.price || 0;

      if (amount > 0) {
        const exists = await Salary.findOne({
          teacherId: resolvedTeacherId,
          schoolId,
          paymentMonth,
          "logs.dateKey": dateKey,
        });

        if (!exists) {
          await Salary.findOneAndUpdate(
            { teacherId: resolvedTeacherId, schoolId, paymentMonth },
            {
              $inc: { salaryAmount: amount },
              $setOnInsert: {
                teacher_fullname: `${teacher.firstName} ${teacher.lastName}`,
              },
              $push: {
                logs: {
                  date: baseDate.clone().startOf("day").toDate(),
                  dateKey,
                  hours,
                  amount,
                  reason: "davomat",
                },
              },
            },
            { upsert: true, new: true },
          );
        }
      }

      return res.status(201).json({
        success: true,
        message: "Keldi — davomat va oylik yozildi",
      });
    }

    // ✅ "Kelmadi" — faqat davomat yozildi, oylikka qo'shilmadi
    return res.status(201).json({
      success: true,
      message: "Kelmadi — davomat yozildi, oylikka qo'shilmadi",
    });
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
