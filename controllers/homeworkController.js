const Homework = require("../models/homeworkModel");
const LessonSchedule = require("../models/lessonScheduleModel");
const response = require("../utils/response.helper");

// 🔹 Uyga vazifa qo‘shish
exports.addHomework = async (req, res) => {
  try {
    const { lessonId, title, description } = req.body;
    const { teacherId, schoolId } = req.teacher || req.user;

    if (!lessonId || !title || !description) {
      return response.validationError(res, "Majburiy maydonlar to‘ldirilmagan");
    }

    // Shu darsni tekshirish
    const lesson = await LessonSchedule.findById(lessonId).populate(
      "groupId subjectId"
    );
    if (!lesson) return response.notFound(res, "Dars topilmadi");

    // 🔑 Shu dars uchun allaqachon vazifa qo‘shilganmi tekshirish
    const existingHomework = await Homework.findOne({ lessonId });
    if (existingHomework) {
      return response.validationError(
        res,
        "Bu dars uchun allaqachon vazifa qo‘shilgan"
      );
    }

    const homework = await Homework.create({
      schoolId,
      lessonId,
      groupId: lesson.groupId,
      subjectId: lesson.subjectId,
      teacherId,
      title,
      description,
    });

    return response.success(res, {
      message: "Uyga vazifa qo‘shildi",
      homework,
    });
  } catch (err) {
    console.error("Add homework error:", err);
    return response.error(res, err.message);
  }
};

// 🔹 Uyga vazifani yangilash (faqat title va description)
exports.updateHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return response.validationError(res, "Majburiy maydonlar to‘ldirilmagan");
    }

    const homework = await Homework.findById(homeworkId);
    if (!homework) {
      return response.notFound(res, "Uyga vazifa topilmadi");
    }

    homework.title = title;
    homework.description = description;
    await homework.save();

    return response.success(res, {
      message: "Uyga vazifa yangilandi",
      homework,
    });
  } catch (err) {
    console.error("Update homework error:", err);
    return response.error(res, err.message);
  }
};

// 🔹 Dars bo‘yicha vazifalar
exports.getHomeworkByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const homeworks = await Homework.find({ lessonId })
      .populate("teacherId", "firstName lastName")
      .populate("subjectId", "name");

    return response.success(res, homeworks);
  } catch (err) {
    return response.error(res, err.message);
  }
};

// 🔹 Guruh bo‘yicha vazifalar
exports.getHomeworkByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const homeworks = await Homework.find({ groupId })
      .populate("teacherId", "firstName lastName")
      .populate("subjectId", "name")
      .populate("lessonId", "day lessonNumber");

    return response.success(res, homeworks);
  } catch (err) {
    return response.error(res, err.message);
  }
};
