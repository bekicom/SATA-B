const studentModel = require("../models/studentModel");
const schoolModel = require("../models/schoolModel");
const groupModel = require("../models/groupModel");
const paymentModel = require("../models/paymentModel");
const moment = require("moment");

exports.createPayment = async (req, res) => {
  try {
    const date = moment().format("YYYY-MM-DD");
    const { user_id, payment_quantity, payment_month, payment_type } = req.body;
    const { schoolId } = req.user;

    const monthName = (month) => {
      const map = {
        "01": "Yanvar",
        "02": "Fevral",
        "03": "Mart",
        "04": "Aprel",
        "05": "May",
        "06": "Iyun",
        "07": "Iyul",
        "08": "Avgust",
        "09": "Sentabr",
        10: "Oktabr",
        11: "Noyabr",
        12: "Dekabr",
      };
      return map[month] || "Noma'lum oy";
    };

    // 🔹 1) Talabani olish
    const student = await studentModel.findById(user_id);
    if (!student) {
      return res.status(404).json({ message: "Talaba topilmadi" });
    }

    const monthlyFee = student?.monthlyFee;
    if (!monthlyFee) {
      return res.status(404).json({
        message: "Talabaning oylik to'lovi aniqlanmagan",
      });
    }

    const userGroup = await groupModel.findById(student.groupId);
    if (!userGroup) {
      return res.status(404).json({ message: "Guruh topilmadi" });
    }

    // 🔹 2) Qabul oyidan oldin to‘lov bloklash
    const studentAdmissionMonth = moment(student.admissionDate).format(
      "MM-YYYY"
    );
    const selectedMonth = moment(payment_month, "MM-YYYY").format("MM-YYYY");

    if (
      moment(selectedMonth, "MM-YYYY").isBefore(
        moment(studentAdmissionMonth, "MM-YYYY")
      )
    ) {
      return res.status(400).json({
        message: `Talaba ${monthName(
          studentAdmissionMonth.slice(0, 2)
        )} oyidan boshlab o‘qishga qabul qilingan. Oldingi oylar uchun to‘lov qilinmaydi.`,
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 🔥 3) BU YERGA payForMonth-dagi LIMIT TEKSHIRUVINI QO‘SHDIM
    //     → OY BO‘YICHA KO‘P TO‘LOV QABUL QILMASLIK
    // ────────────────────────────────────────────────────────────────

    const existingPayments = await paymentModel.find({
      user_id,
      payment_month: selectedMonth,
    });

    let alreadyPaid = 0;
    existingPayments.forEach((p) => (alreadyPaid += p.payment_quantity));

    // Agar student oyligi = 500 000 bo‘lsa
    // oldin 300 000 to‘lagan → endi 250 000 to‘lashga urinayotgan bo‘lsa xato
    if (alreadyPaid + payment_quantity > monthlyFee) {
      return res.status(400).json({
        message:
          `${monthName(
            selectedMonth.slice(0, 2)
          )} oyi uchun oylik summadan ortiq to'lov qabul qilinmaydi. ` +
          `Limit: ${monthlyFee}. Siz oldin ${alreadyPaid} so‘m to‘lagansiz.`,
        limitExceeded: true,
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 🔚 LIMIT CHECK tugadi — endi to‘lovni qabul qilsa bo‘ladi
    // ────────────────────────────────────────────────────────────────

    // 🔹 4) Oldingi oydagi qarzdorlikni tekshirish
    const previousMonth = moment(payment_month, "MM-YYYY")
      .subtract(1, "month")
      .format("MM-YYYY");

    const isPrevAfterAdmission = moment(previousMonth, "MM-YYYY").isSameOrAfter(
      moment(studentAdmissionMonth, "MM-YYYY")
    );

    if (isPrevAfterAdmission && previousMonth !== selectedMonth) {
      const prevPays = await paymentModel.find({
        user_id: student._id,
        payment_month: previousMonth,
      });

      let prevTotal = 0;
      prevPays.forEach((p) => (prevTotal += p.payment_quantity));

      if (prevTotal < monthlyFee) {
        return res.status(400).json({
          message: `${monthName(
            previousMonth.slice(0, 2)
          )} oyi uchun qarzdorlik mavjud!`,
          debt_sum: monthlyFee - prevTotal,
        });
      }
    }

    // 🔹 5) Maktab byudjetiga qo‘shish
    await schoolModel.findByIdAndUpdate(schoolId, {
      $inc: { budget: payment_quantity },
    });

    // 🔹 6) To‘lovni yozish
    const paymentData = {
      user_id: student._id,
      user_fullname: student.firstName + " " + student.lastName,
      user_group: userGroup._id,
      payment_date: date,
      payment_quantity,
      payment_month,
      schoolId: student.schoolId,
      payment_type,
    };

    const newPayment = new paymentModel(paymentData);
    await newPayment.save();

    student.payments.push(newPayment._id);
    await student.save();

    return res.status(201).json({
      message: "To'lov muvaffaqiyatli amalga oshirildi",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Serverda xatolik yuz berdi",
      error: err.message,
    });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { schoolId } = req.user;

    const payments = await paymentModel.find({ schoolId });

    const school = await schoolModel.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    const mergedPayments = {};

    for (const payment of payments) {
      const student = await studentModel.findById(payment.user_id);

      if (!student) {
        continue;
      }

      const paymentKey = `${payment.user_id}-${payment.payment_month}`;

      if (!mergedPayments[paymentKey]) {
        mergedPayments[paymentKey] = {
          user_id: student._id,
          user_fullname: student.firstName + " " + student.lastName,
          user_group: student.groupId,
          payment_quantity: payment.payment_quantity,
          payment_month: payment.payment_month,
          schoolId: payment.schoolId,
          payment_type: payment.payment_type,
          createdAt: payment.createdAt,
          payment_types: [payment.payment_type],
          student_monthlyFee: student.monthlyFee,
        };
      } else {
        mergedPayments[paymentKey].payment_quantity += payment.payment_quantity;
        mergedPayments[paymentKey].createdAt =
          mergedPayments[paymentKey].createdAt > payment.createdAt
            ? mergedPayments[paymentKey].createdAt
            : payment.createdAt;
        mergedPayments[paymentKey].payment_types.push(payment.payment_type);
      }
    }

    const mergedPaymentsArray = Object.values(mergedPayments);

    mergedPaymentsArray.forEach((payment) => {
      const cashCount = payment.payment_types.filter(
        (type) => type === "cash"
      ).length;
      const cardCount = payment.payment_types.filter(
        (type) => type === "card"
      ).length;
      const bankCount = payment.payment_types.filter(
        (type) => type === "bankshot"
      ).length;

      const counts = { cash: cashCount, card: cardCount, bankshot: bankCount };
      const dominantType = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b
      );

      payment.payment_type = dominantType;
      delete payment.payment_types;
    });

    // 🔥 BU FILTERNI O'CHIRISH KERAK - u faqat to'liq to'langanlarni ko'rsatadi
    // const filteredPayments = [];
    // for (const payment of mergedPaymentsArray) {
    //   const studentPayments = await paymentModel.find({
    //     user_id: payment.user_id,
    //     payment_month: payment.payment_month,
    //   });
    //
    //   let totalPaid = 0;
    //   studentPayments.forEach((p) => (totalPaid += p.payment_quantity));
    //   if (totalPaid >= payment.student_monthlyFee) {
    //     filteredPayments.push(payment);
    //   }
    // }

    // 🔥 BARCHA TO'LOVLARNI QAYTARISH
    res.status(200).json(mergedPaymentsArray);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Server error occurred", error: err.message });
  }
};

exports.getDebts = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const students = await studentModel
      .find({ schoolId, isActive: true })
      .populate("groupId");

    if (!students || students.length === 0) {
      return res.status(404).json({ message: "Faol o'quvchilar topilmadi" });
    }

    const finalPayments = [];
    const currentDate = new Date();
    const endMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    await Promise.all(
      students.map(async (student) => {
        const {
          admissionDate,
          monthlyFee,
          _id: user_id,
          firstName,
          lastName,
          groupId,
        } = student;

        if (!admissionDate || !monthlyFee || !groupId) return;

        let paymentMonth = new Date(admissionDate);
        const payments = await paymentModel.find({ user_id });

        const consolidatedPayments = payments.reduce((acc, payment) => {
          const key = payment.payment_month;
          if (!acc[key]) {
            acc[key] = { ...payment, payment_quantity: 0 };
          }
          acc[key].payment_quantity += payment.payment_quantity;
          return acc;
        }, {});

        while (paymentMonth <= endMonth) {
          const paymentMonthStr = `${(
            "0" +
            (paymentMonth.getMonth() + 1)
          ).slice(-2)}-${paymentMonth.getFullYear()}`;

          const existingPayment = consolidatedPayments[paymentMonthStr];
          const paidAmount = existingPayment
            ? existingPayment.payment_quantity
            : 0;

          // 🔥 ASOSIY O'ZGARISH: Faqat qarzdor talabalarni qo'shish
          if (paidAmount < monthlyFee) {
            finalPayments.push({
              user_id: user_id,
              user_fullname: `${firstName} ${lastName}`,
              user_group: groupId?.name,
              user_groupId: groupId?._id,
              payment_quantity: paidAmount,
              payment_month: paymentMonthStr,
              schoolId: schoolId,
              payment_type: existingPayment
                ? existingPayment.payment_type
                : "unknown",
              createdAt: existingPayment
                ? existingPayment.createdAt
                : new Date(),
              student_monthlyFee: monthlyFee,
              admissionDate: admissionDate,
              // 🔥 QARZDORLIK MIQDORINI HAM QO'SHAMIZ
              debt_amount: monthlyFee - paidAmount,
              is_paid: paidAmount >= monthlyFee, // to'langanligini belgilash
            });
          }

          paymentMonth.setMonth(paymentMonth.getMonth() + 1);
        }
      })
    );

    res.status(200).json(finalPayments);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Server error occurred", error: err.message });
  }
};

exports.getPaymentLog = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const payments = await paymentModel.find({ schoolId });
    res.status(200).json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Xato", error: err.message });
  }
};

