declare module '@adsgram/ai' {
  export type AdsgramResult = {
    done?: boolean;
    skipped?: boolean;
    closed?: boolean;
    status?: string;
    error?: string;
    [key: string]: unknown;
  };

  export const AdController: {
    init: (config: { blockId: string }) => {
      show: () => Promise<AdsgramResult>;
    };
  };
}
