const Quarter = require("../models/quarterModel");
const moment = require("moment");

exports.setSchoolQuarters = async (req, res) => {
  try {
    const { schoolId, quarters } = req.body;

    if (!schoolId || !Array.isArray(quarters) || quarters.length !== 4) {
      return res.status(400).json({
        message: "schoolId va 4 ta chorak majburiy",
      });
    }

    // 1️⃣ eski choraklarni o‘chiramiz
    await Quarter.deleteMany({ schoolId });

    // 2️⃣ validatsiya + saqlash
    const prepared = quarters.map((q, idx) => {
      // agar number berilmagan bo‘lsa, index asosida beramiz
      const number = q.number || idx + 1;

      if (
        !number ||
        !q.startDate ||
        !q.endDate ||
        !moment(q.startDate, "YYYY-MM-DD", true).isValid() ||
        !moment(q.endDate, "YYYY-MM-DD", true).isValid() ||
        !moment(q.startDate).isBefore(moment(q.endDate))
      ) {
        throw new Error(`Chorak ${number} sanalari noto‘g‘ri`);
      }

      return {
        number,
        startDate: q.startDate,
        endDate: q.endDate,
        schoolId,
      };
    });

    const saved = await Quarter.insertMany(prepared);

    res.status(201).json({
      success: true,
      message: "Choraklar muvaffaqiyatli saqlandi",
      data: saved,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Chorak saqlashda xato",
      error: err.message,
    });
  }
};

exports.getSchoolQuarters = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const quarters = await Quarter.find({ schoolId })
      .sort({ number: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: quarters,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Choraklarni olishda xato",
      error: err.message,
    });
  }
};
