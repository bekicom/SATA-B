const mongoose = require('mongoose');
const teacherAttendance = new mongoose.Schema({
    teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    month: {
        type: String,
        required: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    summ: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now()
    },
    lessonCount: {
        type: Number,
        required: true
    },
    week: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('TeacherAttendance', teacherAttendance)