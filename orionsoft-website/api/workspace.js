import { workspaceActor, workspaceData, workspaceMutation, projectContracts } from './_lib/workspace.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control','private, no-store');
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  try {
    const actor=await workspaceActor(req,res,req.method==='GET'?req.query?.scope:req.body?.scope);if(!actor)return;
    if(req.method==='GET')return res.json({...await workspaceData(actor),contracts:await projectContracts(actor)});
    return res.json(await workspaceMutation(actor,req.body || {}));
  } catch(error) {
    if(error.status)return res.status(error.status).json({error:error.message});
    console.error('[workspace]',error.name);
    return res.status(503).json({error:'Your workspace could not be loaded or saved. Please retry.'});
  }
}
