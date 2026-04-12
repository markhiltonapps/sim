'use client'

import { Badge } from '@/components/emcn'
import { LandingFAQ, type LandingFAQItem } from '@/app/(landing)/components/landing-faq'

const FAQS: LandingFAQItem[] = [
  {
    question: 'What is Neato_Pilot?',
    answer:
      'Neato_Pilot is a hosted AI agent platform. You can build, deploy, and run AI-powered workflows connecting 190+ integrations and the best LLMs available — including OpenAI, Anthropic, Google Gemini, Mistral, and more.',
  },
  {
    question: 'Do I need to know how to code?',
    answer:
      'No. The visual canvas lets you build workflows by dragging and connecting blocks. For developers, there are Function blocks for custom JavaScript and Python, plus a full API and CLI.',
  },
  {
    question: 'Which AI models can I use?',
    answer:
      'Neato_Pilot supports 16 LLM providers including OpenAI (GPT-4o), Anthropic (Claude), Google (Gemini), Mistral, xAI (Grok), DeepSeek, Groq, and open-source models via Ollama. You choose the model per agent or block.',
  },
  {
    question: 'What is included in the Free plan?',
    answer:
      'The Free plan gives you up to 3 active workflows, 1,000 execution credits per month, 5GB file storage, and 3 knowledge tables. No credit card required.',
  },
  {
    question: 'Can I connect my existing tools?',
    answer:
      'Yes. Neato_Pilot supports 190+ integrations including Slack, Gmail, Notion, HubSpot, Salesforce, GitHub, Google Workspace, Supabase, and many more. You can also use the HTTP block or webhooks to connect any API.',
  },
  {
    question: 'How do I deploy a workflow?',
    answer:
      'Every workflow can be deployed with one click as an API endpoint, chat interface, web form, MCP server, or scheduled task. You get a unique URL and can generate API keys for authentication.',
  },
] as const

export default function FAQ() {
  return (
    <section
      id='faq'
      aria-labelledby='faq-heading'
      className='bg-[var(--landing-bg)] pt-[60px] pb-[60px] md:pt-[100px] md:pb-[100px]'
    >
      <div className='mx-auto max-w-2xl px-4 sm:px-8'>
        <div className='flex flex-col items-center text-center'>
          <Badge
            variant='blue'
            size='md'
            dot
            className='font-season text-[11px] uppercase tracking-[0.08em]'
            style={{ color: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.1)' }}
          >
            FAQ
          </Badge>
          <h2
            id='faq-heading'
            className='mt-4 font-[430] font-season text-[28px] text-white leading-[110%] tracking-[-0.02em] sm:text-[36px]'
          >
            Common questions
          </h2>
        </div>

        <div className='mt-10'>
          <LandingFAQ faqs={FAQS} />
        </div>
      </div>
    </section>
  )
}
