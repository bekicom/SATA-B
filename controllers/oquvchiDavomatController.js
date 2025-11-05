const moment = require("moment");
const OquvchiDavomati = require("../models/oquvchiDavomati");
const Student = require("../models/studentModel");
const Group = require("../models/groupModel");
const TeacherAttendance = require("../models/teacherAttendanceModel");
exports.createDavomat = async (req, res) => {
  try {
    if (!req.body.date) {
      return res.status(400).json({ message: "Date maydoni talab etiladi" });
    }
    console.log(req.body);

    if (!req.body.schoolId) {
      return res
        .status(400)
        .json({ message: "SchoolId maydoni talab etiladi" });
    }

    const existDavomat = await OquvchiDavomati.findOne({
      date: req.body.date,
      schoolId: req.body.schoolId,
    });
    if (existDavomat) {
      if (Array.isArray(req.body.body)) {
        existDavomat.body = [...existDavomat.body, ...req.body.body];
      } else {
        existDavomat.body = [...existDavomat.body, req.body.body];
      }
      const updatedDavomat = await existDavomat.save();
      if (!updatedDavomat) {
        return res
          .status(400)
          .json({ message: "O'quvchi davomati yangilanishida xato yuz berdi" });
      }
      return res.status(200).json(updatedDavomat);
    }

    const davomat = new OquvchiDavomati({
      date: req.body.date,
      body: Array.isArray(req.body.body) ? req.body.body : [req.body.body],
      schoolId: req.body.schoolId,
    });
    const saveDavomat = await davomat.save();
    if (!saveDavomat) {
      return res
        .status(400)
        .json({ message: "O'quvchi davomati qo'shishda xato yuz berdi" });
    }
    res.status(201).json(saveDavomat);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Serverda xatolik yuz berdi", error: error.message });
  }
};

exports.createTeacherAbsent = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { teacher_id, month, summ, lessonCount, week } = req.body;

    if (!teacher_id || !month || !schoolId || !summ) {
      return res.status(404).json({ message: "Maydonlar to'ldirilmagan" });
    }

    const newAbsent = new TeacherAttendance({
      teacher_id,
      month,
      schoolId,
      summ,
      lessonCount,
      week,
    });
    const savedAbsent = await newAbsent.save();
    if (!savedAbsent) {
      return res
        .status(400)
        .json({ message: "Davomat qo'shishda xatolik yuz berdi" });
    }
    res
      .status(201)
      .json({ message: "Davomat muvaffaqiyatli qo'shildi", savedAbsent });
  } catch (error) {
    res.status(500).json({ message: "Xatolik" });
    console.log(error);
  }
};

