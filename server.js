require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const routes = require("./routes/index");
const auth = require("./middlewares/authMiddleware");
const cors = require("cors");
const moment = require("moment-timezone");
const { WebSocketServer } = require("ws");
const parentRoutes = require("./routes/parentRoutes");
const app = express();
connectDB();
// ✅ Ruxsat berilgan domenlar
const allowedOrigins = [
  "https://sata-school-f.vercel.app",
  "http://localhost:3000",
  "https://7f661wm9-8030.euw.devtunnels.ms/api",
];
app.use(
  cors({
    origin: "*", // Hamma domenlarga ruxsat
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    // ⚠️ credentials bilan ishlashda origin '*' ishlamaydi
    // credentials: true, // agar cookie yuborilishini xohlasangiz, undan foydalanmang
  })
);

app.use(express.json());

// ✅ Authsiz marshrutlar
app.use("/api/davomat/teacher", routes); // authsiz
// Authsiz marshrutlar
app.use("/api/parent", parentRoutes);
// faqat ota-onalar uchun

// ✅ Qolgan barcha marshrutlar auth bilan
app.use("/api", auth, routes);

// 🔹 Server ishga tushirish
const PORT = process.env.PORT || 8057;
const server = app.listen(PORT, () => {
  console.log(`✅ Server ${PORT} portda ishga tushdi.`);
});
server.setTimeout(60000);

//
// =============================
//  WebSocket qismi
// =============================
const wss = new WebSocketServer({ server });

async function sendAttendanceToAPI(eventData) {
  const fetch = (await import("node-fetch")).default; // ⬅ Dynamic import

  const payload = {
    employeeNo: eventData.employeeNo,
    davomatDate: moment().tz("Asia/Tashkent").format("YYYY-MM-DD"),
    status: "keldi",
  };

  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/davomat/teacher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`, // token kerak bo‘lsa
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("✅ Davomat API javobi:", data);
  } catch (err) {
    console.error("❌ Davomat API xatosi:", err.message);
  }
}

wss.on("connection", (ws) => {
  console.log("🟢 Yangi WebSocket client ulandi");

  ws.on("message", (message) => {
    try {
      const eventData = JSON.parse(message.toString());
      console.log("📩 WS dan kelgan:", eventData);

      if (eventData.employeeNo) {
        sendAttendanceToAPI(eventData);
      }
    } catch (error) {
      console.error("❌ WS xatosi:", error.message);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Client uzildi");
  });
});
