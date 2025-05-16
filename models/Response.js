import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  answer: mongoose.Schema.Types.Mixed
});

const ResponseSchema = new mongoose.Schema({
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
  participant: { type: String },
  answers: [AnswerSchema],
  submittedAt: { type: Date, default: Date.now }
});

const Response = mongoose.model('Response', ResponseSchema);

export default Response;