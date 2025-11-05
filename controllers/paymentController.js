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
      switch (month) {
        case "01":
          return "Yanvar";
        case "02":
          return "Fevral";
        case "03":
          return "Mart";
        case "04":
          return "Aprel";
        case "05":
          return "May";
        case "06":
          return "Iyun";
        case "07":
          return "Iyul";
        case "08":
          return "Avgust";
        case "09":
          return "Sentabr";
        case "10":
          return "Oktabr";
        case "11":
          return "Noyabr";
        case "12":
          return "Dekabr";
        default:
          return "Noma'lum oy";
      }
    };

    const student = await studentModel.findById(user_id);
    if (!student) {
      return res.status(404).json({ message: "Talaba topilmadi" });
    }

    const monthlyFee = student?.monthlyFee;
    if (!monthlyFee) {
      return res
        .status(404)
        .json({ message: "Talabaning oylik to'lovi aniqlanmagan" });
    }

    const userGroup = await groupModel.findById(student.groupId);
    if (!userGroup) {
      return res.status(404).json({ message: "Guruh topilmadi" });
    }

    const previousPayments = await paymentModel.find({
      user_id: student._id,
    });

    const paymentMap = {};
    previousPayments.forEach((payment) => {
      if (!paymentMap[payment.payment_month]) {
        paymentMap[payment.payment_month] = 0;
      }
      paymentMap[payment.payment_month] += payment.payment_quantity;
    });

    const previousMonth = moment(payment_month, "MM-YYYY")
      .subtract(1, "month")
      .format("MM-YYYY");

    if (paymentMap[previousMonth] < monthlyFee) {
      return res.status(400).json({
        message: `${monthName(
          previousMonth.slice(0, 2)
        )} oyi uchun qarzdorlik bor`,
      });
    }

    const school = await schoolModel.findByIdAndUpdate(schoolId, {
      $inc: { budget: payment_quantity },
    });
    if (!school) {
      return res
        .status(500)
        .json({ message: "To'lovni amalga oshirishda xatolik yuz berdi" });
    }

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
    const savedPayment = await newPayment.save();
    if (!savedPayment) {
      return res
        .status(500)
        .json({ message: "To'lovni saqlashda xatolik yuz berdi" });
    }

    student.payments.push(newPayment._id);
    await student.save();

    res.status(201).json({ message: "To'lov muvaffaqiyatli amalga oshirildi" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Serverda xatolik yuz berdi", error: err.message });
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

      // 🟣 Eng ko‘p ishlatilgan to‘lov turini aniqlash
      const counts = {
        cash: cashCount,
        card: cardCount,
        bankshot: bankCount,
      };
      const dominantType = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b
      );

      payment.payment_type = dominantType; // eng ko‘p ishlatilgan tur
      delete payment.payment_types;
    });

    const filteredPayments = [];
    for (const payment of mergedPaymentsArray) {
      const studentPayments = await paymentModel.find({
        user_id: payment.user_id,
        payment_month: payment.payment_month,
      });

      let totalPaid = 0;
      studentPayments.forEach((p) => (totalPaid += p.payment_quantity));
      if (totalPaid >= payment.student_monthlyFee) {
        // student'ning monthlyFee bilan solishtirish
        filteredPayments.push(payment);
      }
    }
    res.status(200).json(filteredPayments);
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
      .find({ schoolId, isActive: true }) // 🔹 faqat faol studentlar
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

        // Consolidate payments by month
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

          const isAlreadyAdded = finalPayments.some(
            (payment) =>
              payment.user_id === user_id &&
              payment.payment_month === paymentMonthStr
          );

          if (
            !isAlreadyAdded &&
            (!existingPayment || existingPayment.payment_quantity < monthlyFee)
          ) {
            finalPayments.push({
              user_id: user_id,
              user_fullname: `${firstName} ${lastName}`,
              user_group: groupId?.name,
              user_groupId: groupId?._id,
              payment_quantity: existingPayment
                ? existingPayment.payment_quantity
                : 0,
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

    // Agar student faol bo‘lmasa, qarzdor hisoblamaymiz
    if (!student.isActive) {
      return res.status(200).json({
        message: "",
        debt: false,
      });
    }
    const studentAdmissionDate = moment(student.admissionDate).format(
      "MM-YYYY"
    );

    if (paymentMonth === studentAdmissionDate) {
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
    const currentYear = moment().year();
    const allMonths = [];
    for (let i = 1; i <= 12; i++) {
      const month = moment()
        .month(i - 1)
        .format("MM-YYYY");
      allMonths.push({
        date: month,
        cash: 0,
        card: 0,
        bankshot: 0,
        total: 0,
      });
    }
    const result = await paymentModel.aggregate([
      {
        $match: { schoolId: schoolId },
      },
      {
        $project: {
          payment_quantity: 1,
          payment_type: 1,
          payment_month: {
            $dateToString: { format: "%m-%Y", date: "$createdAt" },
          },
        },
      },
      {
        $group: {
          _id: { month: "$payment_month", type: "$payment_type" },
          summ: { $sum: "$payment_quantity" },
        },
      },
    ]);

    result.forEach((item) => {
      const found = allMonths.find((m) => m.date === item._id.month);
      if (found) {
        if (item._id.type === "cash") found.cash = item.summ;
        else if (item._id.type === "card") found.card = item.summ;
        else if (item._id.type === "bankshot") found.bankshot = item.summ;
        found.total = found.cash + found.card + found.bankshot;
      }
    });

    res.json(allMonths);
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
        message: "Invalid or missing 'month' query parameter. Format: MM-YYYY",
      });
    }

    const startOfMonth = moment(month, "MM-YYYY").startOf("month");
    const endOfMonth = moment(month, "MM-YYYY").endOf("month");

    const result = await paymentModel.aggregate([
      {
        $match: {
          schoolId: schoolId,
          createdAt: {
            $gte: startOfMonth.toDate(),
            $lte: endOfMonth.toDate(),
          },
        },
      },
      {
        $project: {
          payment_quantity: 1,
          payment_day: { $dayOfMonth: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$payment_day",
          summ: { $sum: "$payment_quantity" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const allDaysInMonth = [];
    for (let day = 1; day <= endOfMonth.date(); day++) {
      const date = moment(startOfMonth).date(day).format("DD-MM");
      allDaysInMonth.push({ date: date, summ: 0 });
    }

    result.forEach((item) => {
      const index = allDaysInMonth.findIndex(
        (day) =>
          day.date === moment(startOfMonth).date(item._id).format("DD-MM")
      );
      if (index !== -1) {
        allDaysInMonth[index].summ = item.summ;
      }
    });

    res.json(allDaysInMonth);
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
      return res.status(400).json({ ok: false, message: "Parol noto‘g‘ri" });
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
      return res.status(400).json({ ok: false, message: "Parol noto‘g‘ri" });
    }

    const payment = await paymentModel.findByIdAndDelete(id);
    if (!payment) {
      return res.status(404).json({ message: "Qarzdorlik topilmadi" });
    }

    res
      .status(200)
      .json({ ok: true, message: "To‘lov muvaffaqiyatli o‘chirildi" });
  } catch (err) {
    console.error("Xatolik:", err.message);
    return res.status(500).json({ message: "Serverda xatolik" });
  }
};
