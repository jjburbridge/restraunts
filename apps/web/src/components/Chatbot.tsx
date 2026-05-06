'use client'

import {useChat} from '@ai-sdk/react'
import {DefaultChatTransport} from 'ai'
import {useState, useEffect, useRef} from 'react'
import ReactMarkdown from 'react-markdown'

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [threadId] = useState<string>(() =>
    typeof window !== 'undefined' ? crypto.randomUUID() : '',
  )
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const {messages, sendMessage, status, error} = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({id: threadId}),
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'})
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({text: input})
    setInput('')
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl transition-colors flex items-center justify-center"
      >
        {isOpen ? (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-5 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{maxHeight: 'min(560px, calc(100vh - 110px))'}}
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-blue-600 px-4 py-3 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white font-semibold text-sm">Restaurant Assistant</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">
                Ask me about restaurants, cuisines, or recommendations!
              </p>
            )}

            {messages.map((m) => {
              const textParts = m.parts.filter((p) => p.type === 'text')
              if (textParts.length === 0) return null
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {textParts.map((part, i) =>
                      m.role === 'user' ? (
                        <span key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      ) : (
                        <ReactMarkdown
                          key={i}
                          components={{
                            p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                            ul: ({children}) => (
                              <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>
                            ),
                            ol: ({children}) => (
                              <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>
                            ),
                            li: ({children}) => <li>{children}</li>,
                            strong: ({children}) => (
                              <strong className="font-semibold">{children}</strong>
                            ),
                          }}
                        >
                          {part.text}
                        </ReactMarkdown>
                      ),
                    )}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{animationDelay: `${delay}ms`}}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 text-red-700 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm">
                  Something went wrong. Please try again.
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex-shrink-0 border-t border-gray-100 p-3 flex gap-2 items-center"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about restaurants…"
              disabled={isLoading}
              className="flex-1 text-sm rounded-full border border-gray-200 px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
