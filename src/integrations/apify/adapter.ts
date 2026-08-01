import type { ScraperAdapter, ScrapeJob } from "@/integrations/types";
export type YouTubeResearchInput={channels:string[];maxVideos:number};
export type ApifyDataset={datasetId:string;items:unknown[]};
export class ApifyAdapter implements ScraperAdapter<YouTubeResearchInput,ApifyDataset>{
  constructor(private readonly token=process.env.APIFY_API_TOKEN){}
  async start(input:YouTubeResearchInput):Promise<ScrapeJob<YouTubeResearchInput>>{ if(!this.token) throw new Error("APIFY_API_TOKEN is not configured"); throw new Error(`Apify actor selection pending for ${input.channels.length} channels`); }
  async result(jobId:string):Promise<ApifyDataset>{ if(!this.token) throw new Error("APIFY_API_TOKEN is not configured"); throw new Error(`Apify result retrieval pending for ${jobId}`); }
}
