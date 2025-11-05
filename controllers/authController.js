const School = require("../models/schoolModel");
const bcrypt = require("bcryptjs");
const jwt = require("../utils/token.helper");

const loginSchool = async (req, res) => {
  const { login, password } = req.body;

  try {
    let school = await School.findOne({ login });
    let davomat;



    if (!school) {
      davomat = await School.findOne({ teacherLogin: login });
      if (!davomat) {
        return res.status(404).json({ message: "Maktab topilmadi" });
      }
    }




    let isMatch;
    if (!school) {
      if (!davomat || !davomat.teacherPassword) {
        return res.status(400).json({ message: "Noto'g'ri ma'lumot" });
      }
      isMatch = davomat.teacherPassword === password;
    } else {
      isMatch = await bcrypt.compare(password, school.password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Parol noto'g'ri" });
    }

    let token;
    if (!school) {
      token = await jwt.generate({ schoolId: davomat?._id.toString() });
    } else {
      token = await jwt.generate({ schoolId: school?._id.toString() });
    }
    res.json({ token, id: school ? school?._id.toString() : davomat?._id.toString(), role: !school ? "teacher" : "admin" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server xatosi" });
  }
};

module.exports = {
  loginSchool,
};
