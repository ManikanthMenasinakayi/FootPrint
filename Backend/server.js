import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';
import { Course, Concept, Progress, User } from './models.js';
import { detectCycle, computeConceptStates, computeTargetPath } from './graphEngine.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

// Helper to build ID -> Title lookup
async function getCourseContext(courseId) {
  const course = await Course.findById(courseId);
  const concepts = await Concept.find({ courseId, isArchived: false });
  const titleMap = {};
  for (const c of concepts) titleMap[c._id.toString()] = c.title;
  return { course, concepts, titleMap };
}

// 1. Get all courses
app.get('/api/courses', async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

// 2. Create new course
app.post('/api/courses', async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json(course);
});

// 3. Get full course graph + dynamic learner progress
app.get('/api/courses/:courseId/graph', async (req, res) => {
  const { courseId } = req.params;
  const learnerId = req.query.learnerId || 'demo-student';

  const { course, concepts, titleMap } = await getCourseContext(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  let progress = await Progress.findOne({ courseId, learnerId });
  if (!progress) {
    progress = await Progress.create({ learnerId, courseId, concepts: [], notifications: [] });
  }

  const masteredSet = new Set(
    progress.concepts.filter((p) => p.isMastered).map((p) => p.conceptId.toString())
  );

  const enrichedConcepts = computeConceptStates(concepts, course.edges, masteredSet, titleMap);

  res.json({
    course,
    concepts: enrichedConcepts,
    progress
  });
});

// 4a. Add a new Concept (Node)
app.post('/api/courses/:courseId/concepts', async (req, res) => {
  const concept = await Concept.create({
    ...req.body,
    courseId: req.params.courseId
  });
  res.status(201).json(concept);
});

// 4b. Update an existing Concept's title, video URL, duration, or passing score
app.put('/api/courses/:courseId/concepts/:conceptId', async (req, res) => {
  const { conceptId } = req.params;
  const { title, videoUrl, durationMins, passingScore } = req.body;

  const concept = await Concept.findById(conceptId);
  if (!concept) return res.status(404).json({ error: 'Concept not found' });

  if (title) concept.title = title;
  if (concept.lessons && concept.lessons.length > 0) {
    if (videoUrl !== undefined) concept.lessons[0].urlOrContent = videoUrl;
    if (durationMins !== undefined) concept.lessons[0].durationMins = Number(durationMins);
  } else if (videoUrl) {
    concept.lessons = [
      {
        title: `${concept.title} Lesson`,
        type: 'video',
        urlOrContent: videoUrl,
        durationMins: Number(durationMins) || 15
      }
    ];
  }

  if (passingScore !== undefined && concept.quiz) {
    concept.quiz.passingScore = Number(passingScore);
  }

  await concept.save();
  res.json(concept);
});

// 5. Add a Prerequisite Link (Edge) with Cycle Detection
app.post('/api/courses/:courseId/edges', async (req, res) => {
  const { courseId } = req.params;
  const { source, target } = req.body;

  const { course, titleMap } = await getCourseContext(courseId);
  const exists = course.edges.some(
    (e) => e.source.toString() === source && e.target.toString() === target
  );
  if (exists) return res.status(400).json({ error: 'Prerequisite link already exists.' });

  const cyclePath = detectCycle(course.edges, source, target, titleMap);
  if (cyclePath) {
    return res.status(400).json({
      error: `Cycle detected! Adding this link creates a circular loop: ${cyclePath.join(' -> ')}`,
      cyclePath
    });
  }

  course.edges.push({ source, target });
  await course.save();

  // Notify enrolled learners
  await Progress.updateMany(
    { courseId },
    {
      $push: {
        notifications: {
          message: `Prerequisite added: "${titleMap[source]}" is now required before "${titleMap[target]}".`
        }
      }
    }
  );

  res.json(course.edges);
});

// 6. Remove a Prerequisite Link (Edge)
app.delete('/api/courses/:courseId/edges/:edgeId', async (req, res) => {
  const { courseId, edgeId } = req.params;
  const course = await Course.findById(courseId);
  course.edges = course.edges.filter((e) => e._id.toString() !== edgeId);
  await course.save();
  res.json(course.edges);
});

// 7. Submit Quiz & Update Mastery
app.post('/api/courses/:courseId/concepts/:conceptId/quiz', async (req, res) => {
  const { courseId, conceptId } = req.params;
  const { learnerId = 'demo-student', answers } = req.body;

  const concept = await Concept.findById(conceptId);
  const questions = concept.quiz?.questions || [];
  let correct = 0;
  questions.forEach((q, idx) => {
    if (answers[idx] === q.correctIndex) correct++;
  });

  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;
  const passed = score >= (concept.quiz?.passingScore || 70);

  let progress = await Progress.findOne({ courseId, learnerId });
  if (!progress) progress = await Progress.create({ learnerId, courseId, concepts: [] });

  const existing = progress.concepts.find((c) => c.conceptId.toString() === conceptId);
  if (existing) {
    existing.bestScore = Math.max(existing.bestScore, score);
    if (passed) existing.isMastered = true;
  } else {
    progress.concepts.push({
      conceptId,
      bestScore: score,
      isMastered: passed
    });
  }

  await progress.save();
  res.json({ score, passed, passingScore: concept.quiz?.passingScore || 70 });
});

// 8. Compute Personalized Shortest Learning Path to Target Concept
app.get('/api/courses/:courseId/path/:targetId', async (req, res) => {
  const { courseId, targetId } = req.params;
  const learnerId = req.query.learnerId || 'demo-student';

  const { course, concepts } = await getCourseContext(courseId);
  const progress = await Progress.findOne({ courseId, learnerId });
  const masteredSet = new Set(
    (progress?.concepts || []).filter((p) => p.isMastered).map((p) => p.conceptId.toString())
  );

  const pathData = computeTargetPath(concepts, course.edges, targetId, masteredSet);
  res.json(pathData);
});

// 9. Live Concept Splitting (Preserves Student Mastery + Rewires Graph)
app.post('/api/courses/:courseId/concepts/:conceptId/split', async (req, res) => {
  const { courseId, conceptId } = req.params;
  const { part1Title, part2Title } = req.body;

  const course = await Course.findById(courseId);
  const oldConcept = await Concept.findById(conceptId);
  if (!oldConcept) return res.status(404).json({ error: 'Concept not found' });

  const c1 = await Concept.create({
    courseId,
    title: part1Title || `${oldConcept.title} (Part 1)`,
    description: oldConcept.description,
    lessons: oldConcept.lessons.slice(0, 1),
    quiz: oldConcept.quiz
  });

  const c2 = await Concept.create({
    courseId,
    title: part2Title || `${oldConcept.title} (Part 2)`,
    description: oldConcept.description,
    lessons: oldConcept.lessons.slice(1).length ? oldConcept.lessons.slice(1) : oldConcept.lessons,
    quiz: oldConcept.quiz
  });

  const newEdges = [];
  for (const e of course.edges) {
    const src = e.source.toString();
    const tgt = e.target.toString();
    if (tgt === conceptId) {
      newEdges.push({ source: src, target: c1._id });
    } else if (src === conceptId) {
      newEdges.push({ source: c2._id, target: tgt });
    } else {
      newEdges.push({ source: e.source, target: e.target });
    }
  }
  newEdges.push({ source: c1._id, target: c2._id });
  course.edges = newEdges;
  await course.save();

  oldConcept.isArchived = true;
  await oldConcept.save();

  const allProgress = await Progress.find({ courseId });
  for (const prog of allProgress) {
    const oldEntry = prog.concepts.find((c) => c.conceptId.toString() === conceptId);
    if (oldEntry?.isMastered) {
      prog.concepts.push(
        { conceptId: c1._id, bestScore: oldEntry.bestScore, isMastered: true, inheritedFrom: oldConcept._id },
        { conceptId: c2._id, bestScore: oldEntry.bestScore, isMastered: true, inheritedFrom: oldConcept._id }
      );
    }
    prog.notifications.push({
      message: `Curriculum updated: "${oldConcept.title}" was split into "${c1.title}" and "${c2.title}". Your mastery was preserved!`
    });
    await prog.save();
  }

  res.json({ c1, c2 });
});

// 10. Clear learner notifications
app.post('/api/courses/:courseId/notifications/read', async (req, res) => {
  const { courseId } = req.params;
  const { learnerId = 'demo-student' } = req.body;
  await Progress.updateOne(
    { courseId, learnerId },
    { $set: { 'notifications.$[].isRead': true } }
  );
  res.json({ ok: true });
});

// Hardcoded Instructor Credentials
const INSTRUCTOR_CREDS = {
  email: 'instructor@footprint.edu',
  password: 'admin123',
  name: 'Prof. Admin'
};

// 11. Learner Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered. Please log in.' });
    }
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'learner'
    });
    res.status(201).json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: 'learner'
    });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed.' });
  }
});

