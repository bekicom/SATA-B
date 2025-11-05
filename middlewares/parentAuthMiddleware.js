const jwt = require("jsonwebtoken");

const parentAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token topilmadi, ruxsat yo‘q" });
    }

    // Tokenni faqat ota-ona uchun maxsus secret bilan tekshiramiz
    const decoded = jwt.verify(token, process.env.JWT_SECRET_PARENT);

    if (!decoded || !decoded.guardianPhoneNumber) {
      return res.status(401).json({ message: "Noto‘g‘ri token" });
    }

    // ✅ faqat telefon raqamini sessionda saqlaymiz
    req.user = { guardianPhoneNumber: decoded.guardianPhoneNumber };

    next();
  } catch (error) {
    console.error("Parent auth error:", error.message);
    return res
      .status(401)
      .json({
        message: "Token noto‘g‘ri yoki muddati tugagan",
        error: error.message,
      });
  }
};

module.exports = parentAuth;
