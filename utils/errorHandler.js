const errorHandler = (err, req, res, next) => {
  // Xatolarni loglash (konsolega chiqarish yoki faylga yozish)
  console.error(err);

  // Xatolarni tahlil qilish
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Foydalanuvchiga xato javobini yuborish
  res.status(statusCode).json({
    message: err.message || "Xatolik yuz berdi",
    stack: process.env.NODE_ENV === "production" ? null : err.stack, // Faqat rivojlanish muhitida stack izini ko'rsatish
  });
};

module.exports = errorHandler;
