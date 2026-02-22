require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const routes = require("./routes/index");
const parentRoutes = require("./routes/parentRoutes");
const auth = require("./middlewares/authMiddleware");
const cors = require("cors");
const moment = require("moment-timezone");
const { WebSocketServer } = require("ws");

const app = express();
connectDB();

/* =========================
   ✅ RUXSAT BERILGAN DOMENLAR
========================= */

const allowedOrigins = [
  "https://sata-school-f.vercel.app",
  "https://sata-f.vercel.app",
  "http://localhost:3000",
];

// 🔥 Dynamic CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // postman yoki server requestlar

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS ruxsat berilmadi"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   ROUTES
========================= */

// 🔓 Authsiz marshrutlar
app.use("/api/davomat/teacher", routes);
app.use("/api/parent", parentRoutes);

// 🔐 Protected marshrutlar
app.use("/api", auth, routes);

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message,
  });
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 8057;

const server = app.listen(PORT, () => {
  console.log(`✅ Server ${PORT} portda ishga tushdi`);
});

server.setTimeout(60000);

/* =========================
   WEBSOCKET
========================= */

const wss = new WebSocketServer({ server });

async function sendAttendanceToAPI(eventData) {
  const fetch = (await import("node-fetch")).default;

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
        Authorization: `Bearer ${process.env.API_TOKEN}`,
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
  console.log("🟢 WebSocket client ulandi");

  ws.on("message", (message) => {
    try {
      const eventData = JSON.parse(message.toString());

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
