const jwt = require("../utils/token.helper");
const response = require("../utils/response.helper");

async function teacherAuth(req, res, next) {
  let token, msg, data;
  token = req?.headers?.authorization?.split(" ").pop() || null;

  const publicPath = ["/teachers/login", "/teachers/login/"];
  if (publicPath.includes(req.path)) return next();

  msg = "Siz ushbu resursga kirish uchun avtorizatsiyadan o‘tishingiz kerak";
  if (!token) return response.unauthorized(res, msg);

  data = await jwt.verify(token);
  msg = `Sizning sessiyangiz tugadi, qaytadan login qiling`;
  if (!data) return response.unauthorized(res, msg);

  req.teacher = data; // { teacherId, schoolId }
  return next();
}

module.exports = teacherAuth;
