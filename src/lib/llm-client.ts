export type LLMProvider = 'openai' | 'anthropic'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  model?: string
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

// Stream chat completion from OpenAI
async function streamOpenAI(
  messages: Message[],
  apiKey: string,
  model: string,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content
            if (token) {
              callbacks.onToken(token)
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    callbacks.onComplete()
  } catch (error) {
    callbacks.onError(error as Error)
  }
}

// Stream chat completion from Anthropic
async function streamAnthropic(
  messages: Message[],
  apiKey: string,
  model: string,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'content_block_delta') {
              const token = parsed.delta?.text
              if (token) {
                callbacks.onToken(token)
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    callbacks.onComplete()
  } catch (error) {
    callbacks.onError(error as Error)
  }
}

// Stream chat completion with the configured LLM provider
export async function streamChatCompletion(
  config: LLMConfig,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<void> {
  const model = config.model || (config.provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-20241022')

  if (config.provider === 'openai') {
    return streamOpenAI(messages, config.apiKey, model, callbacks)
  } else {
    return streamAnthropic(messages, config.apiKey, model, callbacks)
  }
}

// Validate API key format
export function validateApiKey(provider: LLMProvider, apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) return false

  if (provider === 'openai') {
    return apiKey.startsWith('sk-')
  } else {
    return apiKey.startsWith('sk-ant-')
  }
}
