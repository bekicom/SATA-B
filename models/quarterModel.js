const mongoose = require("mongoose");

const quarterSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quarter", quarterSchema);
