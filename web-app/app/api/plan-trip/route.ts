import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, userId } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are Porter, an AI travel concierge. Your job is to help users plan their perfect trips by analyzing their requests and providing detailed, actionable travel plans.

Return ONLY a valid JSON object with this structure:
{
  "destination": "specific destination name",
  "dates": "recommended travel dates or season",
  "duration": "recommended trip duration",
  "budget": "estimated budget range",
  "activities": ["array of 3-5 recommended activities"],
  "accommodation": "recommended accommodation type",
  "transportation": "recommended transportation options",
  "recommendations": ["array of 3-5 practical travel tips"]
}

Rules:
- Be specific and actionable
- Consider the user's preferences mentioned in their request
- Provide realistic budget estimates
- Suggest practical activities and accommodations
- Include helpful travel tips
- Return ONLY the JSON, no other text`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI')
    }

    const tripPlan = JSON.parse(jsonMatch[0])

    // Validate required fields
    const requiredFields = ['destination', 'dates', 'duration', 'budget', 'activities', 'accommodation', 'transportation', 'recommendations']
    for (const field of requiredFields) {
      if (!tripPlan[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    return NextResponse.json(tripPlan)

  } catch (error) {
    console.error('Trip planning error:', error)
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to plan trip' },
      { status: 500 }
    )
  }
}