exports.getPaymentByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    const user = await studentModel.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "Talaba topilmadi" });
    }
    res.status(200).json(user.payments);
  } catch (err) {
    console.log(err);
  }
};

exports.checkDebtStatus = async (req, res) => {
  try {
    const { studentId, paymentMonth } = req.body;

    const month = moment(paymentMonth, "MM-YYYY").format("MM-YYYY");
    const previousMonth = moment(month, "MM-YYYY")
      .subtract(1, "month")
      .format("MM-YYYY");

    const student = await studentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Talaba topilmadi" });
    }

    if (!student.isActive) {
      return res.status(200).json({
        message: "",
        debt: false,
      });
    }

    const studentAdmissionDate = moment(student.admissionDate).format(
      "MM-YYYY"
    );

    // 🟢 Agar tanlangan oy qabul qilingan oydan oldingi oy bo'lsa
    if (
      moment(paymentMonth, "MM-YYYY").isBefore(
        moment(studentAdmissionDate, "MM-YYYY")
      )
    ) {
      return res.status(200).json({
        message: "Talaba bu oyda hali qabul qilinmagan",
        debt: true,
        invalid_month: true,
      });
    }

    // 🟢 Agar tanlangan oy qabul qilingan oy bo'lsa, qarzdorlik yo'q
    if (paymentMonth === studentAdmissionDate) {
      return res.status(200).json({
        message: "",
        debt: false,
      });
    }

    // 🟢 Oldingi oy qabul qilingan oydan oldingi oy bo'lsa, qarzdorlik tekshirilmaydi
    const isPreviousMonthBeforeAdmission = moment(
      previousMonth,
      "MM-YYYY"
    ).isBefore(moment(studentAdmissionDate, "MM-YYYY"));

    if (isPreviousMonthBeforeAdmission) {
      return res.status(200).json({
        message: "",
        debt: false,
      });
    }

    const previousPayments = await paymentModel.find({
      user_id: studentId,
      payment_month: previousMonth,
    });

    let totalPaid = 0;
    previousPayments.forEach((payment) => {
      totalPaid += payment.payment_quantity;
    });

    if (totalPaid < student.monthlyFee) {
      return res.status(200).json({
        message: `${previousMonth} uchun qarzdorlik mavjud.`,
        debt: true,
        debt_month: previousMonth,
        debt_sum: student.monthlyFee - totalPaid,
      });
    }

    return res.status(200).json({
      message: "",
      debt: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Serverda xatolik yuz berdi",
      error: err.message,
    });
  }
};

