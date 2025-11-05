const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB  ulandi `);
  } catch (error) {
    console.error(`Xatolik: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
