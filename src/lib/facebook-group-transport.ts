/**
 * Replaceable Facebook Group transport boundary.
 *
 * Meta removed the public Facebook Groups publishing API. The production
 * transport therefore prepares a human-reviewed handoff instead of attempting
 * undocumented endpoints or browser automation. If Meta introduces an official
 * publishing surface later, implement it behind this interface.
 */
export interface FacebookGroupTransportInput {
  groupUrl: string;
  groupName: string;
  caption: string;
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

export interface FacebookGroupTransportResult {
  status: 'requires_review' | 'completed' | 'failed';
  automated: boolean;
  instructions: string;
  openUrl: string;
}

export interface FacebookGroupTransport {
  name: string;
  automated: boolean;
  prepare(input: FacebookGroupTransportInput): Promise<FacebookGroupTransportResult>;
}

export const manualAssistFacebookGroupTransport: FacebookGroupTransport = {
  name: 'manual_assist',
  automated: false,
  async prepare(input) {
    return {
      status: 'requires_review',
      automated: false,
      openUrl: input.groupUrl,
      instructions:
        `Open ${input.groupName}, review the prepared ARIA HUB caption/media, publish it manually, then mark the distribution job completed.`,
    };
  },
};
