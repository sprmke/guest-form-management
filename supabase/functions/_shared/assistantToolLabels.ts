/**
 * Host-facing labels for dashboard-assistant tool activity.
 * Mirror: ui/src/features/dashboard/ai-assistant/lib/assistantToolLabels.ts — keep in sync.
 */

export type AssistantToolLabelVariant = 'progress' | 'done' | 'failed';

const TOOL_LABELS: Record<string, { progress: string; done: string; failed: string }> = {
  search_knowledge_base: {
    progress: 'Searching help docs…',
    done: 'Searched help docs',
    failed: 'Help doc search failed',
  },
  explain_booking_status: {
    progress: 'Explaining booking status…',
    done: 'Explained booking status',
    failed: 'Could not explain status',
  },
  get_booking: {
    progress: 'Looking up booking…',
    done: 'Looked up booking',
    failed: 'Booking lookup failed',
  },
  get_booking_documents: {
    progress: 'Fetching booking files…',
    done: 'Fetched booking files',
    failed: 'Could not fetch files',
  },
  list_bookings: {
    progress: 'Searching bookings…',
    done: 'Searched bookings',
    failed: 'Booking search failed',
  },
  get_available_transitions: {
    progress: 'Checking available moves…',
    done: 'Checked available moves',
    failed: 'Could not check transitions',
  },
  plan_booking_journey: {
    progress: 'Mapping booking pipeline…',
    done: 'Mapped booking pipeline',
    failed: 'Could not map pipeline',
  },
  get_available_dates: {
    progress: 'Checking calendar availability…',
    done: 'Checked calendar availability',
    failed: 'Calendar check failed',
  },
  get_dashboard_stats: {
    progress: 'Loading dashboard stats…',
    done: 'Loaded dashboard stats',
    failed: 'Stats load failed',
  },
  get_finance_summary: {
    progress: 'Summarizing finance…',
    done: 'Summarized finance',
    failed: 'Finance summary failed',
  },
  list_finance_bookings: {
    progress: 'Listing finance bookings…',
    done: 'Listed finance bookings',
    failed: 'Finance list failed',
  },
  get_maintenance_summary: {
    progress: 'Summarizing maintenance…',
    done: 'Summarized maintenance',
    failed: 'Maintenance summary failed',
  },
  list_maintenance_items: {
    progress: 'Listing maintenance items…',
    done: 'Listed maintenance items',
    failed: 'Maintenance list failed',
  },
  run_receipt_validation: {
    progress: 'Validating receipts…',
    done: 'Validated receipts',
    failed: 'Receipt validation failed',
  },
  propose_transition_booking: {
    progress: 'Preparing status change…',
    done: 'Prepared status change',
    failed: 'Status change failed',
  },
  propose_cancel_booking: {
    progress: 'Preparing cancellation…',
    done: 'Prepared cancellation',
    failed: 'Cancellation prep failed',
  },
  propose_add_finance_line_item: {
    progress: 'Preparing finance entry…',
    done: 'Prepared finance entry',
    failed: 'Finance entry prep failed',
  },
  propose_create_maintenance_item: {
    progress: 'Preparing maintenance item…',
    done: 'Prepared maintenance item',
    failed: 'Maintenance prep failed',
  },
  get_org_profile: {
    progress: 'Loading org profile…',
    done: 'Loaded org profile',
    failed: 'Org profile load failed',
  },
  get_org_verification_status: {
    progress: 'Checking verification status…',
    done: 'Checked verification status',
    failed: 'Verification check failed',
  },
  list_team_members: {
    progress: 'Listing team members…',
    done: 'Listed team members',
    failed: 'Team list failed',
  },
  list_pending_invitations: {
    progress: 'Listing pending invites…',
    done: 'Listed pending invites',
    failed: 'Invite list failed',
  },
  propose_update_org_profile: {
    progress: 'Preparing org update…',
    done: 'Prepared org update',
    failed: 'Org update prep failed',
  },
  propose_invite_team_member: {
    progress: 'Preparing team invite…',
    done: 'Prepared team invite',
    failed: 'Team invite prep failed',
  },
  propose_update_team_member_role: {
    progress: 'Preparing role change…',
    done: 'Prepared role change',
    failed: 'Role change prep failed',
  },
  propose_revoke_invitation: {
    progress: 'Preparing invite revoke…',
    done: 'Prepared invite revoke',
    failed: 'Invite revoke prep failed',
  },
  propose_remove_team_member: {
    progress: 'Preparing member removal…',
    done: 'Prepared member removal',
    failed: 'Member removal prep failed',
  },
  get_property_profile: {
    progress: 'Loading property profile…',
    done: 'Loaded property profile',
    failed: 'Property profile load failed',
  },
  get_property_settings: {
    progress: 'Loading property settings…',
    done: 'Loaded property settings',
    failed: 'Property settings load failed',
  },
  list_property_team_members: {
    progress: 'Listing property team…',
    done: 'Listed property team',
    failed: 'Property team list failed',
  },
  list_property_pending_invitations: {
    progress: 'Listing property invites…',
    done: 'Listed property invites',
    failed: 'Property invite list failed',
  },
  propose_update_property_profile: {
    progress: 'Preparing property update…',
    done: 'Prepared property update',
    failed: 'Property update prep failed',
  },
  propose_update_property_settings: {
    progress: 'Preparing settings update…',
    done: 'Prepared settings update',
    failed: 'Settings update prep failed',
  },
  propose_invite_property_team_member: {
    progress: 'Preparing property invite…',
    done: 'Prepared property invite',
    failed: 'Property invite prep failed',
  },
  propose_update_property_team_member_role: {
    progress: 'Preparing property role change…',
    done: 'Prepared property role change',
    failed: 'Property role change failed',
  },
  propose_revoke_property_invitation: {
    progress: 'Preparing invite revoke…',
    done: 'Prepared invite revoke',
    failed: 'Invite revoke prep failed',
  },
  propose_remove_property_team_member: {
    progress: 'Preparing property member removal…',
    done: 'Prepared property member removal',
    failed: 'Member removal prep failed',
  },
  list_parkings: {
    progress: 'Listing parking slots…',
    done: 'Listed parking slots',
    failed: 'Parking list failed',
  },
  get_parking_booking: {
    progress: 'Looking up parking booking…',
    done: 'Looked up parking booking',
    failed: 'Parking booking lookup failed',
  },
  list_parking_bookings: {
    progress: 'Searching parking bookings…',
    done: 'Searched parking bookings',
    failed: 'Parking search failed',
  },
  get_parking_available_transitions: {
    progress: 'Checking parking moves…',
    done: 'Checked parking moves',
    failed: 'Parking transition check failed',
  },
  propose_claim_parking_booking: {
    progress: 'Preparing parking claim…',
    done: 'Prepared parking claim',
    failed: 'Parking claim prep failed',
  },
  propose_decline_parking_booking: {
    progress: 'Preparing parking decline…',
    done: 'Prepared parking decline',
    failed: 'Parking decline prep failed',
  },
  propose_transition_parking_booking: {
    progress: 'Preparing parking status change…',
    done: 'Prepared parking status change',
    failed: 'Parking status prep failed',
  },
  get_property_pricing: {
    progress: 'Loading property pricing…',
    done: 'Loaded property pricing',
    failed: 'Property pricing load failed',
  },
  get_parking_pricing: {
    progress: 'Loading parking pricing…',
    done: 'Loaded parking pricing',
    failed: 'Parking pricing load failed',
  },
  propose_update_property_base_rate: {
    progress: 'Preparing base rate update…',
    done: 'Prepared base rate update',
    failed: 'Base rate prep failed',
  },
  propose_set_property_date_rate_override: {
    progress: 'Preparing date rate override…',
    done: 'Prepared date rate override',
    failed: 'Date rate prep failed',
  },
  propose_add_property_holiday_rule: {
    progress: 'Preparing holiday rule…',
    done: 'Prepared holiday rule',
    failed: 'Holiday rule prep failed',
  },
  propose_block_property_dates: {
    progress: 'Preparing date block…',
    done: 'Prepared date block',
    failed: 'Date block prep failed',
  },
  propose_unblock_property_dates: {
    progress: 'Preparing date unblock…',
    done: 'Prepared date unblock',
    failed: 'Date unblock prep failed',
  },
  propose_update_parking_base_rate: {
    progress: 'Preparing parking rate update…',
    done: 'Prepared parking rate update',
    failed: 'Parking rate prep failed',
  },
  propose_set_parking_date_rate_override: {
    progress: 'Preparing parking date override…',
    done: 'Prepared parking date override',
    failed: 'Parking date override failed',
  },
  list_inbox_threads: {
    progress: 'Listing inbox threads…',
    done: 'Listed inbox threads',
    failed: 'Inbox list failed',
  },
  get_inbox_thread: {
    progress: 'Loading conversation…',
    done: 'Loaded conversation',
    failed: 'Conversation load failed',
  },
  get_inbox_settings: {
    progress: 'Loading inbox settings…',
    done: 'Loaded inbox settings',
    failed: 'Inbox settings load failed',
  },
  list_inbox_quick_reply_templates: {
    progress: 'Loading quick replies…',
    done: 'Loaded quick replies',
    failed: 'Quick reply load failed',
  },
  propose_mark_inbox_thread_read: {
    progress: 'Marking thread read…',
    done: 'Marked thread read',
    failed: 'Mark read failed',
  },
  draft_inbox_reply: {
    progress: 'Drafting inbox reply…',
    done: 'Drafted inbox reply',
    failed: 'Reply draft failed',
  },
  propose_send_inbox_reply: {
    progress: 'Preparing message send…',
    done: 'Prepared message send',
    failed: 'Message send prep failed',
  },
  list_marketing_templates: {
    progress: 'Listing marketing templates…',
    done: 'Listed marketing templates',
    failed: 'Template list failed',
  },
  get_marketing_publish_history: {
    progress: 'Loading publish history…',
    done: 'Loaded publish history',
    failed: 'Publish history failed',
  },
  search_marketing_music: {
    progress: 'Searching music…',
    done: 'Searched music',
    failed: 'Music search failed',
  },
  draft_marketing_caption: {
    progress: 'Drafting caption…',
    done: 'Drafted caption',
    failed: 'Caption draft failed',
  },
  draft_marketing_template: {
    progress: 'Drafting template…',
    done: 'Drafted template',
    failed: 'Template draft failed',
  },
  propose_publish_to_meta: {
    progress: 'Preparing Meta publish…',
    done: 'Prepared Meta publish',
    failed: 'Meta publish prep failed',
  },
};

/** Short audit-card label (past tense, no ellipsis). */
export function getAssistantToolAuditLabel(toolName: string): string {
  return TOOL_LABELS[toolName]?.done ?? toolName.replace(/_/g, ' ');
}

export function getAssistantToolActivityLabel(
  toolName: string,
  variant: AssistantToolLabelVariant
): string {
  const entry = TOOL_LABELS[toolName];
  if (entry) return entry[variant];
  const fallback = toolName.replace(/_/g, ' ');
  if (variant === 'progress') return `Running ${fallback}…`;
  if (variant === 'failed') return `${fallback} failed`;
  return fallback;
}