// 12. Unified Login (Checks Hardcoded Instructor first, then Learner DB)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase().trim();

  if (cleanEmail === INSTRUCTOR_CREDS.email && password === INSTRUCTOR_CREDS.password) {
    return res.json({
      id: 'instructor-admin',
      name: INSTRUCTOR_CREDS.name,
      email: INSTRUCTOR_CREDS.email,
      role: 'instructor'
    });
  }

  const user = await User.findOne({ email: cleanEmail, password });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: 'learner'
  });
});

// 13. Gemini AI Tutor Chat Endpoint
// 13. Gemini AI Tutor Chat Endpoint (with Automatic Model Fallback & Retry)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history = [], context = {} } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in Backend/.env' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (context.isQuizActive) {
      return res.status(403).json({
        error: 'AI Assistant is disabled during a proctored quiz.'
      });
    }

    const systemInstruction = `You are FootPrint AI, a concise and encouraging Computer Science & DSA tutor embedded inside a prerequisite-aware learning platform.
Current Learner Context:
- Role: ${context.role || 'learner'}
- Selected Concept: ${context.conceptTitle || 'None selected'}
- Concept Description: ${context.conceptDescription || 'N/A'}
- Concept Status: ${context.conceptStatus || 'N/A'}
- Missing Prerequisites: ${(context.missingPrereqs || []).join(', ') || 'None'}

Rules:
1. Keep explanations clear, structured, and under 180 words unless asked for a code walkthrough.
2. If the concept is locked, explain why those missing prerequisites matter first.
3. Never give direct answers to mastery quiz questions—guide the student with hints instead.`;

    const priorTurns = history.slice(0, -1);
    const firstUserIdx = priorTurns.findIndex((m) => m.role === 'user');
    const validHistory = firstUserIdx === -1 ? [] : priorTurns.slice(firstUserIdx);

    const contents = [
      ...validHistory.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    // Try primary model first, then automatically fall back if a model has a 503 spike
    const modelsToTry = ['gemini-3.5-flash','gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: { systemInstruction }
        });
        return res.json({ reply: response.text });
      } catch (err) {
        lastError = err;
        const status = err?.status || err?.code;
        // Retry next model on 503 (high demand) or 429 (rate limit)
        if (status === 503 || status === 429 || String(err?.message).includes('503')) {
          console.warn(`Model ${modelName} busy (${status}), switching to fallback model...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({
      error: 'Gemini servers are briefly busy. Please send your message again in a few seconds.'
    });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(process.env.PORT || 5000, () => console.log('Server running on port 5000'));
  })
  .catch((err) => console.error(err));