const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;




class jwtHelper {
  // Generate token
  async generate(data, expiresIn = "30d") {
    return new Promise((resolve, reject) => {
      try {
        const token = jwt.sign(data, secret, { expiresIn });
        return resolve(token);
      } catch (error) {
        return reject(error);
      }
    });
  }

  // Verify token
  async verify(token) {
    return new Promise((resolve, reject) => {
      try {
        const verify = jwt.verify(token, secret);
        return resolve(verify);
      } catch (error) {
        return reject(error);
      }
    });
  }
}

module.exports = new jwtHelper();
