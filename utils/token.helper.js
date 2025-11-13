const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

class jwtHelper {
  // Generate token
  generate(data, expiresIn = "30d") {
    return jwt.sign(data, secret, { expiresIn });
  }

  // Verify token
  verify(token) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      return false; // ❗ xatoni tashlamaymiz
    }
  }
}

module.exports = new jwtHelper();
