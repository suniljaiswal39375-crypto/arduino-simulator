export type BusKind="i2c"|"spi"|"uart"|"can"|"lora";
export interface CpuEndpoint { id:string; worker:Worker; frequencyHz:number; cycles:number; }
export interface ClockFrame { targetCycles:number; deltaUs:number }
/** Barrier-based deterministic coordinator: workers advance to the same virtual-time boundary. */
export class MultiMcuClockCoordinator {
 private nodes=new Map<string,CpuEndpoint>(); private timeUs=0; private running=false; private timer:number|undefined;
 add(id:string,worker:Worker,frequencyHz:number){if(this.nodes.has(id))throw new Error(`CPU ${id} already exists`);this.nodes.set(id,{id,worker,frequencyHz,cycles:0});}
 remove(id:string){this.nodes.get(id)?.worker.postMessage({type:"STOP"});this.nodes.delete(id);}
 async step(deltaUs=1000,timeoutMs=250){const replies=[...this.nodes.values()].map(node=>new Promise<void>((resolve,reject)=>{const target=node.cycles+Math.round(node.frequencyHz*deltaUs/1e6);const timeout=setTimeout(()=>{cleanup();reject(new Error(`CPU ${node.id} missed clock barrier`));},timeoutMs);const onMessage=(event:MessageEvent)=>{if(event.data?.type==="CLOCK_ACK"&&event.data?.targetCycles===target){node.cycles=target;cleanup();resolve();}};const cleanup=()=>{clearTimeout(timeout);node.worker.removeEventListener("message",onMessage)};node.worker.addEventListener("message",onMessage);node.worker.postMessage({type:"CLOCK_STEP",targetCycles:target,deltaUs} satisfies {type:string}&ClockFrame);}));await Promise.all(replies);this.timeUs+=deltaUs;return this.timeUs;}
 start(quantumUs=1000){this.running=true;const tick=async()=>{if(!this.running)return;try{await this.step(quantumUs);}finally{if(this.running)this.timer=window.setTimeout(tick,0);}};void tick();}
 stop(){this.running=false;if(this.timer)clearTimeout(this.timer);} get virtualTimeUs(){return this.timeUs;} get nodeIds(){return [...this.nodes.keys()];}
}
export interface BrokerMessage {topic:string;payload:string;retain:boolean;ts:number}
/** Browser-local MQTT semantic broker supporting wildcards, retained values and offline dashboards. */
export class LocalTopicBroker {
 private subscriptions=new Map<string,Set<(m:BrokerMessage)=>void>>(); readonly retained:Record<string,string>={}; active=true;
 publish(topic:string,payload:string,retain=false){if(!this.active)return;const m={topic,payload,retain,ts:Date.now()};if(retain)this.retained[topic]=payload;for(const [filter,handlers] of this.subscriptions)if(topicMatches(filter,topic))handlers.forEach(h=>h(m));}
 subscribe(filter:string,handler:(m:BrokerMessage)=>void){const set=this.subscriptions.get(filter)??new Set();set.add(handler);this.subscriptions.set(filter,set);for(const [topic,payload]of Object.entries(this.retained))if(topicMatches(filter,topic))handler({topic,payload,retain:true,ts:Date.now()});return()=>{set.delete(handler);};}
}
function topicMatches(filter:string,topic:string){const f=filter.split("/"),t=topic.split("/");for(let i=0;i<f.length;i++){if(f[i]==="#")return true;if(f[i]!=="+"&&f[i]!==t[i])return false;}return f.length===t.length;}
export const localBroker=new LocalTopicBroker();
