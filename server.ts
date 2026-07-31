import express, { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

import { dbStore } from './src/db.js';
import { parseQuestionFile } from './src/parser.js';
import { streamEvaluation, streamHint, streamChat, streamInterviewConsultation, generateInterviewTopics, editExistingInterviewPlan, generateInterviewTopicQuiz, streamTopicChat, suggestTargetedRoles, expandTopicCards } from './src/ai_service.js';

const app = express();
const PORT = 3000;

// Setup upload parser
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

// API routes FIRST
app.get('/api/db-status', async (req: Request, res: Response) => {
  try {
    const status = await dbStore.getStorageStatus();
    res.json(status);
  } catch (err) {
    res.json({ persistent: false, provider: 'Local Storage Fallback' });
  }
});

app.get('/api/workspaces', async (req: Request, res: Response) => {
  try {
    const ids = await dbStore.getDeviceIds();
    res.json(ids);
  } catch (err) {
    res.json([]);
  }
});

app.delete('/api/workspaces/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (id && id.trim() !== '') {
      await dbStore.deleteWorkspace(id);
      res.json({ success: true, message: `Successfully deleted workspace ${id}` });
    } else {
      res.status(400).json({ success: false, message: 'Invalid Workspace ID' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/upload', upload.single('question_bank'), async (req: Request, res: Response) => {
  const planTitle = req.body.plan_title;
  const file = req.file;
  const deviceId = req.headers['x-device-id'] as string | undefined;

  if (!planTitle || !file) {
    res.status(400).json({ detail: 'plan_title and question_bank file are required.' });
    return;
  }

  const originalFilename = file.originalname || 'upload.pdf';
  const tempPath = path.join('uploads', `temp_${Date.now()}_${originalFilename}`);

  try {
    // Rename current multer temp file to preserve suffix/extension for identification
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.copyFile(file.path, tempPath);
    await fs.unlink(file.path); // remove old multer file

    console.log(`[SERVER] Uploaded path: ${tempPath}, original: ${originalFilename}`);
    
    const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

    // Parse Questions
    const extracted = await parseQuestionFile(tempPath, originalFilename, modelName);

    if (extracted.length === 0) {
      res.status(400).json({
        detail: 'No questions could be extracted from this file. Please check the format: questions should begin with "Question #1" or "1." followed by lettered options (A. B. C. D.).'
      });
      return;
    }

    // Create a new ExamPlan with device isolation
    const plan = await dbStore.createPlan(planTitle, deviceId);

    // Save questions
    const questionsToInsert = extracted.map(q => ({
      exam_plan_id: plan.id,
      question_number: q.question_number,
      text: q.text,
      options: q.options
    }));

    await dbStore.addQuestions(questionsToInsert);

    res.json({
      exam_plan_id: plan.id,
      total_questions: extracted.length
    });

  } catch (err: any) {
    console.error('[SERVER] Upload process fails:', err);
    res.status(422).json({ detail: err.message || 'Validation and extraction failed.' });
  } finally {
    // Delete temp file
    try {
      await fs.unlink(tempPath);
    } catch {}
  }
});

app.get('/api/plans', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const plans = await dbStore.getPlans(deviceId);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve plans' });
  }
});

app.get('/api/plans/:plan_id', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const plan = await dbStore.getPlan(req.params.plan_id, deviceId);
    if (!plan) {
      res.status(404).json({ detail: 'Plan not found' });
      return;
    }
    res.json(plan);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve plan' });
  }
});

app.delete('/api/plans/:plan_id', async (req: Request, res: Response) => {
  try {
    await dbStore.deletePlan(req.params.plan_id);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to delete plan' });
  }
});

app.get('/api/plans/:plan_id/questions', async (req: Request, res: Response) => {
  try {
    const questions = await dbStore.getQuestions(req.params.plan_id);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve questions' });
  }
});

app.get('/api/plans/:plan_id/progress', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const questions = await dbStore.getQuestions(req.params.plan_id);
    const attempts = await dbStore.getAttempts(req.params.plan_id, deviceId);

    const attemptsMap = new Map();
    for (const a of attempts) {
      attemptsMap.set(a.question_id, a);
    }

    const progress = questions.map(q => {
      let status = 'gray';
      const att = attemptsMap.get(q.id);
      if (att) {
        status = att.is_correct ? 'green' : 'red';
      }
      return {
        question_id: q.id,
        question_number: q.question_number,
        status: status,
        selected_answer: att ? att.selected_answer : undefined,
        explanation: att ? att.explanation : undefined
      };
    });

    res.json(progress);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to retrieve progress' });
  }
});

