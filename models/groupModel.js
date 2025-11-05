const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
  number: {
    type: String,
    required: true,
    enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
});

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
