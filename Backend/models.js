import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  edges: [
    {
      source: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true },
      target: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true }
    }
  ]
});

const conceptSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  description: String,
  lessons: [
    {
      title: String,
      type: { type: String, enum: ['video', 'text'], default: 'video' },
      urlOrContent: String,
      durationMins: { type: Number, default: 10 }
    }
  ],
  quiz: {
    passingScore: { type: Number, default: 70 },
    questions: [
      {
        question: String,
        options: [String],
        correctIndex: Number
      }
    ]
  },
  isArchived: { type: Boolean, default: false }
});

const progressSchema = new mongoose.Schema({
  learnerId: { type: String, required: true }, // Simple ID/username for fast hackathon switching
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  concepts: [
    {
      conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
      completedLessonIds: [mongoose.Schema.Types.ObjectId],
      bestScore: { type: Number, default: 0 },
      isMastered: { type: Boolean, default: false },
      inheritedFrom: { type: mongoose.Schema.Types.ObjectId, default: null }
    }
  ],
  notifications: [
    {
      message: String,
      isRead: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['learner', 'instructor'], default: 'learner' }
});

export const User = mongoose.model('User', userSchema);

export const Course = mongoose.model('Course', courseSchema);
export const Concept = mongoose.model('Concept', conceptSchema);
export const Progress = mongoose.model('Progress', progressSchema);