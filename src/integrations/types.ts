export interface ScrapeJob<TInput> { id: string; status: "queued"|"running"|"succeeded"|"failed"; input: TInput; }
export interface ScraperAdapter<TInput,TOutput> { start(input:TInput):Promise<ScrapeJob<TInput>>; result(jobId:string):Promise<TOutput>; }
