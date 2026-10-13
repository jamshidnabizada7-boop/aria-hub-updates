/** The installed MCP SDK predates top-level OpenAI securitySchemes.
 * Add them to discovery responses without relying on private SDK fields. */
export function withToolPolicies(body:Record<string,any>,scopes:{READ:string;WRITE:string}) {
  if(Array.isArray(body.result?.tools))body.result.tools=body.result.tools.map((tool:Record<string,any>)=>{
    const securitySchemes=[{type:'oauth2',scopes:[tool.name.endsWith('QueueStatus')?scopes.READ:scopes.WRITE]}];
    return {...tool,securitySchemes,_meta:{...(tool._meta||{}),securitySchemes}};
  });
  return body;
}
