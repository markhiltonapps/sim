import {
  OUTLOOK_CALENDAR_API_BASE,
  type OutlookCalendarCleanEvent,
  type OutlookCalendarCreateParams,
  type OutlookCalendarCreateResponse,
  type OutlookCalendarEvent,
} from '@/tools/outlook_calendar/types'
import type { ToolConfig } from '@/tools/types'

export const outlookCalendarCreateTool: ToolConfig<
  OutlookCalendarCreateParams,
  OutlookCalendarCreateResponse
> = {
  id: 'outlook_calendar_create',
  name: 'Outlook Calendar Create Event',
  description: 'Create a new calendar event in Outlook Calendar',
  version: '1.0.0',

  oauth: {
    required: true,
    provider: 'outlook',
  },

  params: {
    accessToken: {
      type: 'string',
      required: true,
      visibility: 'hidden',
      description: 'OAuth access token for Microsoft Graph API',
    },
    subject: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'Event subject / title',
    },
    start: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'Event start time (ISO 8601, e.g., 2025-06-03T10:00:00)',
    },
    end: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'Event end time (ISO 8601, e.g., 2025-06-03T11:00:00)',
    },
    timeZone: {
      type: 'string',
      required: false,
      visibility: 'hidden',
      description: 'IANA time zone name (default: UTC)',
    },
    body: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'Event body / description',
    },
    location: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'Event location',
    },
    attendees: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'Comma-separated attendee email addresses',
    },
  },

  request: {
    url: `${OUTLOOK_CALENDAR_API_BASE}/me/calendar/events`,
    method: 'POST',
    headers: (params: OutlookCalendarCreateParams) => ({
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    }),
    body: (params: OutlookCalendarCreateParams) => {
      const tz = params.timeZone || 'UTC'

      const attendeeList =
        params.attendees && params.attendees.trim().length > 0
          ? params.attendees
              .split(',')
              .map((e) => e.trim())
              .filter((e) => e.length > 0)
              .map((email) => ({
                emailAddress: { address: email },
                type: 'required',
              }))
          : undefined

      return {
        subject: params.subject,
        start: { dateTime: params.start, timeZone: tz },
        end: { dateTime: params.end, timeZone: tz },
        ...(params.body ? { body: { contentType: 'text', content: params.body } } : {}),
        ...(params.location ? { location: { displayName: params.location } } : {}),
        ...(attendeeList ? { attendees: attendeeList } : {}),
      }
    },
  },

  transformResponse: async (response: Response) => {
    const event: OutlookCalendarEvent = await response.json()

    const cleanEvent: OutlookCalendarCleanEvent = {
      id: event.id,
      subject: event.subject ?? null,
      bodyPreview: event.bodyPreview ?? null,
      start: event.start,
      end: event.end,
      location: event.location?.displayName ?? null,
      attendees: (event.attendees ?? []).map((a) => ({
        address: a.emailAddress.address,
        name: a.emailAddress.name ?? null,
        type: a.type ?? null,
      })),
      organizer: event.organizer
        ? {
            address: event.organizer.emailAddress.address,
            name: event.organizer.emailAddress.name ?? null,
          }
        : null,
      isAllDay: event.isAllDay ?? false,
      isCancelled: event.isCancelled ?? false,
      webLink: event.webLink ?? null,
      importance: event.importance ?? null,
    }

    return {
      success: true,
      output: {
        event: cleanEvent,
      },
    }
  },

  outputs: {
    event: { type: 'json', description: 'The created calendar event' },
  },
}
