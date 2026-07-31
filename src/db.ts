import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ExamPlan, Question, UserAttempt, InterviewPlan } from './types.js';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  Firestore
} from 'firebase/firestore';

interface DatabaseSchema {
  plans: ExamPlan[];
  questions: Question[];
  attempts: UserAttempt[];
  interviewPlans: InterviewPlan[];
}

const DB_PATH = path.resolve('./src/db.json');
let cache: DatabaseSchema | null = null;

// Firebase initialization state
let firestoreDb: Firestore | null = null;
let isFirestoreInitialized = false;

/**
 * Initializes Firestore dynamically using firebase-applet-config.json configuration.
 * Automatically falls back to local JSON if configuration is missing or invalid.
 */
async function initFirestore(): Promise<Firestore | null> {
  if (isFirestoreInitialized) return firestoreDb;
  
  try {
    const configPath = path.resolve('./firebase-applet-config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    if (config && config.projectId) {
      const app = getApps().length === 0 ? initializeApp(config) : getApp();
      if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
        firestoreDb = getFirestore(app, config.firestoreDatabaseId);
      } else {
        firestoreDb = getFirestore(app);
      }
      console.log('[FIREBASE] Firestore persistent database initialized successfully.');
    }
  } catch (err: any) {
    console.warn('[FIREBASE] Firestore connection details not found or failed to initialize. Using local fallback.', err.message || err);
  } finally {
    isFirestoreInitialized = true;
  }
  
  return firestoreDb;
}

/**
 * Safely deletes a collection of references in batches of 400 to comply with Firestore 500-limit.
 */
