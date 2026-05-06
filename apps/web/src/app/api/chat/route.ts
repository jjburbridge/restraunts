import {anthropic} from '@ai-sdk/anthropic'
import {createMCPClient, type MCPClient} from '@ai-sdk/mcp'
import {sanityInsightsIntegration} from '@sanity/agent-context/ai-sdk'
import {convertToModelMessages, stepCountIs, streamText, type UIMessage} from 'ai'
import {createClient} from 'next-sanity'

const writeClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
})

const SYSTEM_PROMPT = `You are a friendly restaurant discovery assistant. Help users find restaurants, get recommendations, and answer questions about cuisines, features, and locations.

Use your tools to search for restaurants based on the user's preferences. When making recommendations, include relevant details like cuisine type, rating, location, and features. Be concise and helpful.`

export async function POST(req: Request) {
  const {messages, id: threadId}: {messages: UIMessage[]; id: string} = await req.json()

  if (!process.env.SANITY_CONTEXT_MCP_URL) {
    return Response.json({error: 'SANITY_CONTEXT_MCP_URL is not configured'}, {status: 500})
  }

  if (!process.env.SANITY_API_READ_TOKEN) {
    return Response.json({error: 'SANITY_API_READ_TOKEN is not configured'}, {status: 500})
  }

  let mcpClient: MCPClient | null = null

  try {
    mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: process.env.SANITY_CONTEXT_MCP_URL,
        headers: {
          Authorization: `Bearer ${process.env.SANITY_API_READ_TOKEN}`,
        },
      },
    })

    const mcpTools = await mcpClient.tools()

    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: mcpTools,
      stopWhen: stepCountIs(10),
      experimental_telemetry: {
        isEnabled: !!process.env.SANITY_API_WRITE_TOKEN,
        integrations: process.env.SANITY_API_WRITE_TOKEN
          ? [
              sanityInsightsIntegration({
                client: writeClient,
                agentId: 'restaurant-assistant',
                threadId,
              }),
            ]
          : [],
      },
      onFinish: async () => {
        await mcpClient?.close()
      },
    })

    return result.toUIMessageStreamResponse({originalMessages: messages})
  } catch (error) {
    await mcpClient?.close()
    return Response.json(
      {error: error instanceof Error ? error.message : 'An unexpected error occurred'},
      {status: 500},
    )
  }
}
