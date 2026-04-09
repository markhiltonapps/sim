import {
  OUTLOOK_CALENDAR_API_BASE,
  type OutlookCalendarDeleteParams,
  type OutlookCalendarDeleteResponse,
} from '@/tools/outlook_calendar/types'
import type { ToolConfig } from '@/tools/types'

export const outlookCalendarDeleteTool: ToolConfig<
  OutlookCalendarDeleteParams,
  OutlookCalendarDeleteResponse
> = {
  id: 'outlook_calendar_delete',
  name: 'Outlook Calendar Delete Event',
  description: 'Delete a calendar event from Outlook Calendar',
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
      description: 'The ID of the calendar event to delete',
    },
  },

  request: {
    url: (params: OutlookCalendarDeleteParams) =>
      `${OUTLOOK_CALENDAR_API_BASE}/me/events/${encodeURIComponent(params.eventId)}`,
    method: 'DELETE',
    headers: (params: OutlookCalendarDeleteParams) => ({
      Authorization: `Bearer ${params.accessToken}`,
    }),
  },

  transformResponse: async (_response: Response, params?: OutlookCalendarDeleteParams) => {
    // DELETE returns 204 No Content on success
    return {
      success: true,
      output: {
        deleted: true,
        eventId: params?.eventId ?? '',
      },
    }
  },

  outputs: {
    deleted: { type: 'boolean', description: 'Whether the event was successfully deleted' },
    eventId: { type: 'string', description: 'The ID of the deleted event' },
  },
}
