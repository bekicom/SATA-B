const jwt = require("../utils/token.helper");
const response = require("../utils/response.helper");

async function auth(req, res, next) {
  const publicPaths = [
    "/schools",
    "/schools/",
    "/schools/login",
    "/schools/login/",
    "/user/login",
    "/user/login/",
    "/teachers/login",
  ];

  // Public routelarni tekshirish
  if (publicPaths.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return response.unauthorized(
      res,
      "Вы не авторизованы для доступа к этому ресурсу"
    );
  }

  const token = header.split(" ")[1];

  // Tokenni tekshirish
  let data;
  try {
    data = await jwt.verify(token); // Agar helper promisefy qilingan bo‘lsa OK
  } catch (err) {
    return response.unauthorized(
      res,
      "Ваша сессия истекла, пожалуйста, авторизуйтесь заново"
    );
  }

  req.user = data;
  next();
}

module.exports = auth;