exports.getMonthlyPaymentSummary = async (req, res) => {
  try {
    const { schoolId } = req.user;

    // 12 oy massivini generatsiya qilish
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const month = moment().month(i).format("MM-YYYY");
      return { date: month, cash: 0, card: 0, bankshot: 0, total: 0 };
    });

    const result = await paymentModel.aggregate([
      { $match: { schoolId } },
      {
        $project: {
          payment_quantity: 1,
          payment_type: 1,
          month: { $dateToString: { format: "%m-%Y", date: "$createdAt" } },
        },
      },
      {
        $group: {
          _id: { month: "$month", type: "$payment_type" },
          sum: { $sum: "$payment_quantity" },
        },
      },
    ]);

    // Natijalarni joylashtirish
    for (const item of result) {
      const target = allMonths.find((m) => m.date === item._id.month);
      if (!target) continue;

      const t = item._id.type;
      if (t === "cash") target.cash = item.sum;
      else if (t === "card") target.card = item.sum;
      else if (t === "bankshot") target.bankshot = item.sum;

      target.total = target.cash + target.card + target.bankshot;
    }

    return res.json(allMonths);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getMonthlyPaymentSummaryForGivenMonth = async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { month } = req.query;

    if (!month || !moment(month, "MM-YYYY", true).isValid()) {
      return res.status(400).json({
        message: "Invalid or missing 'month'. Required format: MM-YYYY",
      });
    }

    const start = moment(month, "MM-YYYY").startOf("month");
    const end = moment(month, "MM-YYYY").endOf("month");

    // Aggregation
    const result = await paymentModel.aggregate([
      {
        $match: {
          schoolId,
          createdAt: { $gte: start.toDate(), $lte: end.toDate() },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          sum: { $sum: "$payment_quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Har kuni uchun massiv
    const daysCount = end.date(); // oy nechta kun
    const allDays = Array.from({ length: daysCount }, (_, i) => ({
      date: moment(start)
        .date(i + 1)
        .format("DD-MM"),
      sum: 0,
    }));

    // To‘ldirish
    for (const item of result) {
      const dayIndex = item._id - 1;
      if (allDays[dayIndex]) {
        allDays[dayIndex].sum = item.sum;
      }
    }

    return res.json(allDays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.editPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = req.user;
    const { password } = req.body;
    const school = await schoolModel.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: "Maktab topilmadi" });
    }
    const isMatch = school.extraPassword === password;
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: "Parol noto'g'ri" });
    }
    const payment = await paymentModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!payment) {
      return res.status(404).json({ message: "Qarzdorlik topilmadi" });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: "Serverda xatolik" });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const { schoolId } = req.user;

    const school = await schoolModel.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: "Maktab topilmadi" });
    }
    const isMatch = school.extraPassword === password;
    if (!isMatch) {
      return res.status(400).json({ ok: false, message: "Parol noto'g'ri" });
    }

    const payment = await paymentModel.findByIdAndDelete(id);
    if (!payment) {
      return res.status(404).json({ message: "Qarzdorlik topilmadi" });
    }

    res
      .status(200)
      .json({ ok: true, message: "To'lov muvaffaqiyatli o'chirildi" });
  } catch (err) {
    console.error("Xatolik:", err.message);
    return res.status(500).json({ message: "Serverda xatolik" });
  }
};
