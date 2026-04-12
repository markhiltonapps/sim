/**
 * JSON-LD structured data for the landing page.
 *
 * Renders a `<script type="application/ld+json">` with Schema.org markup.
 * Single source of truth for machine-readable page metadata.
 *
 * Schemas: Organization, WebSite, WebPage, BreadcrumbList, WebApplication, FAQPage.
 */
export default function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': '#organization',
        name: 'Neato_Pilot',
        description:
          'Neato_Pilot is a hosted AI agent platform. Build, deploy, and run AI-powered workflows connecting 190+ integrations and the best LLMs available.',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          availableLanguage: ['en'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': '#website',
        name: 'Neato_Pilot — Your AI Workforce, Ready to Deploy',
        description:
          'Neato_Pilot is the hosted AI agent platform to build, deploy, and run intelligent workflows connecting 190+ integrations and the best LLMs.',
        publisher: { '@id': '#organization' },
        inLanguage: 'en-US',
      },
      {
        '@type': 'WebPage',
        '@id': '#webpage',
        name: 'Neato_Pilot — Your AI Workforce, Ready to Deploy',
        isPartOf: { '@id': '#website' },
        about: { '@id': '#software' },
        datePublished: '2024-01-01T00:00:00+00:00',
        dateModified: new Date().toISOString(),
        description:
          'Neato_Pilot is the hosted AI agent platform to build, deploy, and run intelligent workflows. Connect 190+ integrations and 16 LLM providers to deploy and orchestrate agentic workflows.',
        breadcrumb: { '@id': '#breadcrumb' },
        inLanguage: 'en-US',
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['#hero-heading', '[id="hero"] p'],
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': '#breadcrumb',
        itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home' }],
      },
      {
        '@type': 'WebApplication',
        '@id': '#software',
        name: 'Neato_Pilot — Your AI Workforce, Ready to Deploy',
        description:
          'Neato_Pilot is the hosted AI agent platform to build, deploy, and run intelligent workflows connecting 190+ integrations and the best LLMs. Create agents, workflows, knowledge bases, and tables.',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires a modern browser with JavaScript enabled',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Plan — 1,000 credits/month',
            price: '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Pro Plan — 10,000 credits/month',
            price: '29',
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '29',
              priceCurrency: 'USD',
              unitText: 'MONTH',
              billingIncrement: 1,
            },
            availability: 'https://schema.org/InStock',
          },
        ],
        featureList: [
          'Visual workflow builder',
          'Multi-LLM agent support (16 providers)',
          '190+ integrations',
          'Built-in knowledge base (RAG)',
          'Inline data tables',
          'Real-time collaboration',
          'Deploy as API, chat, form, or MCP server',
          'Custom JavaScript and Python functions',
          'Scheduled workflows',
          'Event triggers',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': '#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Neato_Pilot?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Neato_Pilot is a hosted AI agent platform. You can build, deploy, and run AI-powered workflows connecting 190+ integrations and the best LLMs available — including OpenAI, Anthropic, Google Gemini, Mistral, and more.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need to know how to code?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. The visual canvas lets you build workflows by dragging and connecting blocks. For developers, there are Function blocks for custom JavaScript and Python, plus a full API and CLI.',
            },
          },
          {
            '@type': 'Question',
            name: 'Which AI models can I use?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Neato_Pilot supports 16 LLM providers including OpenAI (GPT-4o), Anthropic (Claude), Google (Gemini), Mistral, xAI (Grok), DeepSeek, Groq, and open-source models via Ollama. You choose the model per agent or block.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is included in the Free plan?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Free plan gives you up to 3 active workflows, 1,000 execution credits per month, 5GB file storage, and 3 knowledge tables. No credit card required.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I connect my existing tools?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Neato_Pilot supports 190+ integrations including Slack, Gmail, Notion, HubSpot, Salesforce, GitHub, Google Workspace, Supabase, and many more. You can also use the HTTP block or webhooks to connect any API.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I deploy a workflow?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Every workflow can be deployed with one click as an API endpoint, chat interface, web form, MCP server, or scheduled task. You get a unique URL and can generate API keys for authentication.',
            },
          },
        ],
      },
    ],
  }

  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
