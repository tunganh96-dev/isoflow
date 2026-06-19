import type Anthropic from '@anthropic-ai/sdk'

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

export function anthropicText(response: Anthropic.Message) {
  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
    .trim()
}
