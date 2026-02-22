const harajatModel = require("../models/harajatModel");
const schoolModel = require("../models/schoolModel");

// 🧾 Harajat yaratish
exports.createHarajat = async (req, res) => {
  try {
    const { name, comment, summ, paymentType } = req.body;
    const { schoolId } = req.user;

    if (!name || !summ) {
      return res
        .status(400)
        .json({ message: "Nomi va summa majburiy maydonlar!" });
    }

    // 🔸 Yangi harajat yozuvini yaratamiz
    const newHarajat = new harajatModel({
      name,
      comment,
      summ,
      paymentType,
      schoolId,
    });

    // 🔸 Agar to‘lov turi 'naqd' bo‘lsa — maktab budjetidan ayiramiz
    if (paymentType === "naqd") {
      await schoolModel.findByIdAndUpdate(schoolId, {
        $inc: { budget: -summ },
      });
    }

    const savedHarajat = await newHarajat.save();

    res.status(201).json({
      message: "Harajat muvaffaqiyatli saqlandi",
      data: savedHarajat,
    });
  } catch (err) {
    console.error("createHarajat xatolik:", err);
    res.status(500).json({
      message: "Serverda xatolik yuz berdi",
      error: err.message,
    });
  }
};

// 📋 Barcha harajatlarni olish
exports.getHarajat = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const harajatlar = await harajatModel
      .find({ schoolId })
      .sort({ createdAt: -1 });
    res.status(200).json(harajatlar);
  } catch (err) {
    console.error("getHarajat xatolik:", err);
    res.status(500).json({
      message: "Serverda xatolik yuz berdi",
      error: err.message,
    });
  }
};

// 📊 Oylik harajatlar hisobotini olish
exports.getMonthlyExpenseSummary = async (req, res) => {
  try {
    const { schoolId } = req.user;

    const months = [
      "01-2025",
      "02-2025",
      "03-2025",
      "04-2025",
      "05-2025",
      "06-2025",
      "07-2025",
      "08-2025",
      "09-2025",
      "10-2025",
      "11-2025",
      "12-2025",
    ];

    // 🔹 Har bir oy bo‘yicha jami xarajatlarni yig‘amiz
    const result = await harajatModel.aggregate([
      {
        $match: { schoolId },
      },
      {
        $project: {
          summ: 1,
          paymentType: 1,
          payment_month: {
            $dateToString: { format: "%m-%Y", date: "$createdAt" },
          },
        },
      },
      {
        $group: {
          _id: { month: "$payment_month", type: "$paymentType" },
          totalExpense: { $sum: "$summ" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    // 🔹 Har bir oy uchun naqd, plastik, bankshot summalarini ajratamiz
    const monthlySummary = months.map((month) => {
      const monthData = result.filter((r) => r._id.month === month);
      const naqd =
        monthData.find((r) => r._id.type === "naqd")?.totalExpense || 0;
      const plastik =
        monthData.find((r) => r._id.type === "plastik")?.totalExpense || 0;
      const bankshot =
        monthData.find((r) => r._id.type === "bankshot")?.totalExpense || 0;

      return {
        date: month,
        naqd,
        plastik,
        bankshot,
        jami: naqd + plastik + bankshot,
      };
    });

    res.status(200).json(monthlySummary);
  } catch (error) {
    console.error("getMonthlyExpenseSummary xatolik:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// ✏️ Harajatni tahrirlash
exports.updateHarajat = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, comment, summ, paymentType } = req.body;
    const { schoolId } = req.user;

    const harajat = await harajatModel.findOne({ _id: id, schoolId });
    if (!harajat) {
      return res.status(404).json({ message: "Harajat topilmadi" });
    }

    // Eski summani budjetga qaytaramiz, yangisini ayiramiz
    if (harajat.paymentType === "naqd" || paymentType === "naqd") {
      let budgetChange = 0;

      if (harajat.paymentType === "naqd") {
        budgetChange += harajat.summ; // eskisini qaytaramiz
      }
      if (paymentType === "naqd") {
        budgetChange -= summ; // yangisini ayiramiz
      }

      await schoolModel.findByIdAndUpdate(schoolId, {
        $inc: { budget: budgetChange },
      });
    }

    const updated = await harajatModel.findByIdAndUpdate(
      id,
      { name, comment, summ, paymentType },
      { new: true }
    );

    res.status(200).json({
      message: "Harajat muvaffaqiyatli yangilandi",
      data: updated,
    });
  } catch (err) {
    console.error("updateHarajat xatolik:", err);
    res.status(500).json({ message: "Serverda xatolik yuz berdi", error: err.message });
  }
};