exports.getTeacherAbsent = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { month } = req.query;
    if (!month || !schoolId) {
      return res.status(404).json({ message: "Maydonlar to'ldirilmagan" });
    }
    const absent = await TeacherAttendance.find({ month, schoolId });
    if (!absent) {
      return res.status(404).json({ message: "Davomat topilmadi" });
    }
    res.status(200).json(absent);
  } catch (error) {
    res.status(500).json({ message: "Xatolik" });
    console.log(error);
  }
};
exports.createAttendanceFromQr = async (req, res) => {
  try {
    const { studentId, schoolId } = req.body;

    if (!studentId || !schoolId) {
      return res.status(400).json({
        message:
          "Barcode noto'g'ri formatda yoki talab etiladigan qiymatlar yo'q",
      });
    }

    const date = moment().format("DD-MM-YYYY");

    // Agar studentId oddiy raqam bo'lsa, EmployeeNo orqali qidirish
    const student = await Student.findOne({ employeeNo: studentId });
    if (!student || student.schoolId.toString() !== schoolId) {
      return res
        .status(404)
        .json({ message: "Talaba topilmadi yoki maktab ID mos emas" });
    }

    const studentGroup = await Group.findById(student.groupId);

    let existDavomat = await OquvchiDavomati.findOne({ date, schoolId });

    if (!existDavomat) {
      existDavomat = new OquvchiDavomati({
        date,
        schoolId,
        body: [
          {
            group_id: student.groupId,
            students: [{ student_id: student._id, status: true }],
          },
        ],
      });

      await existDavomat.save();
      return res.status(200).json({
        message: "Davomat saqlandi",
        data: {
          student: student.lastName + " " + student.firstName,
          group: studentGroup.name,
        },
      });
    }

    let groupFound = existDavomat.body.find(
      (group) => group.group_id.toString() === student.groupId.toString()
    );

    if (!groupFound) {
      groupFound = {
        group_id: student.groupId,
        students: [{ student_id: student._id, status: true }],
      };
      existDavomat.body.push(groupFound);
    } else {
      const studentExists = groupFound.students.some(
        (s) => s.student_id.toString() === student._id.toString()
      );

      if (!studentExists) {
        groupFound.students.push({ student_id: student._id, status: true });
      }
    }

    existDavomat.markModified("body");
    const updatedDavomat = await existDavomat.save();

    return res.status(200).json({
      message: "Davomat saqlandi",
      data: {
        student: student.lastName + " " + student.firstName,
        group: studentGroup.name,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Serverda xatolik yuz berdi", error: error.message });
  }
};

exports.getDavomat = async (req, res) => {
  try {
    const { group: groupId, date } = req.query;
    let query = { schoolId: req.user.schoolId };
    if (date) {
      query.date = date;
    }
    if (groupId) {
      query["body.group_id"] = groupId;
    }

    const filteredDavomat = await OquvchiDavomati.find(query);
    if (!filteredDavomat.length) {
      return res.json([]);
    }

    if (groupId) {
      const result = filteredDavomat
        .map((item) => {
          const group = item.body.find(
            (group) => group.group_id.toString() === groupId.toString()
          );
          if (group) {
            return {
              group_id: groupId,
              body: [
                {
                  date: item.date,
                  students: group.students,
                },
              ],
            };
          }
          return null;
        })
        .filter((item) => item !== null);
      return res.json(result);
    }

    const result = filteredDavomat.map((item) => ({
      _id: item._id,
      date: item.date,
      body: item.body,
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Serverda xatolik yuz berdi", error: error.message });
  }
};

exports.createTeacherAttendanceFromCamera = async (req, res) => {
  try {
    const { serialNo, schoolId } = req.body;

    if (!serialNo || !schoolId) {
      return res.status(400).json({
        message: "SerialNo yoki schoolId yuborilmadi",
      });
    }

    const teacher = await require("../models/teacherModel").findOne({
      serialNo,
      schoolId,
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Ushbu serial raqamga mos o'qituvchi topilmadi",
      });
    }

    const date = moment().format("DD-MM-YYYY");
    const month = moment().format("MM-YYYY");
    const week = moment().format("dd"); // Dushanba, Seshanba va h.k.
    const lessonCount = 1;
    const summ = teacher.price; // Har bir dars uchun narx

    const newAttendance = new TeacherAttendance({
      teacher_id: teacher._id,
      schoolId,
      month,
      lessonCount,
      summ,
      week,
    });

    await newAttendance.save();

    return res.status(201).json({
      message: `✅ ${teacher.firstName} ${teacher.lastName} davomatga yozildi`,
      data: {
        teacher: `${teacher.firstName} ${teacher.lastName}`,
        date,
        price: summ,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Serverda xatolik yuz berdi",
      error: error.message,
    });
  }
};

function makeDateOn(baseMoment, hhmmss) {
  const [H, M, S] = hhmmss.split(":").map(Number);
  return baseMoment.clone().hour(H).minute(M).second(S).millisecond(0);
}

exports.addStudentDavomat = async (req, res) => {
  try {
    const { employeeNo } = req.body;
    const schoolId = req.user.schoolId; // yoki body’dan

    if (!employeeNo || !schoolId) {
      return res
        .status(400)
        .json({ message: "employeeNo va schoolId talab qilinadi" });
    }

    // 1) Talabani topish
    const student = await Student.findOne({ employeeNo, schoolId });
    if (!student) {
      return res.status(404).json({ message: "Talaba topilmadi" });
    }

    // 2) Vaqt va kun
    const now = moment().tz("Asia/Tashkent");
    const currentTime = now.format("HH:mm:ss");
    const dateKey = now.format("YYYY-MM-DD");
    const dateValue = now.clone().startOf("day").toDate();

    // 3) Kun hujjatini yaratish (agar bo‘lmasa)
    await OquvchiDavomati.findOneAndUpdate(
      { schoolId, dateKey },
      { $setOnInsert: { date: dateValue, schoolId, dateKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4) Shu kunda shu talabaning yozuvlarini olish
    const dayDoc = await OquvchiDavomati.findOne({ schoolId, dateKey });
    const entries = (dayDoc?.body || []).filter(
      (e) => String(e.student_id) === String(student._id)
    );

    // 🔒 4.1) Anti-double: 1 daqiqa ichida qayta skaner bo‘lmasin
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      const lastActionStr = last.quittedTime || last.time; // oxirgi harakat
      const lastAction = makeDateOn(now, lastActionStr);
      const diffSeconds = now.diff(lastAction, "seconds");
      if (diffSeconds < 60) {
        return res.status(429).json({
          success: false,
          message:
            "Davomat 1 daqiqa ichida qayta olinmaydi. Birozdan so‘ng urinib ko‘ring.",
          waitSeconds: 60 - diffSeconds,
        });
      }
    }

    // 5) Agar ochiq (ketish yozilmagan) yozuv bo‘lsa — chiqishni yozishga urinyapti
    const openEntry = entries.find((e) => !e.quittedTime);

    if (openEntry) {
      // ⏳ Chiqish faqat kirishdan 5 daqiqa o‘tgach
      const enteredAt = makeDateOn(now, openEntry.time);
      const passedMinutes = now.diff(enteredAt, "minutes");
      if (passedMinutes < 5) {
        return res.status(400).json({
          success: false,
          message:
            "Chiqish uchun kamida 5 daqiqa o‘tishi kerak. Keyinroq yana urinib ko‘ring.",
          minutesLeft: 5 - passedMinutes,
        });
      }

      // ✅ Chiqishni yozamiz
      const updatedExit = await OquvchiDavomati.findOneAndUpdate(
        {
          schoolId,
          dateKey,
          body: {
            $elemMatch: {
              student_id: student._id,
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

      if (updatedExit) return res.status(200).json(updatedExit);

      // Ehtiyot chorasi: agar yuqorida yangilanmasa
      return res
        .status(500)
        .json({ success: false, message: "Chiqishni yozib bo‘lmadi" });
    }

    // 6) Aks holda — yangi kirish (keldi) yozuvi
    const pushResult = await OquvchiDavomati.findOneAndUpdate(
      {
        schoolId,
        dateKey,
      },
      {
        $push: {
          body: {
            student_id: student._id,
            employeeNo: student.employeeNo,
            time: currentTime,
            status: "keldi",
          },
        },
      },
      { new: true }
    );

    if (pushResult) return res.status(201).json(pushResult);

    // Fallback
    return res
      .status(500)
      .json({ success: false, message: "Davomatni yozib bo‘lmadi" });
  } catch (err) {
    console.error("❌ Student davomat xato:", err);
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};


// 📌 Student davomatini olish
exports.getStudentDavomat = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const davomats = await OquvchiDavomati.find({ schoolId })
      .populate("body.student_id", "firstName lastName employeeNo")
      .sort({ date: -1 });

    res.json(davomats);
  } catch (err) {
    res.status(500).json({ message: "Server xatosi", error: err.message });
  }
};

