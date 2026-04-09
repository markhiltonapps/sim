import {
  OUTLOOK_CALENDAR_API_BASE,
  type OutlookCalendarCleanEvent,
  type OutlookCalendarEvent,
  type OutlookCalendarUpdateParams,
  type OutlookCalendarUpdateResponse,
} from '@/tools/outlook_calendar/types'
import type { ToolConfig } from '@/tools/types'

export const outlookCalendarUpdateTool: ToolConfig<
  OutlookCalendarUpdateParams,
  OutlookCalendarUpdateResponse
> = {
  id: 'outlook_calendar_update',
  name: 'Outlook Calendar Update Event',
  description: 'Update an existing calendar event in Outlook Calendar',
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
    eventId: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'The ID of the calendar event to update',
    },
    subject: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'New event subject / title',
    },
    start: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'New event start time (ISO 8601)',
    },
    end: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'New event end time (ISO 8601)',
    },
    timeZone: {
      type: 'string',
      required: false,
      visibility: 'hidden',
      description: 'IANA time zone name for start/end (default: UTC)',
    },
    body: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'New event body / description',
    },
    location: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'New event location',
    },
  },

  request: {
    url: (params: OutlookCalendarUpdateParams) =>
      `${OUTLOOK_CALENDAR_API_BASE}/me/events/${encodeURIComponent(params.eventId)}`,
    method: 'PATCH',
    headers: (params: OutlookCalendarUpdateParams) => ({
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    }),
    body: (params: OutlookCalendarUpdateParams) => {
      const tz = params.timeZone || 'UTC'
      const patch: Record<string, unknown> = {}

      if (params.subject !== undefined) patch.subject = params.subject
      if (params.start !== undefined) patch.start = { dateTime: params.start, timeZone: tz }
      if (params.end !== undefined) patch.end = { dateTime: params.end, timeZone: tz }
      if (params.body !== undefined) patch.body = { contentType: 'text', content: params.body }
      if (params.location !== undefined) patch.location = { displayName: params.location }

      return patch
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
    event: { type: 'json', description: 'The updated calendar event' },
  },
}