app.post('/api/evaluate', async (req: Request, res: Response) => {
  const { question_id, selected_answer } = req.body;
  const deviceId = req.headers['x-device-id'] as string | undefined;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';
  
  if (!question_id || !selected_answer) {
    res.status(400).json({ detail: 'question_id and selected_answer are required' });
    return;
  }

  try {
    // Find the question first
    const plans = await dbStore.getPlans(deviceId);
    let question = null;
    for (const p of plans) {
      const qs = await dbStore.getQuestions(p.id);
      const found = qs.find(q => q.id === question_id);
      if (found) {
        question = found;
        break;
      }
    }

    if (!question) {
      res.status(404).json({ detail: 'Question not found' });
      return;
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const evaluationGenerator = streamEvaluation(question.text, question.options, selected_answer, modelName);
    let fullResponseText = '';

    for await (const chunk of evaluationGenerator) {
      fullResponseText += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    // Determine graded correctness
    const firstLine = fullResponseText.trim().split('\n')[0] || '';
    const isCorrect = !firstLine.toUpperCase().includes('INCORRECT');

    // Save attempt inside database
    await dbStore.saveAttempt({
      question_id: question.id,
      selected_answer: selected_answer,
      is_correct: isCorrect,
      explanation: fullResponseText,
      device_id: deviceId
    });

    res.end();

  } catch (err: any) {
    console.error('[SERVER] Evaluate error:', err);
    res.status(500).json({ detail: err.message || 'Evaluation process failed' });
  }
});

app.post('/api/hint', async (req: Request, res: Response) => {
  const { question_id } = req.body;
  const deviceId = req.headers['x-device-id'] as string | undefined;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!question_id) {
    res.status(400).json({ detail: 'question_id is required' });
    return;
  }

  try {
    // Find the question first
    const plans = await dbStore.getPlans(deviceId);
    let question = null;
    for (const p of plans) {
      const qs = await dbStore.getQuestions(p.id);
      const found = qs.find(q => q.id === question_id);
      if (found) {
        question = found;
        break;
      }
    }

    if (!question) {
      res.status(404).json({ detail: 'Question not found' });
      return;
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const hintGenerator = streamHint(question.text, question.options, modelName);

    for await (const chunk of hintGenerator) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.end();

  } catch (err: any) {
    console.error('[SERVER] Hint error:', err);
    res.status(500).json({ detail: err.message || 'Hint process failed' });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  const { question_text, ai_explanation, user_message } = req.body;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!question_text || !ai_explanation || !user_message) {
    res.status(400).json({ detail: 'question_text, ai_explanation, and user_message are required' });
    return;
  }

  try {
    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const chatGenerator = streamChat(question_text, ai_explanation, user_message, modelName);

    for await (const chunk of chatGenerator) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.end();

  } catch (err: any) {
    console.error('[SERVER] Chat error:', err);
    res.status(500).json({ detail: err.message || 'Chat process failed' });
  }
});

// ==========================================
// NEW INTERVIEW PREPARATION ROUTES (V2)
// ==========================================

app.get('/api/interview/plans', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string || '';
    const list = await dbStore.getInterviewPlans(deviceId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Failed to retrieve interview plans' });
  }
});

app.get('/api/interview/plans/:id', async (req: Request, res: Response) => {
  try {
    const deviceId = req.headers['x-device-id'] as string || '';
    const plan = await dbStore.getInterviewPlan(req.params.id, deviceId);
    if (!plan) {
      res.status(404).json({ detail: 'Interview plan not found' });
      return;
    }
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Failed to retrieve interview plan' });
  }
});

app.post('/api/interview/plans', async (req: Request, res: Response) => {
  try {
    const plan = req.body;
    const saved = await dbStore.saveInterviewPlan(plan);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Failed to save interview plan' });
  }
});

app.delete('/api/interview/plans/:id', async (req: Request, res: Response) => {
  try {
    await dbStore.deleteInterviewPlan(req.params.id);
    res.json({ status: 'success' });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Failed to delete interview plan' });
  }
});

app.post('/api/interview/consult', async (req: Request, res: Response) => {
  const { chat_history, user_message, role, experience_level } = req.body;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!user_message || !role || !experience_level) {
    res.status(400).json({ detail: 'user_message, role, experience_level are required' });
    return;
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const generator = streamInterviewConsultation(chat_history || [], user_message, role, experience_level, modelName);
    for await (const chunk of generator) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.end();
  } catch (err: any) {
    console.error('[SERVER] Consult error:', err);
    res.status(500).json({ detail: err.message || 'Consultation streaming failed' });
  }
});

