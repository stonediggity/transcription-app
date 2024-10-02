import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import os from 'os'
import path from 'path'

// Initialize the OpenAI client with custom configuration
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL,
})

// Handle POST requests to convert text into a formalized letter or notes
export async function POST(req: NextRequest) {
  try {
    // Extract text and type from the request body
    const { text, type } = await req.json()

    let systemPrompt = ''
    if (type === 'letter') {
      // Set system prompt for letter conversion
      systemPrompt = `You are an expert medical transcriptionist and letter composer. Your task is to convert the following transcribed audio into a professional medical letter. The letter should:

1. Should not begin with any letter head. We are just doing the body of the letter.
2. Use formal medical language and terminology.
3. Organize the information in a clear, logical structure.
4. Include relevant patient details, diagnoses, treatments, and recommendations.
5. Maintain a professional and empathetic tone throughout.
6. Conclude with a summary and any necessary follow-up instructions.
7. End with an appropriate signature line for the medical professional.

Please format the letter properly, using standard medical letter conventions. If any information seems unclear or incomplete, use your best judgment to create a coherent letter, but do not invent any medical facts not present in the original transcription.`
    } else if (type === 'notes') {
      // Set system prompt for notes conversion
      systemPrompt = `You are an expert medical transcriptionist specializing in creating concise and accurate medical notes. Your task is to convert the following transcribed audio into a structured medical note. The note should be organized into the following sections:

Issues:
[Leave this section blank for manual input later]
On Review:
Summarize the patient's history, current complaints, and any relevant background information from the transcription.
Observations and Examination:
List all physical examination findings, vital signs, and any observable symptoms mentioned in the transcription. Use bullet points for clarity.
Impression:
Only output the impression as detailed in the transcription. If it is not present leave blank.
Plan:
Only output the plan as detailed in the transcription. If it is not present leave blank.

Format the note clearly, using medical terminology where appropriate. If any information is unclear or incomplete, use your best judgment to create coherent notes, but do not invent any medical facts not present in the original transcription. Maintain a verbatim output with no extra formatting`
    } else {
      throw new Error('Invalid conversion type')
    }

    // Make a request to the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Specify the model you want to use
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    })

    // Return the generated formal letter or notes
    return NextResponse.json({ formalLetter: response.choices[0].message.content })
  } catch (error) {
    console.error('Error converting text:', error)
    return NextResponse.error()
  }
}