async function batchDeleteRefs(db: Firestore, refs: any[]): Promise<void> {
  let count = 0;
  let batch = writeBatch(db);
  for (const ref of refs) {
    batch.delete(ref);
    count++;
    if (count >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
}

async function loadDb(): Promise<DatabaseSchema> {
  if (cache) return cache;
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    cache = {
      plans: parsed.plans || [],
      questions: parsed.questions || [],
      attempts: parsed.attempts || [],
      interviewPlans: parsed.interviewPlans || []
    };
    return cache!;
  } catch (err) {
    cache = { plans: [], questions: [], attempts: [], interviewPlans: [] };
    await saveDb();
    return cache;
  }
}

async function saveDb(): Promise<void> {
  if (!cache) return;
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  } catch {}
  await fs.writeFile(DB_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

export const dbStore = {
  getPlans: async (deviceId?: string): Promise<ExamPlan[]> => {
    const db = await initFirestore();
    if (db) {
      try {
        if (!deviceId) return [];
        const plansCol = collection(db, 'plans');
        const q = query(plansCol, where('device_id', '==', deviceId));
        const snapshot = await getDocs(q);
        const plans: ExamPlan[] = [];
        snapshot.forEach(docSnap => {
          plans.push(docSnap.data() as ExamPlan);
        });
        return plans.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } catch (err) {
        console.error('[FIREBASE] getPlans failed, falling back to local DB:', err);
      }
    }
    
    const dbLocal = await loadDb();
    if (!deviceId) return [];
    return dbLocal.plans.filter(p => p.device_id === deviceId);
  },
  
  getPlan: async (id: string, deviceId?: string): Promise<ExamPlan | null> => {
    const db = await initFirestore();
    if (db) {
      try {
        const planRef = doc(db, 'plans', id);
        const planDoc = await getDoc(planRef);
        if (!planDoc.exists()) return null;
        const plan = planDoc.data() as ExamPlan;
        if (deviceId && plan.device_id !== deviceId) {
          return null;
        }
        return plan;
      } catch (err) {
        console.error('[FIREBASE] getPlan failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    const plan = dbLocal.plans.find(p => p.id === id);
    if (!plan) return null;
    if (!deviceId || plan.device_id !== deviceId) {
      return null;
    }
    return plan;
  },

  createPlan: async (title: string, deviceId?: string): Promise<ExamPlan> => {
    const id = crypto.randomUUID();
    const newPlan: ExamPlan = {
      id,
      title,
      created_at: new Date().toISOString(),
      device_id: deviceId
    };

    const db = await initFirestore();
    if (db) {
      try {
        await setDoc(doc(db, 'plans', id), newPlan);
        return newPlan;
      } catch (err) {
        console.error('[FIREBASE] createPlan failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    dbLocal.plans.push(newPlan);
    await saveDb();
    return newPlan;
  },

  deletePlan: async (id: string): Promise<void> => {
    const db = await initFirestore();
    if (db) {
      try {
        // Cascade delete plan
        await deleteDoc(doc(db, 'plans', id));

        // Get questions
        const questionsCol = collection(db, 'questions');
        const qQuestions = query(questionsCol, where('exam_plan_id', '==', id));
        const questionsSnapshot = await getDocs(qQuestions);
        
        const questionIds: string[] = [];
        const refsToDelete: any[] = [];
        questionsSnapshot.forEach(docSnap => {
          questionIds.push(docSnap.id);
          refsToDelete.push(docSnap.ref);
        });

        // Get attempts
        if (questionIds.length > 0) {
          const attemptsCol = collection(db, 'attempts');
          const attemptsSnapshot = await getDocs(attemptsCol);
          attemptsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data && questionIds.includes(data.question_id)) {
              refsToDelete.push(docSnap.ref);
            }
          });
        }

        // Delete all collected documents in safe batches
        await batchDeleteRefs(db, refsToDelete);
        return; // Success
      } catch (err) {
        console.error('[FIREBASE] deletePlan failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    dbLocal.plans = dbLocal.plans.filter(p => p.id !== id);
    
    // Cascade delete questions
    const planQuestions = dbLocal.questions.filter(q => q.exam_plan_id === id);
    const planQuestionIds = planQuestions.map(q => q.id);
    dbLocal.questions = dbLocal.questions.filter(q => q.exam_plan_id !== id);
    
    // Cascade delete attempts
    dbLocal.attempts = dbLocal.attempts.filter(a => !planQuestionIds.includes(a.question_id));
    
    await saveDb();
  },

  getQuestions: async (planId: string): Promise<Question[]> => {
    const db = await initFirestore();
    if (db) {
      try {
        const questionsCol = collection(db, 'questions');
        const q = query(questionsCol, where('exam_plan_id', '==', planId));
        const snapshot = await getDocs(q);
        const questions: Question[] = [];
        snapshot.forEach(docSnap => {
          questions.push(docSnap.data() as Question);
        });
        return questions.sort((a, b) => a.question_number - b.question_number);
      } catch (err) {
        console.error('[FIREBASE] getQuestions failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    return dbLocal.questions
      .filter(q => q.exam_plan_id === planId)
      .sort((a, b) => a.question_number - b.question_number);
  },

  addQuestions: async (questions: Omit<Question, 'id'>[]): Promise<Question[]> => {
    const inserted: Question[] = [];
    const db = await initFirestore();
    if (db) {
      try {
        let count = 0;
        let batch = writeBatch(db);
        for (const q of questions) {
          const id = crypto.randomUUID();
          const newQ: Question = {
            ...q,
            id
          };
          const qRef = doc(db, 'questions', id);
          batch.set(qRef, newQ);
          inserted.push(newQ);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
        return inserted;
      } catch (err) {
        console.error('[FIREBASE] addQuestions failed, falling back to local DB:', err);
        inserted.length = 0; // Clear attempts
      }
    }

    const dbLocal = await loadDb();
    for (const q of questions) {
      const newQ: Question = {
        ...q,
        id: crypto.randomUUID()
      };
      dbLocal.questions.push(newQ);
      inserted.push(newQ);
    }
    await saveDb();
    return inserted;
  },

  getAttempts: async (planId: string, deviceId?: string): Promise<UserAttempt[]> => {
    if (!deviceId) return [];

    const db = await initFirestore();
    if (db) {
      try {
        const questions = await dbStore.getQuestions(planId);
        const questionIds = new Set(questions.map(q => q.id));

        const attemptsCol = collection(db, 'attempts');
        const q = query(attemptsCol, where('device_id', '==', deviceId));
        const snapshot = await getDocs(q);
        const attempts: UserAttempt[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as UserAttempt;
          if (questionIds.has(data.question_id)) {
            attempts.push(data);
          }
        });
        return attempts;
      } catch (err) {
        console.error('[FIREBASE] getAttempts failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    const planQuestionsIndex = new Set(
      dbLocal.questions.filter(q => q.exam_plan_id === planId).map(q => q.id)
    );
    const planAttempts = dbLocal.attempts.filter(a => planQuestionsIndex.has(a.question_id));
    return planAttempts.filter(a => a.device_id === deviceId);
  },

  saveAttempt: async (attempt: Omit<UserAttempt, 'id' | 'attempted_at'> & { device_id?: string }): Promise<UserAttempt> => {
    const id = crypto.randomUUID();
    const newAttempt: UserAttempt = {
      ...attempt,
      id,
      attempted_at: new Date().toISOString()
    };

    const db = await initFirestore();
    if (db) {
      try {
        const docId = `${attempt.device_id || 'anonymous'}_${attempt.question_id}`;
        await setDoc(doc(db, 'attempts', docId), newAttempt);
        return newAttempt;
      } catch (err) {
        console.error('[FIREBASE] saveAttempt failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    dbLocal.attempts = dbLocal.attempts.filter(
      a => !(a.question_id === attempt.question_id && a.device_id === attempt.device_id)
    );
    dbLocal.attempts.push(newAttempt);
    await saveDb();
    return newAttempt;
  },

  // ==========================================
  // NEW INTERVIEW PREPARATION ENDPOINTS (V2)
  // ==========================================

  getInterviewPlans: async (deviceId: string): Promise<InterviewPlan[]> => {
    const db = await initFirestore();
    if (db) {
      try {
        const plansCol = collection(db, 'interviewPlans');
        const q = query(plansCol, where('device_id', '==', deviceId));
        const snapshot = await getDocs(q);
        const plans: InterviewPlan[] = [];
        snapshot.forEach(docSnap => {
          plans.push(docSnap.data() as InterviewPlan);
        });
        return plans.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } catch (err) {
        console.error('[FIREBASE] getInterviewPlans failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    return dbLocal.interviewPlans.filter(p => p.device_id === deviceId);
  },

  getInterviewPlan: async (id: string, deviceId: string): Promise<InterviewPlan | null> => {
    const db = await initFirestore();
    if (db) {
      try {
        const docRef = doc(db, 'interviewPlans', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        const plan = docSnap.data() as InterviewPlan;
        return plan.device_id === deviceId ? plan : null;
      } catch (err) {
        console.error('[FIREBASE] getInterviewPlan failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    const found = dbLocal.interviewPlans.find(p => p.id === id);
    if (!found) return null;
    return found.device_id === deviceId ? found : null;
  },

  saveInterviewPlan: async (plan: InterviewPlan): Promise<InterviewPlan> => {
    const db = await initFirestore();
    if (db) {
      try {
        await setDoc(doc(db, 'interviewPlans', plan.id), plan);
        return plan;
      } catch (err) {
        console.error('[FIREBASE] saveInterviewPlan failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    dbLocal.interviewPlans = dbLocal.interviewPlans.filter(p => p.id !== plan.id);
    dbLocal.interviewPlans.push(plan);
    await saveDb();
    return plan;
  },

  deleteInterviewPlan: async (id: string): Promise<void> => {
    const db = await initFirestore();
    if (db) {
      try {
        await deleteDoc(doc(db, 'interviewPlans', id));
        return;
      } catch (err) {
        console.error('[FIREBASE] deleteInterviewPlan failed, falling back to local DB:', err);
      }
    }

    const dbLocal = await loadDb();
    dbLocal.interviewPlans = dbLocal.interviewPlans.filter(p => p.id !== id);
    await saveDb();
  },

  getStorageStatus: async (): Promise<{ persistent: boolean; provider: string }> => {
    const db = await initFirestore();
    if (db) {
      return { persistent: true, provider: 'Google Cloud Firestore' };
    }
    return { persistent: false, provider: 'Local Storage Fallback' };
  },

  getDeviceIds: async (): Promise<string[]> => {
    const db = await initFirestore();
    const idsSet = new Set<string>();
    
    if (db) {
      try {
        const plansCol = collection(db, 'plans');
        const plansSnap = await getDocs(plansCol);
        plansSnap.forEach(docSnap => {
          const d = docSnap.data().device_id;
          if (d) idsSet.add(d);
        });
        
        const interviewCol = collection(db, 'interviewPlans');
        const interviewSnap = await getDocs(interviewCol);
        interviewSnap.forEach(docSnap => {
          const d = docSnap.data().device_id;
          if (d) idsSet.add(d);
        });
      } catch (err) {
        console.error('[FIREBASE] getDeviceIds failed:', err);
      }
    }
    
    try {
      const dbLocal = await loadDb();
      if (dbLocal.plans) {
        dbLocal.plans.forEach(p => {
          if (p.device_id) idsSet.add(p.device_id);
        });
      }
      if (dbLocal.interviewPlans) {
        dbLocal.interviewPlans.forEach(p => {
          if (p.device_id) idsSet.add(p.device_id);
        });
      }
    } catch {}
    
    return Array.from(idsSet).filter(id => typeof id === 'string' && id.trim() !== '');
  },

  deleteWorkspace: async (deviceId: string): Promise<void> => {
    if (!deviceId || deviceId.trim() === '') return;
    const db = await initFirestore();
    if (db) {
      try {
        const refsToDelete: any[] = [];

        // 1. Get plans of this device
        const plansCol = collection(db, 'plans');
        const qPlans = query(plansCol, where('device_id', '==', deviceId));
        const plansSnap = await getDocs(qPlans);
        const planIds: string[] = [];
        plansSnap.forEach(docSnap => {
          planIds.push(docSnap.id);
          refsToDelete.push(docSnap.ref);
        });

        // 2. Get questions of those plans
        const questionIds: string[] = [];
        if (planIds.length > 0) {
          const questionsCol = collection(db, 'questions');
          for (const planId of planIds) {
            const qQuestions = query(questionsCol, where('exam_plan_id', '==', planId));
            const questionsSnap = await getDocs(qQuestions);
            questionsSnap.forEach(docSnap => {
              questionIds.push(docSnap.id);
              refsToDelete.push(docSnap.ref);
            });
          }
        }

        // 3. Get attempts of this device directly or attempts of those questions
        const attemptsCol = collection(db, 'attempts');
        const qAttempts = query(attemptsCol, where('device_id', '==', deviceId));
        const attemptsSnap = await getDocs(qAttempts);
        attemptsSnap.forEach(docSnap => {
          refsToDelete.push(docSnap.ref);
        });

        if (questionIds.length > 0) {
          const attemptsSnapAll = await getDocs(attemptsCol);
          attemptsSnapAll.forEach(docSnap => {
            const data = docSnap.data();
            if (data && questionIds.includes(data.question_id)) {
              if (!refsToDelete.some(r => r.path === docSnap.ref.path)) {
                refsToDelete.push(docSnap.ref);
              }
            }
          });
        }

        // 4. Get interview plans of this device
        const interviewCol = collection(db, 'interviewPlans');
        const qInterview = query(interviewCol, where('device_id', '==', deviceId));
        const interviewSnap = await getDocs(qInterview);
        interviewSnap.forEach(docSnap => {
          refsToDelete.push(docSnap.ref);
        });

        // Batch delete
        await batchDeleteRefs(db, refsToDelete);
      } catch (err) {
        console.error(`[FIREBASE] deleteWorkspace failed for ${deviceId}:`, err);
      }
    }

    // Local DB cleanup
    try {
      const dbLocal = await loadDb();
      if (dbLocal.plans) {
        const planIdsToDelete = dbLocal.plans.filter(p => p.device_id === deviceId).map(p => p.id);
        dbLocal.plans = dbLocal.plans.filter(p => p.device_id !== deviceId);
        
        if (dbLocal.questions) {
          dbLocal.questions = dbLocal.questions.filter(q => !planIdsToDelete.includes(q.exam_plan_id));
        }
        if (dbLocal.attempts) {
          dbLocal.attempts = dbLocal.attempts.filter(a => a.device_id !== deviceId && !planIdsToDelete.includes(a.question_id));
        }
      }
      if (dbLocal.interviewPlans) {
        dbLocal.interviewPlans = dbLocal.interviewPlans.filter(p => p.device_id !== deviceId);
      }
      await saveDb();
    } catch {}
  }
};
