export type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: any;
};

export type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
};
