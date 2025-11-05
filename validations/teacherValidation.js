const validator = require("../utils/validator");
const response = require("../utils/response.helper");

const teacherValidation = async (req, res, next) => {
  try {
    const schema = {
      type: "object",
      properties: {
        firstName: { type: "string", minLength: 3 },
        lastName: { type: "string", minLength: 3 },
        birthDate: { type: "string", format: "date" },
        phoneNumber: { type: "string" },
        science: { type: "string", default: "" },
        hour: { type: "number", minimum: 1 },
        price: { type: "number", minimum: 1 },
        schedule: {
          type: "object",
          properties: {
            dushanba: { type: "number", default: 0 },
            seshanba: { type: "number", default: 0 },
            chorshanba: { type: "number", default: 0 },
            payshanba: { type: "number", default: 0 },
            juma: { type: "number", default: 0 },
            shanba: { type: "number", default: 0 },
          },
          required: [
            "dushanba",
            "seshanba",
            "chorshanba",
            "payshanba",
            "juma",
            "shanba",
          ],
        },
        classLeader: { type: "string", default: "" },
        monthlySalary: { type: "number", minimum: 1 },
        schoolId: { type: "string" },
        employeeNo: { type: "string", minLength: 1 },

        // 🔑 Yangi maydonlar
        login: { type: "string", minLength: 3 },
        password: { type: "string", minLength: 6 },
      },
      required: [
        "firstName",
        "lastName",
        "birthDate",
        "phoneNumber",
        "science",
        "hour",
        "price",
        "schedule",
        "monthlySalary",
        "schoolId",
        "employeeNo",
        "login",
        "password", // 🔑 qo‘shildi
      ],
      additionalProperties: false,
      errorMessage: {
        properties: {
          firstName: "Ismingizni to'ldiring",
          lastName: "Familiyangizni to'ldiring",
          birthDate: "Tug'ilgan sanangizni to'ldiring",
          phoneNumber: "Telefon raqamingizni to'ldiring",
          science: "Fanini to'ldiring",
          hour: "O'qituvchi dars sonini to'ldiring",
          price: "O'qituvchi dars maoshini to'ldiring",
          schedule: "Dars soatlarini to'ldiring",
          monthlySalary: "O'qituvchi oylik maoshini to'ldiring",
          schoolId: "SchoolId noto‘g‘ri",
          employeeNo: "Employee No ni to'ldiring",
          login: "Loginni to'ldiring",
          password: "Parolni kamida 6 belgidan kiriting",
        },
        required: {
          firstName: "Ismingizni to'ldiring",
          lastName: "Familiyangizni to'ldiring",
          birthDate: "Tug'ilgan sanangizni to'ldiring",
          phoneNumber: "Telefon raqamingizni to'ldiring",
          science: "Fanini to'ldiring",
          hour: "O'qituvchi dars sonini to'ldiring",
          price: "O'qituvchi dars maoshini to'ldiring",
          schedule: "Dars soatlarini to'ldiring",
          monthlySalary: "O'qituvchi oylik maoshini to'ldiring",
          schoolId: "SchoolId noto‘g‘ri",
          employeeNo: "Employee No ni to'ldiring",
          login: "Loginni to'ldiring",
          password: "Parolni kiriting",
        },
      },
    };

    const validate = await validator(schema, req.body);
    if (!validate) return next();
    return response.warning(res, "Validation error", validate);
  } catch (error) {
    console.log(error);
    return response.error(res, error);
  }
};

module.exports = teacherValidation;
