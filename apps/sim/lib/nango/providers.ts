/**
 * Maps Sim provider IDs to Nango providerConfigKeys (Integration IDs).
 *
 * The providerConfigKey is the Integration ID you create in your Nango dashboard.
 * By convention, use the same string as Sim's providerId so the mapping is 1:1.
 *
 * To add a new integration:
 * 1. Create an integration in Nango dashboard with ID matching the Sim provider ID
 * 2. Add the entry here
 */
export const SIM_TO_NANGO_PROVIDER: Record<string, string> = {
  // Google
  'google-email': 'google-email',
  'google-drive': 'google-drive',
  'google-sheets': 'google-sheets',
  'google-docs': 'google-docs',
  'google-calendar': 'google-calendar',
  'google-contacts': 'google-contacts',
  'google-forms': 'google-forms',
  'google-groups': 'google-groups',
  'google-meet': 'google-meet',
  'google-slides': 'google-slides',
  'google-tasks': 'google-tasks',
  'google-bigquery': 'google-bigquery',
  'google-ads': 'google-ads',
  'google-vault': 'google-vault',

  // Microsoft
  outlook: 'outlook',
  onedrive: 'onedrive',
  sharepoint: 'sharepoint',
  'microsoft-teams': 'microsoft-teams',
  'microsoft-excel': 'microsoft-excel',
  'microsoft-planner': 'microsoft-planner',
  'microsoft-ad': 'microsoft-ad',
  'microsoft-dataverse': 'microsoft-dataverse',

  // Productivity
  slack: 'slack',
  notion: 'notion',
  asana: 'asana',
  linear: 'linear',
  jira: 'jira',
  confluence: 'confluence',
  'jira-service-management': 'jira-service-management',
  trello: 'trello',
  airtable: 'airtable',

  // CRM / Sales
  hubspot: 'hubspot',
  salesforce: 'salesforce',
  pipedrive: 'pipedrive',
  attio: 'attio',
  wealthbox: 'wealthbox',

  // Storage / Files
  'google-drive-default': 'google-drive-default',
  dropbox: 'dropbox',
  box: 'box',

  // Dev / Code
  github: 'github',

  // Analytics
  posthog: 'posthog',

  // Social
  linkedin: 'linkedin',
  reddit: 'reddit',
  x: 'x',
  spotify: 'spotify',
  wordpress: 'wordpress',
  webflow: 'webflow',
  shopify: 'shopify',

  // Communication / Productivity
  zoom: 'zoom',
  docusign: 'docusign',
  calcom: 'calcom',
}

/**
 * Returns the Nango providerConfigKey for a given Sim provider ID.
 * Falls back to the providerId itself if not explicitly mapped.
 */
export function getNangoProviderConfigKey(providerId: string): string {
  return SIM_TO_NANGO_PROVIDER[providerId] ?? providerId
}

/**
 * Providers that use API key auth instead of OAuth.
 * These require a custom key-input form rather than a browser OAuth popup.
 */
export const API_KEY_PROVIDERS = new Set(['posthog'])

/**
 * OAuth scope overrides passed to Nango when creating a connect session.
 * When present, these replace the scopes configured in the Nango dashboard.
 *
 * Add an entry here when a provider requires specific scopes that are not
 * configured in the Nango dashboard (e.g., calendar scopes for Outlook).
 */
export const PROVIDER_SCOPE_OVERRIDES: Record<string, string[]> = {
  outlook: [
    'openid',
    'profile',
    'email',
    'Mail.ReadWrite',
    'Mail.ReadBasic',
    'Mail.Read',
    'Mail.Send',
    'Calendars.Read',
    'Calendars.ReadWrite',
    'offline_access',
  ],
}
