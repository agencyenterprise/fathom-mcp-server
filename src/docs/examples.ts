export const searchMeetingsRequestExample = {
  query: "weekly standup",
  calendar_invitees_domains: ["acme.com", "partner.io"],
  calendar_invitees_domains_type: "all",
  created_after: "2024-01-01T00:00:00Z",
  created_before: "2024-12-31T23:59:59Z",
  cursor: "abc123",
  include_action_items: true,
  include_crm_matches: false,
  recorded_by: ["john@company.com", "jane@company.com"],
  teams: ["Engineering", "Sales"],
};

export const searchMeetingsResponseExample = {
  items: [
    {
      title: "Weekly Standup - Engineering",
      meeting_title: "Weekly Standup",
      recording_id: 12345678,
      url: "https://fathom.video/recordings/12345678",
      share_url: "https://fathom.video/share/abc123",
      created_at: "2024-06-15T09:00:00Z",
      scheduled_start_time: "2024-06-15T09:00:00Z",
      scheduled_end_time: "2024-06-15T09:30:00Z",
      recording_start_time: "2024-06-15T09:01:00Z",
      recording_end_time: "2024-06-15T09:28:00Z",
      calendar_invitees_domains_type: "only_internal",
      transcript_language: "en",
      calendar_invitees: [
        {
          name: "John Smith",
          email: "john@company.com",
          email_domain: "company.com",
          is_external: false,
          matched_speaker_display_name: "John S.",
        },
        {
          name: "Jane Doe",
          email: "jane@company.com",
          email_domain: "company.com",
          is_external: false,
          matched_speaker_display_name: "Jane D.",
        },
      ],
      recorded_by: {
        name: "John Smith",
        email: "john@company.com",
        email_domain: "company.com",
        team: "Engineering",
      },
      transcript: [
        {
          speaker: {
            display_name: "John S.",
            matched_calendar_invitee_email: "john@company.com",
          },
          text: "Good morning everyone, let's get started with the standup.",
          timestamp: "00:00:05",
        },
        {
          speaker: {
            display_name: "Jane D.",
            matched_calendar_invitee_email: "jane@company.com",
          },
          text: "Yesterday I finished the API integration.",
          timestamp: "00:00:15",
        },
      ],
      default_summary: {
        template_name: "Default",
        markdown_formatted:
          "## Meeting Summary\n\n- Team discussed sprint progress\n- API integration completed\n- Next steps: testing and deployment",
      },
      action_items: [
        {
          description: "Complete testing for API integration",
          user_generated: false,
          completed: false,
          recording_timestamp: "00:15:30",
          recording_playback_url:
            "https://fathom.video/recordings/12345678?t=930",
          assignee: {
            name: "Jane Doe",
            email: "jane@company.com",
            team: "Engineering",
          },
        },
      ],
      crm_matches: {
        contacts: [
          {
            name: "John Smith",
            email: "john@company.com",
            record_url: "https://crm.example.com/contacts/123",
          },
        ],
        companies: [
          {
            name: "Acme Corp",
            record_url: "https://crm.example.com/companies/456",
          },
        ],
        deals: [
          {
            name: "Enterprise Deal",
            amount: 50000,
            record_url: "https://crm.example.com/deals/789",
          },
        ],
        error: null,
      },
    },
  ],
};
