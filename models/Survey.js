import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['text', 'multiple-choice', 'single-choice'], default: 'text' },
  options: [String] // For multiple/single choice questions
});

const SurveySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  questions: [QuestionSchema],
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true }],
  createdAt: { type: Date, default: Date.now }
});

const Survey = mongoose.model('Survey', SurveySchema);

export default Survey;
