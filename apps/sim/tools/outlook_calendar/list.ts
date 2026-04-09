import {
  OUTLOOK_CALENDAR_API_BASE,
  type OutlookCalendarCleanEvent,
  type OutlookCalendarEvent,
  type OutlookCalendarListApiResponse,
  type OutlookCalendarListParams,
  type OutlookCalendarListResponse,
} from '@/tools/outlook_calendar/types'
import type { ToolConfig } from '@/tools/types'

export const outlookCalendarListTool: ToolConfig<
  OutlookCalendarListParams,
  OutlookCalendarListResponse
> = {
  id: 'outlook_calendar_list',
  name: 'Outlook Calendar List Events',
  description: 'List calendar events from Outlook Calendar within a date range',
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
    startDateTime: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'Start of the date range (ISO 8601, e.g., 2025-06-03T00:00:00Z)',
    },
    endDateTime: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'End of the date range (ISO 8601, e.g., 2025-06-10T00:00:00Z)',
    },
    maxResults: {
      type: 'number',
      required: false,
      visibility: 'hidden',
      description: 'Maximum number of events to return (default: 50)',
    },
  },

  request: {
    url: (params: OutlookCalendarListParams) => {
      const top = params.maxResults ?? 50
      const query = new URLSearchParams({
        startDateTime: params.startDateTime,
        endDateTime: params.endDateTime,
        $orderby: 'start/dateTime',
        $top: String(top),
      })
      return `${OUTLOOK_CALENDAR_API_BASE}/me/calendarview?${query.toString()}`
    },
    method: 'GET',
    headers: (params: OutlookCalendarListParams) => ({
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'outlook.timezone="UTC"',
    }),
  },

  transformResponse: async (response: Response) => {
    const data: OutlookCalendarListApiResponse = await response.json()
    const rawEvents = data.value || []

    const events: OutlookCalendarCleanEvent[] = rawEvents.map((event: OutlookCalendarEvent) => ({
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
    }))

    return {
      success: true,
      output: {
        events,
        count: events.length,
      },
    }
  },

  outputs: {
    events: { type: 'json', description: 'List of calendar events' },
    count: { type: 'number', description: 'Number of events returned' },
  },
}
