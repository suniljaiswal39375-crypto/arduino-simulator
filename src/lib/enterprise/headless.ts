import type { Component, Wire } from "../types";
import type { TestAssertion } from "./diagnostics";
export interface HeadlessProject {schemaVersion:1;name:string;boardFqbn:string;components:Component[];wires:Wire[];sketch:string;tests:TestAssertion[];environment:{temperatureC:number;ambientLux:number;pressureHpa:number}}
export function exportHeadlessProject(input:Omit<HeadlessProject,"schemaVersion">){return JSON.stringify({schemaVersion:1,...input} satisfies HeadlessProject,null,2)}
export function githubActionsWorkflow(){return `name: Circuit tests\non: [push, pull_request]\njobs:\n  voltcraft:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npx voltcraft-cli test voltcraft.project.json\n`;}
export interface SourceQuote {supplier:"Mouser"|"DigiKey";manufacturerPartNumber:string;unitPrice:number;currency:string;stock:number;leadTimeDays:number;url:string}
/** Calls a same-origin server route so supplier credentials are never exposed to browser code. */
export async function fetchSourceQuotes(partNumbers:string[],signal?:AbortSignal):Promise<SourceQuote[]>{const response=await fetch("/api/sourcing",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({partNumbers}),signal});if(!response.ok)throw new Error(`Sourcing service returned ${response.status}`);return response.json();}