app.post('/api/interview/topic-chat', async (req: Request, res: Response) => {
  const { topic_name, topic_description, chat_history, user_message } = req.body;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!topic_name || !topic_description || !user_message) {
    res.status(400).json({ detail: 'topic_name, topic_description, and user_message are required' });
    return;
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const generator = streamTopicChat(topic_name, topic_description, chat_history || [], user_message, modelName);
    for await (const chunk of generator) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.end();
  } catch (err: any) {
    console.error('[SERVER] Topic chat error:', err);
    res.status(500).json({ detail: err.message || 'Topic chat streaming failed' });
  }
});

app.post('/api/interview/finalize', async (req: Request, res: Response) => {
  const { role, experience_level, custom_notes } = req.body;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!role || !experience_level) {
    res.status(400).json({ detail: 'role and experience_level are required' });
    return;
  }

  try {
    const topics = await generateInterviewTopics(role, experience_level, custom_notes || '', modelName);
    res.json(topics);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Generating bento topics study structure failed' });
  }
});

app.post('/api/interview/edit-plan', async (req: Request, res: Response) => {
  const { current_topics, modification_prompt, role, experience_level } = req.body;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!current_topics || !modification_prompt || !role || !experience_level) {
    res.status(400).json({ detail: 'current_topics, modification_prompt, role, and experience_level are required' });
    return;
  }

  try {
    const updatedTopics = await editExistingInterviewPlan(current_topics, modification_prompt, role, experience_level, modelName);
    res.json(updatedTopics);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Editing key topics learning template failed' });
  }
});

app.post('/api/interview/expand-topic', async (req: Request, res: Response) => {
  const { plan_id, topic_id, custom_instructions } = req.body;
  const deviceId = (req.headers['x-device-id'] as string) || '';
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!plan_id || !topic_id) {
    res.status(400).json({ detail: 'plan_id and topic_id are required' });
    return;
  }

  try {
    const plan = await dbStore.getInterviewPlan(plan_id, deviceId);
    if (!plan) {
      res.status(404).json({ detail: 'Interview plan not found' });
      return;
    }

    const topicIndex = plan.topics.findIndex(t => t.id === topic_id);
    if (topicIndex === -1) {
      res.status(404).json({ detail: 'Topic not found in this plan' });
      return;
    }

    const topic = plan.topics[topicIndex];
    
    // Call the AI expand service
    const newCards = await expandTopicCards(
      plan.role,
      plan.experience_level,
      topic.name,
      topic.description,
      custom_instructions || '',
      modelName,
      topic.cards || []
    );

    // Update topic cards list
    topic.cards = newCards;
    
    const saved = await dbStore.saveInterviewPlan(plan);
    res.json(saved);
  } catch (err: any) {
    console.error('[SERVER] Expand topic error:', err);
    res.status(500).json({ detail: err.message || 'Failed to expand topic playbooks' });
  }
});

app.post('/api/interview/generate-quiz', async (req: Request, res: Response) => {
  const { role, topic_name } = req.body;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!role || !topic_name) {
    res.status(400).json({ detail: 'role and topic_name are required' });
    return;
  }

  try {
    const quiz = await generateInterviewTopicQuiz(role, topic_name, modelName);
    res.json(quiz);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Generating interview quiz failed' });
  }
});

app.post('/api/interview/suggest-roles', async (req: Request, res: Response) => {
  const { resume_text } = req.body;
  const modelName = (req.headers['x-gemini-model'] as string) || 'gemini-3.5-flash';

  if (!resume_text) {
    res.status(400).json({ detail: 'resume_text is required' });
    return;
  }

  try {
    const suggestions = await suggestTargetedRoles(resume_text, modelName);
    res.json(suggestions);
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Analyzing resume and suggesting roles failed' });
  }
});

// Vite server setup or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('./dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
