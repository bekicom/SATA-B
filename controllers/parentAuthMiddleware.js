const jwt = require("jsonwebtoken");

const parentAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token topilmadi" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_PARENT); // 🔹 faqat parent uchun secret

    req.user = decoded; // decoded = { guardianPhoneNumber, role: "parent", iat, exp }
    next();
  } catch (error) {
    console.error("parentAuth error:", error);
    res.status(401).json({ message: "Token yaroqsiz yoki muddati tugagan" });
  }
};

module.exports = parentAuth;
