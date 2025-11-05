const jwt = require("../utils/token.helper");
const response = require("../utils/response.helper");

async function auth(req, res, next) {
  let token, msg, data;
  token = req?.headers?.authorization?.split(" ").pop() || null;
  const publicPath = [
    "/schools/",
    "/schools",
    "/schools/login",
    "/schools/",
    "/schools/login/",
    "/user/login",
    "/user/login/",
    "/teachers/login",
  ];
  if (publicPath.includes(req.path)) return next();
  msg = "Вы не авторизованы для доступа к этому ресурсу";
  if (!token) return response.unauthorized(res, msg);
  data = await jwt.verify(token);
  msg = `Ваша сессия истекла, пожалуйста, авторизуйтесь заново`;
  if (!data) return response.unauthorized(res, msg);

  req.user = data;

  return next();
}

module.exports = auth;
