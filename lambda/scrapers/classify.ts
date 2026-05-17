/**
 * Keyword-based industry classification for companies
 * Uses company name, role title, and description to infer industry + emoji
 */

interface IndustryRule {
  industry: string
  emoji: string
  companyKeywords: string[]
  roleKeywords: string[]
  descriptionKeywords: string[]
}

const rules: IndustryRule[] = [
  {
    industry: 'AI/ML', emoji: '🤖',
    companyKeywords: ['ai', 'deepmind', 'anthropic', 'openai', 'cohere', 'hugging', 'stability', 'mistral', 'perplexity', 'inflection', 'character'],
    roleKeywords: ['machine learning', 'ml engineer', 'nlp', 'deep learning', 'computer vision', 'ai engineer', 'ai research', 'data scientist', 'llm'],
    descriptionKeywords: ['artificial intelligence', 'machine learning', 'neural network', 'large language model', 'generative ai'],
  },
  {
    industry: 'Fintech', emoji: '💳',
    companyKeywords: ['stripe', 'monzo', 'revolut', 'wise', 'plaid', 'starling', 'brex', 'ramp', 'mercury', 'chime', 'klarna', 'affirm', 'checkout', 'adyen', 'rapyd', 'nuvei', 'marqeta', 'unit', 'modern treasury', 'column', 'lithic', 'treasury prime', 'abound', 'bank', 'pay', 'credit', 'fintech', 'fundera'],
    roleKeywords: ['payments', 'banking', 'financial', 'lending', 'credit', 'treasury'],
    descriptionKeywords: ['financial', 'banking', 'payment', 'fintech', 'money transfer', 'lending', 'credit card', 'neobank'],
  },
  {
    industry: 'HealthTech', emoji: '🏥',
    companyKeywords: ['health', 'med', 'pharma', 'care', 'clinic', 'therapy', 'huma', 'elvie', 'babylon', 'headway', 'cerebral', 'hims', 'neko health', 'wellhub'],
    roleKeywords: ['clinical', 'healthcare', 'medical', 'patient', 'health care', 'biotech', 'pharma'],
    descriptionKeywords: ['healthcare', 'medical', 'patient', 'clinical', 'health', 'biotech', 'pharmaceutical', 'telemedicine'],
  },
  {
    industry: 'DevTools', emoji: '⚙️',
    companyKeywords: ['vercel', 'gitlab', 'supabase', 'posthog', 'linear', 'netlify', 'railway', 'fly.io', 'render', 'docker', 'hashicorp', 'datadog', 'grafana', 'sentry', 'launchdarkly', 'postman', 'ngrok', 'retool', 'appsmith', 'checkly', 'buildkite'],
    roleKeywords: ['devops', 'platform engineer', 'developer experience', 'dx engineer', 'sdk engineer', 'developer advocate', 'developer relations'],
    descriptionKeywords: ['developer tools', 'devops', 'infrastructure', 'developer platform', 'developer experience', 'open source'],
  },
  {
    industry: 'Cybersecurity', emoji: '🔒',
    companyKeywords: ['snyk', 'darktrace', 'tessian', 'crowdstrike', 'palo alto', 'sentinelone', 'lacework', 'orca', 'wiz', 'security'],
    roleKeywords: ['security engineer', 'threat', 'vulnerability', 'penetration', 'infosec', 'cybersecurity', 'soc analyst', 'devsecops'],
    descriptionKeywords: ['cybersecurity', 'security', 'threat detection', 'vulnerability'],
  },
  {
    industry: 'E-commerce', emoji: '🛒',
    companyKeywords: ['shopify', 'depop', 'vinted', 'etsy', 'faire', 'bolt', 'bigcommerce', 'saleor', 'medusa', 'commercetools', 'ollie'],
    roleKeywords: ['e-commerce', 'ecommerce', 'marketplace', 'merchant', 'storefront', 'retail'],
    descriptionKeywords: ['e-commerce', 'marketplace', 'shopping', 'retail', 'commerce'],
  },
  {
    industry: 'SaaS', emoji: '☁️',
    companyKeywords: ['notion', 'loom', 'canva', 'airtable', 'monday', 'asana', 'clickup', 'miro', 'amplitude', 'mixpanel', 'segment', 'twilio', 'contentful', 'sanity', 'hubspot', 'salesforce', 'zendesk', 'intercom', 'freshworks', 'typeform', 'uipath', 'synthesia', 'airalo', 'rossum', 'agentio', 'merchkit'],
    roleKeywords: [],
    descriptionKeywords: ['saas', 'software as a service', 'collaboration', 'productivity'],
  },
  {
    industry: 'Logistics', emoji: '📦',
    companyKeywords: ['deliveroo', 'gopuff', 'getir', 'gorillas', 'doordash', 'instacart', 'flexport', 'shipbob', 'zipline', 'project44'],
    roleKeywords: ['logistics', 'supply chain', 'delivery', 'warehouse', 'fulfillment', 'shipping'],
    descriptionKeywords: ['delivery', 'logistics', 'supply chain', 'shipping', 'fulfillment'],
  },
  {
    industry: 'Energy', emoji: '⚡',
    companyKeywords: ['octopus', 'bulb', 'climeworks', 'enpal', 'sunrun', 'mainspring'],
    roleKeywords: ['energy', 'solar', 'renewable', 'grid', 'sustainability', 'power electronics'],
    descriptionKeywords: ['energy', 'renewable', 'solar', 'carbon', 'sustainability', 'climate'],
  },
  {
    industry: 'Defence', emoji: '🛡️',
    companyKeywords: ['anduril', 'hermeus', 'palantir', 'shield ai', 'rebellion', 'federal'],
    roleKeywords: ['defense', 'defence', 'military', 'mission'],
    descriptionKeywords: ['defense', 'defence', 'military', 'national security'],
  },
  {
    industry: 'Data', emoji: '📊',
    companyKeywords: ['databricks', 'snowflake', 'dbt', 'fivetran', 'airbyte', 'contentsquare', 'new relic', 'elastic', 'confluent', 'clickhouse', 'motherduck', 'perspectives', 'alphasense'],
    roleKeywords: ['data engineer', 'data analyst', 'data platform', 'analytics', 'data science'],
    descriptionKeywords: ['data analytics', 'data platform', 'data warehouse', 'business intelligence'],
  },
  {
    industry: 'Robotics', emoji: '🦾',
    companyKeywords: ['wayve', 'cruise', 'aurora', 'nuro', 'boston dynamics', 'agility', 'vay'],
    roleKeywords: ['robotics', 'autonomous', 'perception', 'lidar', 'slam', 'motion planning'],
    descriptionKeywords: ['autonomous', 'self-driving', 'robotics', 'robot'],
  },
  {
    industry: 'Gaming', emoji: '🎮',
    companyKeywords: ['improbable', 'epic', 'unity', 'roblox', 'riot', 'supercell'],
    roleKeywords: ['game', 'gaming', 'unreal', 'unity3d'],
    descriptionKeywords: ['gaming', 'game', 'metaverse', 'virtual world'],
  },
  {
    industry: 'Blockchain', emoji: '⛓️',
    companyKeywords: ['chainlink', 'alchemy', 'consensys', 'polygon', 'arbitrum', 'uniswap', 'aave', 'circle', 'fireblocks', 'trm labs'],
    roleKeywords: ['solidity', 'blockchain', 'web3', 'smart contract', 'crypto', 'defi'],
    descriptionKeywords: ['blockchain', 'crypto', 'web3', 'decentralized', 'smart contract'],
  },
  {
    industry: 'Space', emoji: '🚀',
    companyKeywords: ['spacex', 'satellite vu', 'planet', 'rocket lab', 'relativity', 'astra'],
    roleKeywords: ['satellite', 'spacecraft', 'orbital', 'launch vehicle', 'propulsion'],
    descriptionKeywords: ['space', 'satellite', 'aerospace', 'rocket'],
  },
  {
    industry: 'HR', emoji: '👥',
    companyKeywords: ['beamery', 'rippling', 'deel', 'remote.com', 'oyster', 'lattice', 'personio', 'hibob', 'multiverse', 'zinc'],
    roleKeywords: ['talent acquisition', 'recruiting', 'people ops', 'human resources'],
    descriptionKeywords: ['hr tech', 'talent', 'recruiting', 'human resources', 'workforce'],
  },
  {
    industry: 'Cloud', emoji: '🌐',
    companyKeywords: ['cloudflare', 'fastly', 'akamai', 'fluidstack'],
    roleKeywords: ['cloud engineer', 'cloud architect', 'infrastructure', 'data center'],
    descriptionKeywords: ['cloud infrastructure', 'cloud computing', 'cdn', 'edge computing', 'data center'],
  },
  {
    industry: 'Marketing', emoji: '📣',
    companyKeywords: ['hubspot', 'mailchimp', 'braze', 'iterable', 'customer.io', 'klaviyo', 'attentive'],
    roleKeywords: ['marketing', 'growth', 'seo', 'content marketing', 'demand gen', 'brand'],
    descriptionKeywords: ['marketing platform', 'marketing automation', 'advertising'],
  },
  {
    industry: 'Design', emoji: '🎨',
    companyKeywords: ['figma', 'framer', 'webflow', 'spline'],
    roleKeywords: ['product designer', 'ux designer', 'design engineer', 'ui designer', 'ux researcher'],
    descriptionKeywords: ['design tool', 'creative platform', 'design software'],
  },
  {
    industry: 'Real Estate', emoji: '🏠',
    companyKeywords: ['opendoor', 'compass', 'loft', 'pacaso', 'divvy', 'arrived'],
    roleKeywords: ['real estate', 'property', 'mortgage'],
    descriptionKeywords: ['real estate', 'property', 'proptech', 'housing'],
  },
  {
    industry: 'Travel', emoji: '✈️',
    companyKeywords: ['hopper', 'kiwi', 'skyscanner', 'airbnb', 'booking'],
    roleKeywords: ['travel', 'hospitality', 'booking'],
    descriptionKeywords: ['travel', 'booking', 'hospitality', 'hotel', 'flight'],
  },
]

export function classifyIndustry(companyName: string, roleTitle: string = '', description: string = ''): { industry: string, emoji: string } {
  const companyLower = companyName.toLowerCase()
  const roleLower = roleTitle.toLowerCase()
  const descLower = description.toLowerCase()

  let bestMatch = { industry: 'Tech', emoji: '💻', score: 0 }

  for (const rule of rules) {
    let score = 0

    for (const kw of rule.companyKeywords) {
      if (companyLower.includes(kw)) { score += 10; break }
    }

    for (const kw of rule.roleKeywords) {
      if (roleLower.includes(kw)) { score += 5; break }
    }

    for (const kw of rule.descriptionKeywords) {
      if (descLower.includes(kw)) { score += 3; break }
    }

    if (score > bestMatch.score) {
      bestMatch = { industry: rule.industry, emoji: rule.emoji, score }
    }
  }

  return { industry: bestMatch.industry, emoji: bestMatch.emoji }
}
