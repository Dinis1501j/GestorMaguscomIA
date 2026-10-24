import {analyzeGemini,AnalysisError,readLimited} from './gemini.js';

export function createAnalyzeHandler({createClient,env,fetcher=fetch}){
  return async req=>{
    const origin=req.headers.get('origin')||'';
    const allowed=(env('MAGUS_ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean);
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
    const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
    if(origin&&!allowed.includes(origin))return reply(403,{error:'Origem não autorizada.'});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return reply(405,{error:'Método não permitido.'});
    try{
      const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return reply(401,{error:'Inicia sessão para usar a IA.'});
      const client=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:auth}}});
      const user=await client.auth.getUser(auth.slice(7));if(user.error||!user.data.user)return reply(401,{error:'Sessão expirada. Volta a iniciar sessão.'});
      const admin=await client.rpc('magus_is_admin');if(admin.error||admin.data!==true)return reply(403,{error:'Acesso reservado a administradores.'});
      const key=env('GEMINI_API_KEY');if(!key)return reply(503,{error:'A IA online ainda não foi ativada. Falta configurar GEMINI_API_KEY no Supabase.'});
      if(!req.headers.get('content-type')?.startsWith('application/json'))return reply(415,{error:'Formato de pedido inválido.'});
      let body;try{body=JSON.parse(await readLimited(req));}catch(error){if(error instanceof AnalysisError)throw error;throw new AnalysisError('O pedido não contém JSON válido.');}
      if(typeof body.image!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.image))return reply(400,{error:'Formato de print inválido.'});
      const state=await client.from('magus_content').select('catalog').eq('id',1).single();
      const categories=state.data?.catalog?.categories;
      if(state.error||!Array.isArray(categories)||!categories.length)return reply(400,{error:'Cria primeiro uma categoria no gestor.'});
      const quota=await client.rpc('magus_ai_take_slot');if(quota.error)return reply(503,{error:'Falta configurar o limite de análises no Supabase.'});
      if(quota.data!==true)return reply(429,{error:'Limite de 20 análises por hora atingido. Tenta mais tarde.'});
      return reply(200,await analyzeGemini({image:body.image,categories,key},fetcher));
    }catch(error){return reply(error instanceof AnalysisError?error.status:500,{error:error instanceof AnalysisError?error.message:'Não foi possível concluir a análise. As alterações existentes não foram publicadas.'});}
  };
}
