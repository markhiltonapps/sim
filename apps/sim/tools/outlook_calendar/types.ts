import type { ToolResponse } from '@/tools/types'

export const OUTLOOK_CALENDAR_API_BASE = 'https://graph.microsoft.com/v1.0'

/** Microsoft Graph email address object */
export interface OutlookCalendarEmailAddress {
  address: string
  name?: string
}

/** Microsoft Graph date/time object */
export interface OutlookCalendarDateTime {
  dateTime: string
  timeZone: string
}

/** Microsoft Graph event location */
export interface OutlookCalendarLocation {
  displayName?: string
}

/** Microsoft Graph attendee */
export interface OutlookCalendarAttendee {
  emailAddress: OutlookCalendarEmailAddress
  type?: 'required' | 'optional' | 'resource'
}

/** Microsoft Graph calendar event as returned by the API */
export interface OutlookCalendarEvent {
  id: string
  subject?: string
  bodyPreview?: string
  start: OutlookCalendarDateTime
  end: OutlookCalendarDateTime
  location?: OutlookCalendarLocation
  attendees?: OutlookCalendarAttendee[]
  organizer?: { emailAddress: OutlookCalendarEmailAddress }
  isAllDay?: boolean
  isCancelled?: boolean
  webLink?: string
  recurrence?: unknown
  importance?: string
  sensitivity?: string
}

/** Microsoft Graph calendarView response envelope */
export interface OutlookCalendarListApiResponse {
  '@odata.context'?: string
  '@odata.nextLink'?: string
  value: OutlookCalendarEvent[]
}

/** Cleaned event shape returned in tool output */
export interface OutlookCalendarCleanEvent {
  id: string
  subject: string | null
  bodyPreview: string | null
  start: OutlookCalendarDateTime
  end: OutlookCalendarDateTime
  location: string | null
  attendees: Array<{
    address: string
    name: string | null
    type: string | null
  }>
  organizer: {
    address: string
    name: string | null
  } | null
  isAllDay: boolean
  isCancelled: boolean
  webLink: string | null
  importance: string | null
}

// ─── List ───────────────────────────────────────────────────────────────────

export interface OutlookCalendarListParams {
  accessToken: string
  startDateTime: string
  endDateTime: string
  maxResults?: number
}

export interface OutlookCalendarListResponse extends ToolResponse {
  output: {
    events: OutlookCalendarCleanEvent[]
    count: number
  }
}

// ─── Create ─────────────────────────────────────────────────────────────────

export interface OutlookCalendarCreateParams {
  accessToken: string
  subject: string
  start: string
  end: string
  timeZone?: string
  body?: string
  location?: string
  attendees?: string
}

export interface OutlookCalendarCreateResponse extends ToolResponse {
  output: {
    event: OutlookCalendarCleanEvent
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export interface OutlookCalendarUpdateParams {
  accessToken: string
  eventId: string
  subject?: string
  start?: string
  end?: string
  timeZone?: string
  body?: string
  location?: string
}

export interface OutlookCalendarUpdateResponse extends ToolResponse {
  output: {
    event: OutlookCalendarCleanEvent
  }
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export interface OutlookCalendarDeleteParams {
  accessToken: string
  eventId: string
}

export interface OutlookCalendarDeleteResponse extends ToolResponse {
  output: {
    deleted: boolean
    eventId: string
  }
}

export type OutlookCalendarResponse =
  | OutlookCalendarListResponse
  | OutlookCalendarCreateResponse
  | OutlookCalendarUpdateResponse
  | OutlookCalendarDeleteResponse
