import { OutlookIcon } from '@/components/icons'
import { getScopesForService } from '@/lib/oauth/utils'
import type { BlockConfig } from '@/blocks/types'
import { AuthMode, IntegrationType } from '@/blocks/types'
import type { OutlookCalendarResponse } from '@/tools/outlook_calendar/types'

export const OutlookCalendarBlock: BlockConfig<OutlookCalendarResponse> = {
  type: 'outlook_calendar',
  name: 'Outlook Calendar',
  description: 'List, create, update, and delete Outlook Calendar events',
  authMode: AuthMode.OAuth,
  longDescription:
    'Integrate Outlook Calendar into the workflow. Can list, create, update, and delete calendar events using the Microsoft Graph API.',
  docsLink: 'https://docs.sim.ai/tools/outlook_calendar',
  category: 'tools',
  integrationType: IntegrationType.Productivity,
  tags: ['calendar', 'scheduling', 'microsoft-365'],
  bgColor: '#0078D4',
  icon: OutlookIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'List Events', id: 'list_outlook_calendar' },
        { label: 'Create Event', id: 'create_outlook_calendar' },
        { label: 'Update Event', id: 'update_outlook_calendar' },
        { label: 'Delete Event', id: 'delete_outlook_calendar' },
      ],
      value: () => 'list_outlook_calendar',
    },
    {
      id: 'credential',
      title: 'Microsoft Account',
      type: 'oauth-input',
      canonicalParamId: 'oauthCredential',
      mode: 'basic',
      serviceId: 'outlook',
      requiredScopes: getScopesForService('outlook'),
      placeholder: 'Select Microsoft account',
      required: true,
    },
    {
      id: 'manualCredential',
      title: 'Microsoft Account',
      type: 'short-input',
      canonicalParamId: 'oauthCredential',
      mode: 'advanced',
      placeholder: 'Enter credential ID',
      required: true,
    },

    // ─── List Events ────────────────────────────────────────────────────────
    {
      id: 'startDateTime',
      title: 'Start Date & Time',
      type: 'short-input',
      placeholder: '2025-06-03T00:00:00Z',
      condition: { field: 'operation', value: 'list_outlook_calendar' },
      required: { field: 'operation', value: 'list_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate an ISO 8601 timestamp in UTC based on the user's description.
The timestamp should be in the format: YYYY-MM-DDTHH:MM:SSZ (UTC timezone).
Examples:
- "today" -> Calculate today's date at 00:00:00Z
- "yesterday" -> Calculate yesterday's date at 00:00:00Z
- "last week" -> Calculate 7 days ago at 00:00:00Z

Return ONLY the timestamp string - no explanations, no quotes, no extra text.`,
        placeholder: 'Describe the start of the date range (e.g., "today", "last week")...',
        generationType: 'timestamp',
      },
    },
    {
      id: 'endDateTime',
      title: 'End Date & Time',
      type: 'short-input',
      placeholder: '2025-06-10T00:00:00Z',
      condition: { field: 'operation', value: 'list_outlook_calendar' },
      required: { field: 'operation', value: 'list_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate an ISO 8601 timestamp in UTC based on the user's description.
The timestamp should be in the format: YYYY-MM-DDTHH:MM:SSZ (UTC timezone).
Examples:
- "tomorrow" -> Calculate tomorrow's date at 00:00:00Z
- "end of this week" -> Calculate 7 days from now at 00:00:00Z

Return ONLY the timestamp string - no explanations, no quotes, no extra text.`,
        placeholder: 'Describe the end of the date range (e.g., "next week", "end of this month")...',
        generationType: 'timestamp',
      },
    },

    // ─── Create Event ────────────────────────────────────────────────────────
    {
      id: 'subject',
      title: 'Event Title',
      type: 'short-input',
      placeholder: 'Team meeting',
      condition: { field: 'operation', value: 'create_outlook_calendar' },
      required: { field: 'operation', value: 'create_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate a clear, concise calendar event title based on the user's request.

Return ONLY the event title - no explanations, no extra text.`,
        placeholder: 'Describe the event...',
      },
    },
    {
      id: 'createStart',
      title: 'Start Date & Time',
      type: 'short-input',
      placeholder: '2025-06-03T10:00:00',
      condition: { field: 'operation', value: 'create_outlook_calendar' },
      required: { field: 'operation', value: 'create_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate an ISO 8601 timestamp based on the user's description.
Format: YYYY-MM-DDTHH:MM:SS
Examples:
- "tomorrow at 2pm" -> Calculate tomorrow's date at 14:00:00
- "next Monday at 9am" -> Calculate next Monday at 09:00:00

Return ONLY the timestamp string - no explanations, no quotes, no extra text.`,
        placeholder: 'Describe the start time (e.g., "tomorrow at 2pm")...',
        generationType: 'timestamp',
      },
    },
    {
      id: 'createEnd',
      title: 'End Date & Time',
      type: 'short-input',
      placeholder: '2025-06-03T11:00:00',
      condition: { field: 'operation', value: 'create_outlook_calendar' },
      required: { field: 'operation', value: 'create_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate an ISO 8601 timestamp based on the user's description.
Format: YYYY-MM-DDTHH:MM:SS
Examples:
- "tomorrow at 3pm" -> Calculate tomorrow's date at 15:00:00
- "1 hour after start" -> Calculate start time + 1 hour

Return ONLY the timestamp string - no explanations, no quotes, no extra text.`,
        placeholder: 'Describe the end time (e.g., "1 hour after start")...',
        generationType: 'timestamp',
      },
    },
    {
      id: 'createBody',
      title: 'Description',
      type: 'long-input',
      placeholder: 'Event description or agenda',
      condition: { field: 'operation', value: 'create_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate a helpful calendar event description based on the user's request.
Include relevant details like purpose, agenda, or notes.

Return ONLY the description - no explanations, no extra text.`,
        placeholder: 'Describe the event details...',
      },
    },
    {
      id: 'createLocation',
      title: 'Location',
      type: 'short-input',
      placeholder: 'Conference Room A or https://meet.example.com',
      condition: { field: 'operation', value: 'create_outlook_calendar' },
    },
    {
      id: 'createAttendees',
      title: 'Attendees (comma-separated emails)',
      type: 'short-input',
      placeholder: 'john@example.com, jane@example.com',
      condition: { field: 'operation', value: 'create_outlook_calendar' },
    },

    // ─── Update Event ────────────────────────────────────────────────────────
    {
      id: 'updateEventId',
      title: 'Event ID',
      type: 'short-input',
      placeholder: 'Event ID to update',
      condition: { field: 'operation', value: 'update_outlook_calendar' },
      required: { field: 'operation', value: 'update_outlook_calendar' },
    },
    {
      id: 'updateSubject',
      title: 'New Event Title',
      type: 'short-input',
      placeholder: 'Updated event title',
      condition: { field: 'operation', value: 'update_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate a clear, concise calendar event title based on the user's request.

Return ONLY the event title - no explanations, no extra text.`,
        placeholder: 'Describe the new event title...',
      },
    },
    {
      id: 'updateStart',
      title: 'New Start Date & Time',
      type: 'short-input',
      placeholder: '2025-06-03T10:00:00',
      condition: { field: 'operation', value: 'update_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate an ISO 8601 timestamp based on the user's description.
Format: YYYY-MM-DDTHH:MM:SS
Return ONLY the timestamp string - no explanations, no quotes, no extra text.`,
        placeholder: 'Describe the new start time...',
        generationType: 'timestamp',
      },
    },
    {
      id: 'updateEnd',
      title: 'New End Date & Time',
      type: 'short-input',
      placeholder: '2025-06-03T11:00:00',
      condition: { field: 'operation', value: 'update_outlook_calendar' },
      wandConfig: {
        enabled: true,
        prompt: `Generate an ISO 8601 timestamp based on the user's description.
Format: YYYY-MM-DDTHH:MM:SS
Return ONLY the timestamp string - no explanations, no quotes, no extra text.`,
        placeholder: 'Describe the new end time...',
        generationType: 'timestamp',
      },
    },
    {
      id: 'updateBody',
      title: 'New Description',
      type: 'long-input',
      placeholder: 'Updated event description',
      condition: { field: 'operation', value: 'update_outlook_calendar' },
    },
    {
      id: 'updateLocation',
      title: 'New Location',
      type: 'short-input',
      placeholder: 'Updated location',
      condition: { field: 'operation', value: 'update_outlook_calendar' },
    },

    // ─── Delete Event ────────────────────────────────────────────────────────
    {
      id: 'deleteEventId',
      title: 'Event ID',
      type: 'short-input',
      placeholder: 'Event ID to delete',
      condition: { field: 'operation', value: 'delete_outlook_calendar' },
      required: { field: 'operation', value: 'delete_outlook_calendar' },
    },
  ],

  tools: {
    access: [
      'outlook_calendar_list',
      'outlook_calendar_create',
      'outlook_calendar_update',
      'outlook_calendar_delete',
    ],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'list_outlook_calendar':
            return 'outlook_calendar_list'
          case 'create_outlook_calendar':
            return 'outlook_calendar_create'
          case 'update_outlook_calendar':
            return 'outlook_calendar_update'
          case 'delete_outlook_calendar':
            return 'outlook_calendar_delete'
          default:
            throw new Error(`Invalid Outlook Calendar operation: ${params.operation}`)
        }
      },
      params: (params) => {
        const { oauthCredential, operation, ...rest } = params

        switch (operation) {
          case 'list_outlook_calendar':
            return {
              oauthCredential,
              startDateTime: rest.startDateTime,
              endDateTime: rest.endDateTime,
            }
          case 'create_outlook_calendar':
            return {
              oauthCredential,
              subject: rest.subject,
              start: rest.createStart,
              end: rest.createEnd,
              body: rest.createBody,
              location: rest.createLocation,
              attendees: rest.createAttendees,
            }
          case 'update_outlook_calendar':
            return {
              oauthCredential,
              eventId: rest.updateEventId,
              subject: rest.updateSubject,
              start: rest.updateStart,
              end: rest.updateEnd,
              body: rest.updateBody,
              location: rest.updateLocation,
            }
          case 'delete_outlook_calendar':
            return {
              oauthCredential,
              eventId: rest.deleteEventId,
            }
          default:
            return { oauthCredential, ...rest }
        }
      },
    },
  },

  inputs: {
    operation: { type: 'string', description: 'Operation to perform' },
    oauthCredential: { type: 'string', description: 'Outlook OAuth access token' },
    // List inputs
    startDateTime: { type: 'string', description: 'Start of the date range for listing events' },
    endDateTime: { type: 'string', description: 'End of the date range for listing events' },
    // Create inputs
    subject: { type: 'string', description: 'Event title' },
    createStart: { type: 'string', description: 'Event start time' },
    createEnd: { type: 'string', description: 'Event end time' },
    createBody: { type: 'string', description: 'Event description' },
    createLocation: { type: 'string', description: 'Event location' },
    createAttendees: { type: 'string', description: 'Comma-separated attendee emails' },
    // Update inputs
    updateEventId: { type: 'string', description: 'ID of the event to update' },
    updateSubject: { type: 'string', description: 'New event title' },
    updateStart: { type: 'string', description: 'New event start time' },
    updateEnd: { type: 'string', description: 'New event end time' },
    updateBody: { type: 'string', description: 'New event description' },
    updateLocation: { type: 'string', description: 'New event location' },
    // Delete inputs
    deleteEventId: { type: 'string', description: 'ID of the event to delete' },
  },

  outputs: {
    // List outputs
    events: { type: 'json', description: 'List of calendar events (list operation)' },
    count: { type: 'number', description: 'Number of events returned (list operation)' },
    // Create / update outputs
    event: { type: 'json', description: 'The created or updated calendar event' },
    // Delete outputs
    deleted: { type: 'boolean', description: 'Whether the event was successfully deleted' },
    eventId: { type: 'string', description: 'ID of the deleted event' },
  },
}
