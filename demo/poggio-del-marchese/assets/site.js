(() => {
  'use strict';
  if(location.protocol==='file:'&&!document.documentElement.hasAttribute('data-poggio-standalone'))return;
  const $=selector=>document.querySelector(selector),root=document.documentElement;
  const config=window.POGGIO_CONFIG||{},initialHash=location.hash;
  function codedError(cause,code){const error=new Error(cause?.message||String(cause));error.code=code;error.cause=cause;return error;}
  let controller=null,epoch=0,request=null,timer=null,busy=false;
  let navigated=false,restored=false;
  window.POGGIO_BOOTED=true;root.classList.add('js');
  const toggle=$('#scene-toggle');
  const noteIntent=()=>{navigated=true;};
  addEventListener('wheel',noteIntent,{passive:true,once:true});
  addEventListener('touchmove',noteIntent,{passive:true,once:true});
  addEventListener('hashchange',noteIntent);addEventListener('popstate',noteIntent);
  document.addEventListener('keydown',e=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key))noteIntent();});
  document.addEventListener('click',e=>{if(e.target.closest('a[href^="#"]'))noteIntent();});
  function fromHash(hash){try{return hash?document.getElementById(decodeURIComponent(hash.slice(1))):null;}catch(_){return null;}}
  async function finish(){
    const prepared=controller,ticket=epoch;
    await Promise.all([
      Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,1400))]),
      window.waitForPoggioIntro(),
      Promise.race([window.POGGIO_CACHE_READY||Promise.resolve(),new Promise(r=>setTimeout(r,5000))])
    ]);
    if(ticket!==epoch||prepared!==controller)return;
    if(!restored){
      const target=fromHash(initialHash);
      if(!navigated&&target&&location.hash===initialHash)target.scrollIntoView({behavior:'instant',block:'start'});
      else if(!initialHash&&!navigated)scrollTo({top:0,behavior:'instant'});
      restored=true;
    }
    if(controller)controller.refresh();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(ticket!==epoch||prepared!==controller)return;
    window.finishPoggioOpening();root.classList.remove('scene-planned');$('#site-content').setAttribute('aria-busy','false');
    root.dataset.opening=controller?'3d-ready':'static-choice';
  }
  function updateToggle(){
    toggle.hidden=$('#inizio').getBoundingClientRect().bottom<=80;toggle.disabled=busy;
    toggle.textContent=busy?'Preparazione…':controller?'Vista statica':'Avvia animazione';
    toggle.setAttribute('aria-label',controller?'Passa alla vista statica':'Avvia la sequenza della bottiglia con lo scorrimento');
  }
  function staticView(){
    const film=$('#inizio'),oldHeight=film.offsetHeight,oldY=scrollY,after=oldY>=film.offsetTop+oldHeight;
    ++epoch;clearTimeout(timer);if(request)request.abort();request=null;
    if(controller)controller.stop();controller=null;busy=false;
    root.classList.remove('has-scene','scene-planned');$('#stage').dataset.renderer='static';
    ['hero-copy','hero-side','scene-bottom'].forEach(id=>$('#'+id).style.cssText='');
    $('#scene-veil').style.opacity='0';$('#scene-background').style.opacity='1';$('#wine-canvas').style.opacity='1';
    $('#scene-wine-data').hidden=true;$('#scene-wine-data').setAttribute('aria-hidden','true');
    if(after)scrollTo({top:Math.max(0,oldY+film.offsetHeight-oldHeight),behavior:'instant'});
    updateToggle();finish();
  }
  const scripts=new Map();
  function loadingFailed(error){
    ++epoch;clearTimeout(timer);if(request)request.abort();request=null;busy=false;
    if(controller)controller.stop();controller=null;
    root.classList.remove('has-scene');$('#stage').dataset.renderer='unavailable';
    const code=error?.code||'LOAD_TIMEOUT';
    const messages={
      MODEL_FETCH:'Il browser non ha potuto leggere la bottiglia. Riprova il caricamento.',
      MODEL_PARSE:'Il modello della bottiglia non è stato letto correttamente. Riprova.',
      MODEL_DATA:'Il file HTML è incompleto o danneggiato. Scarica di nuovo la copia completa del sito.',
      SCRIPT_LOAD:'Una risorsa dell’animazione non è disponibile. Riprova il caricamento.',
      WEBGL_INIT:'Il browser non ha potuto avviare il 3D. Prova a riaprire il file in Edge o Chrome.',
      CONTEXT_LOST:'La visualizzazione 3D si è interrotta. Premi Riprova per ripristinarla.',
      RENDER_ERROR:'La visualizzazione 3D si è interrotta. Premi Riprova per ripristinarla.',
      LOAD_TIMEOUT:'Il caricamento sta impiegando troppo tempo. Riprova oppure entra senza animazione.'
    };
    $('#stage').dataset.error=code;
    window.POGGIO_DIAGNOSTICS={code,message:error?.message||'Timeout',time:new Date().toISOString()};
    if(error?.message)console.error('Poggio 3D:',code,error);
    window.showPoggioLoadingError(messages[code]||messages.RENDER_ERROR);updateToggle();
  }
  function loadScript(src){
    const path=src.split('?')[0];
    if(path.endsWith('/three.min.js')&&window.THREE)return Promise.resolve();
    if(path.endsWith('/GLTFLoader.js')&&window.THREE&&window.THREE.GLTFLoader)return Promise.resolve();
    if(path.endsWith('/scene.js')&&window.createPoggioScene)return Promise.resolve();
    if(!scripts.has(src))scripts.set(src,new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=src;script.onload=resolve;
      script.onerror=()=>{scripts.delete(src);script.remove();reject(Object.assign(new Error('Risorsa non disponibile'),{code:'SCRIPT_LOAD'}));};
      document.head.append(script);
    }));
    return scripts.get(src);
  }
  function disposeModel(model){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    model.traverse(obj=>{if(obj.isMesh){geometries.add(obj.geometry);(Array.isArray(obj.material)?obj.material:[obj.material]).filter(Boolean).forEach(mat=>{materials.add(mat);Object.values(mat).forEach(v=>{if(v&&v.isTexture)textures.add(v);});});}});
    textures.forEach(v=>v.dispose());materials.forEach(v=>v.dispose());geometries.forEach(v=>v.dispose());
  }
  function embeddedBuffer(){
    const element=document.getElementById('poggio-model-data');
    if(!element)return null;
    if(!window.POGGIO_MODEL_BUFFER){
      try{
        const binary=atob(element.textContent.trim()),bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
        const view=new DataView(bytes.buffer);
        if(bytes.length<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(8,true)!==bytes.length)throw new Error('GLB incorporato incompleto');
        window.POGGIO_MODEL_BUFFER=bytes.buffer;
      }catch(error){throw Object.assign(new Error(error.message||'GLB incorporato non leggibile'),{code:'MODEL_DATA'});}
    }
    return window.POGGIO_MODEL_BUFFER;
  }
  function beginExperience(){
    window.beginPoggioOpening();root.classList.add('scene-planned');root.dataset.opening='preparing';
    $('#site-loader').inert=false;$('#site-loader').setAttribute('aria-hidden','false');
    $('#site-content').setAttribute('aria-busy','true');$('#retry-loading').hidden=true;
    $('#loader-caption').textContent='Ogni grande storia merita un’attesa.';
    $('#loader-note').textContent='Preparazione della tua esperienza!';
  }
  async function startScene(){
    if(busy||controller)return;
    const ticket=++epoch,abort=new AbortController();request=abort;busy=true;updateToggle();
    window.POGGIO_OPENING.expired=false;
    clearTimeout(window.poggioDeadline);
    beginExperience();
    timer=setTimeout(loadingFailed,30000);
    let model=null;
    try{
      const dependencies=loadScript('./assets/vendor/three.min.js?v=08d7e5e42a802a4a').then(()=>loadScript('./assets/vendor/GLTFLoader.js?v=08d7e5e42a802a4a')).then(()=>loadScript('./assets/scene.js?v=08d7e5e42a802a4a'));
      const inline=embeddedBuffer();
      const modelData=inline?Promise.resolve(inline):fetch('./assets/poggio-del-marchese.glb?v=08d7e5e42a802a4a',{signal:abort.signal})
        .then(response=>{if(!response.ok)throw new Error('Modello non disponibile: HTTP '+response.status);return response.arrayBuffer();})
        .catch(error=>{throw codedError(error,'MODEL_FETCH');});
      const [,data]=await Promise.all([dependencies,modelData]);
      if(ticket!==epoch)return;
      const gltf=await new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(data,'./assets/',resolve,error=>reject(codedError(error,'MODEL_PARSE'))));
      model=gltf.scene;if(ticket!==epoch){disposeModel(model);return;}
      const previousCanvas=$('#wine-canvas');previousCanvas.replaceWith(previousCanvas.cloneNode(false));
      try{controller=window.createPoggioScene(model,loadingFailed);}
      catch(error){throw codedError(error,typeof error.code==='string'?error.code:'WEBGL_INIT');}
      model=null;delete $('#stage').dataset.error;window.POGGIO_DIAGNOSTICS=null;
      clearTimeout(timer);busy=false;request=null;
      updateToggle();requestAnimationFrame(()=>requestAnimationFrame(finish));
    }catch(error){if(model)disposeModel(model);if(ticket===epoch)loadingFailed(error);}
  }
  const header=$('#site-header'),menu=$('#menu-button');
  function closeMenu(focus=false){header.classList.remove('menu-open');menu.setAttribute('aria-expanded','false');if(focus)menu.focus();}
  menu.addEventListener('click',()=>menu.setAttribute('aria-expanded',String(header.classList.toggle('menu-open'))));
  $('#navigation').addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('click',e=>{if(!header.contains(e.target))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&header.classList.contains('menu-open'))closeMenu(true);});
  addEventListener('resize',()=>closeMenu(),{passive:true});
  const setHeader=()=>{header.classList.toggle('solid',scrollY>24);updateToggle();};addEventListener('scroll',setHeader,{passive:true});setHeader();
  $('#year').textContent=String(new Date().getFullYear());
  const preview=$('#label-preview'),fallback=$('#label-preview-fallback');
  const failed=()=>{preview.hidden=true;fallback.hidden=false;};preview.addEventListener('error',failed);if(preview.complete&&!preview.naturalWidth)failed();
  $('#bottle-fallback').addEventListener('error',()=>{$('#bottle-fallback').src=fallback.src;},{once:true});
  if(window.setupPoggioNewsletter)window.setupPoggioNewsletter(config);
  $('#skip-loading').addEventListener('click',()=>{staticView();$('.skip-link').focus({preventScroll:true});});
  $('#retry-loading').addEventListener('click',startScene);
  toggle.addEventListener('click',()=>{
    closeMenu();
    if(controller){staticView();scrollTo({top:0,behavior:'instant'});}
    else startScene();
  });
  addEventListener('poggio-timeout',loadingFailed);
  addEventListener('pageshow',event=>{
    if(!event.persisted||root.dataset.opening==='loading-error')return;
    // The browser's Back button can restore the existing scene without running scripts again.
    if(!busy)++epoch;
    beginExperience();if(!busy)finish();
  });
  updateToggle();if(root.classList.contains('is-loading'))$('#site-content').setAttribute('aria-busy','true');
  startScene();
})();
