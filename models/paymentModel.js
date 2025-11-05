const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    user_fullname: {
      type: String,
      required: true,
    },
    user_group: {
      type: String,
      required: true,
    },
    payment_quantity: {
      type: Number,
      required: true,
    },
    payment_month: {
      type: String,
      required: true,
    },
    schoolId: {
      type: String,
      required: true,
    },
    payment_type: {
      type: String,
      enum: ["cash", "card", "bankshot"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
