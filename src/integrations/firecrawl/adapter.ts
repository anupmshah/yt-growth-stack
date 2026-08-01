import type { ScraperAdapter, ScrapeJob } from "@/integrations/types";
export type WebResearchInput={urls:string[]}; export type FirecrawlResult={documents:unknown[]};
export class FirecrawlAdapter implements ScraperAdapter<WebResearchInput,FirecrawlResult>{
  constructor(private readonly apiKey=process.env.FIRECRAWL_API_KEY){}
  async start(input:WebResearchInput):Promise<ScrapeJob<WebResearchInput>>{ if(!this.apiKey) throw new Error("FIRECRAWL_API_KEY is not configured"); throw new Error(`Firecrawl operation selection pending for ${input.urls.length} URLs`); }
  async result(jobId:string):Promise<FirecrawlResult>{ if(!this.apiKey) throw new Error("FIRECRAWL_API_KEY is not configured"); throw new Error(`Firecrawl result retrieval pending for ${jobId}`); }
}
