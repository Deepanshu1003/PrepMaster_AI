import { PDFParse } from 'pdf-parse';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseQuestionsWithGemini } from './ai_service.js';

export interface ExtractedQuestion {
  question_number: number;
  text: string;
  options: Record<string, string>;
}

export async function parseQuestionFile(
  filePath: string,
  originalFilename: string,
  modelName: string = 'gemini-3.5-flash'
): Promise<ExtractedQuestion[]> {
  console.log(`\n[PARSER] Initiating extraction for: ${filePath} (using model: ${modelName})`);
  
  const ext = path.extname(originalFilename).toLowerCase();
  let rawText = '';

  if (ext === '.pdf') {
    rawText = await extractTextFromPdf(filePath);
  } else if (ext === '.txt' || ext === '.text') {
    rawText = await extractTextFromTxt(filePath);
  } else {
    throw new Error(`Unsupported file format '${ext}'. Please upload a PDF (.pdf) or plain-text (.txt) file.`);
  }

  // Deterministic local parsing first
  let questions = parseQuestionsFromText(rawText);

  // If deterministic indexing returns nothing, invoke Gemini fallback parser
  if (questions.length === 0 && rawText.trim().length > 10) {
    console.log(`[PARSER] Deterministic regex found 0 questions. Invoking Gemini AI parser using: ${modelName}...`);
    try {
      questions = await parseQuestionsWithGemini(rawText, modelName);
    } catch (err: any) {
      console.error('[PARSER] Error running Gemini fallback parser:', err);
    }
  }

  return questions;
}

async function extractTextFromPdf(filePath: string): Promise<string> {
  let doc: PDFParse | null = null;
  try {
    const buffer = await fs.readFile(filePath);
    doc = new PDFParse({ data: buffer });
    const textResult = await doc.getText();
    const cleanText = textResult.text.replace(/\x00/g, '') + '\n';
    console.log(`[PARSER] PDF opened dynamically with PDFParse — ${cleanText.length} characters extracted.`);
    return cleanText;
  } catch (err: any) {
    console.error(`[PARSER] CRITICAL ERROR opening PDF:`, err);
    throw new Error(`The PDF could not be read. Error detail: ${err.message || err}. It may be encrypted, corrupted, or a scanned image without embedded text.`);
  } finally {
    if (doc) {
      try {
        await doc.destroy();
      } catch (e) {
        console.error(`[PARSER] ERROR destroying PDF doc instance:`, e);
      }
    }
  }
}

async function extractTextFromTxt(filePath: string): Promise<string> {
  console.log('[PARSER] Reading plain-text file.');
  const encodings = ['utf-8', 'latin1', 'ascii'];
  for (const enc of encodings) {
    try {
      const data = await fs.readFile(filePath, { encoding: enc as BufferEncoding });
      return data.replace(/\x00/g, '');
    } catch {
      continue;
    }
  }
  throw new Error('The text file could not be decoded. Please save it as UTF-8 and try again.');
}

export function parseQuestionsFromText(fullText: string): ExtractedQuestion[] {
  if (!fullText.trim()) {
    console.log('[PARSER] ERROR: Extracted text is empty.');
    return [];
  }

  // Primary: "Question #N" format, allow space/tabs/newline as boundaries
  const primaryRegex = /(?:^|[\s\n\r])Question\s*#\s*\d+/gi;
  const indices: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = primaryRegex.exec(fullText)) !== null) {
    indices.push(match.index);
  }
  console.log(`[PARSER] Primary regex found ${indices.length} question boundaries.`);

  // Fallback: "1. ", "1) " format
  if (indices.length === 0) {
    const fallbackRegex = /(?:\n|^|\s+)(?:\d+[\.\:\x2d\)])\s+/gi;
    while ((match = fallbackRegex.exec(fullText)) !== null) {
      indices.push(match.index);
    }
    console.log(`[PARSER] Fallback regex found ${indices.length} question boundaries.`);
  }

  if (indices.length === 0) {
    console.log('[PARSER] ERROR: No question boundaries detected.');
    return [];
  }

  const parsedQuestions: ExtractedQuestion[] = [];

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : fullText.length;
    let qBlock = fullText.substring(start, end).trim();

    // Determine question number & clean headers
    let qNum = i + 1;
    const primaryMatch = /Question\s*#\s*(\d+)/i.exec(qBlock);
    
    if (primaryMatch) {
      qNum = parseInt(primaryMatch[1], 10);
      qBlock = qBlock.replace(/Question\s*#\s*\d+/i, '');
      qBlock = qBlock.replace(/Topic\s*\d+[\s\-\w]*\n/gi, '');
      qBlock = qBlock.replace(/Topic\s*\d+/gi, '');
    } else {
      const fallbackMatch = /^(\d+)/.exec(qBlock);
      if (fallbackMatch) {
        qNum = parseInt(fallbackMatch[1], 10);
        qBlock = qBlock.replace(/^\d+[\.\:\x2d\)]\s*/i, '');
      } else {
        continue; // invalid format
      }
    }

    qBlock = qBlock.trim();

    // Split into question text and options cleanly using space or newline boundaries
    const optionsPattern = /(?:\s|\n|\r)+([A-F])[\.\)]\s+/i;
    const parts = qBlock.split(optionsPattern);

    const pageCleanup = /(?:--|-|\[)?\s*\d+\s+(?:of|OF)\s+\d+\s*(?:--|-|\])?|\b(?:page|Page|PAGE|pg\.?|Pg\.?)\s*(?:no|num|number|#)?\.?\s*\d+\s*(?:of\s*\d+)?\b/gi;
    const questionText = parts[0].trim().replace(/\x00/g, '').replace(pageCleanup, '').trim().replace(/--\s*$/, '').trim();
    const options: Record<string, string> = {};

    for (let j = 1; j < parts.length; j += 2) {
      const optionLetter = parts[j]?.trim().toUpperCase();
      let optionVal = parts[j + 1]?.trim().replace(/\x00/g, '') || '';
      optionVal = optionVal.replace(pageCleanup, '').replace(/--\s*$/, '').replace(/\s+/g, ' ').trim();
      if (optionLetter) {
        options[optionLetter] = optionVal;
      }
    }

    if (i === 0) {
      console.log(`[PARSER] Deterministic Q${qNum} text preview: ${questionText.substring(0, 80)}...`);
      console.log(`[PARSER] Deterministic Q${qNum} options: ${Object.keys(options)}`);
    }

    parsedQuestions.push({
      question_number: qNum,
      text: questionText,
      options: Object.keys(options).length > 0 ? options : { "TEXT": "Write your text response below." }
    });
  }

  console.log(`[PARSER] Compiled ${parsedQuestions.length} questions deterministically.`);
  return parsedQuestions.sort((a, b) => a.question_number - b.question_number);
}
